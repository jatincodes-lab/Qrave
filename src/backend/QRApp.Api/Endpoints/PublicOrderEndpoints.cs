using Npgsql;
using QRApp.Api.Errors;
using QRApp.Api.Hubs;
using QRApp.Application.Customers;
using QRApp.Application.Notifications;
using QRApp.Application.Orders;

namespace QRApp.Api.Endpoints;

public static class PublicOrderEndpoints
{
    public static IEndpointRouteBuilder MapPublicOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/public");

        group.MapPost("/qr/{qrToken}/orders", CreateOrderAsync).AllowAnonymous();
        group.MapGet("/qr/{qrToken}/orders/{orderId:guid}", GetOrderAsync).AllowAnonymous();
        group.MapPost("/qr/{qrToken}/orders/{orderId:guid}/cancel", CancelOrderAsync).AllowAnonymous();
        group.MapPost("/qr/{qrToken}/orders/{orderId:guid}/items/{orderItemId:guid}/cancel-request", RequestItemCancellationAsync).AllowAnonymous();
        group.MapPost("/qr/{qrToken}/promo-code/validate", ValidatePromoCodeAsync).AllowAnonymous();

        return app;
    }

    private static async Task<IResult> CreateOrderAsync(
        string qrToken,
        CreatePublicQrOrderRequest request,
        HttpContext httpContext,
        IOrderService orderService,
        ICustomerService customerService,
        IAdminNotificationService notificationService,
        IAdminOrderRealtimeNotifier realtimeNotifier,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await orderService.CreateFromQrTokenAsync(qrToken, ReadQrSessionId(httpContext), request, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            var created = result.Value!;
            var order = created.Order;
            try
            {
                await notificationService.CreateAsync(
                    order.TenantId,
                    new CreateAdminNotificationRequest(
                        order.BranchId,
                        "order-created",
                        "New order received",
                        $"Order {ShortId(order.OrderId)} placed with {order.Items.Count} item{(order.Items.Count == 1 ? "" : "s")}.",
                        "/admin/orders"),
                    cancellationToken);
            }
            catch (Exception notificationException)
            {
                loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(notificationException, "Order {OrderId} was created, but its admin notification could not be stored.", order.OrderId);
            }

            await realtimeNotifier.OrderCreatedAsync(order, cancellationToken);

            CustomerDeviceAccessResponse? customerAccess = null;
            if (!string.IsNullOrWhiteSpace(order.CustomerWhatsApp))
            {
                try
                {
                    var accessResult = await customerService.CreateDeviceAccessAsync(qrToken, order.OrderId, cancellationToken);
                    if (accessResult.IsSuccess)
                    {
                        customerAccess = accessResult.Value;
                    }
                }
                catch (Exception accessException)
                {
                    loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(
                        accessException,
                        "Order {OrderId} was created, but returning-customer access could not be issued.",
                        order.OrderId);
                }
            }

            return Results.Created(
                $"/api/v1/public/orders/{order.OrderId}",
                new PublicOrderCreatedResponse(order, created.OrderTrackingAccess, customerAccess));
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(postgresException, "Database rejected public QR order creation.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogError(ex, "Failed to create public QR order.");
            return ApiProblemResponses.ServerError("Order could not be created.");
        }
    }

    private static async Task<IResult> CancelOrderAsync(
        string qrToken,
        Guid orderId,
        CancelPublicQrOrderRequest request,
        HttpContext httpContext,
        IOrderService orderService,
        IAdminNotificationService notificationService,
        IAdminOrderRealtimeNotifier realtimeNotifier,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await orderService.CancelFromQrTokenAsync(qrToken, orderId, ReadCustomerDeviceToken(httpContext), request, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            var cancellation = result.Value!;
            return cancellation.Code switch
            {
                PublicOrderCancelResultCode.Cancelled => await CompleteCancellationAsync(
                    cancellation.Order!,
                    notificationService,
                    realtimeNotifier,
                    loggerFactory,
                    cancellationToken),
                PublicOrderCancelResultCode.AlreadyCancelled => Results.Ok(cancellation.Order),
                PublicOrderCancelResultCode.NotFound => ApiProblemResponses.NotFound("Order was not found for this QR menu."),
                PublicOrderCancelResultCode.Forbidden => ApiProblemResponses.Forbidden("This order can only be cancelled from the device used to place it."),
                PublicOrderCancelResultCode.NotCancellable => ApiProblemResponses.Conflict(
                    cancellation.CurrentStatusCode is null
                        ? "This order can no longer be cancelled. Please contact staff."
                        : $"This order is already {cancellation.CurrentStatusCode}. Please contact staff."),
                _ => ApiProblemResponses.ServerError("Order could not be cancelled.")
            };
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(postgresException, "Database rejected public QR order cancellation.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogError(ex, "Failed to cancel public QR order.");
            return ApiProblemResponses.ServerError("Order could not be cancelled.");
        }
    }

    private static async Task<IResult> ValidatePromoCodeAsync(
        string qrToken,
        ValidatePublicQrPromoCodeRequest request,
        HttpContext httpContext,
        IOrderService orderService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await orderService.ValidatePromoCodeAsync(qrToken, ReadQrSessionId(httpContext), request, cancellationToken);
            return result.IsSuccess
                ? Results.Ok(result.Value)
                : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(postgresException, "Database rejected public QR promo code validation.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogError(ex, "Failed to validate public QR promo code.");
            return ApiProblemResponses.ServerError("Promo code could not be validated.");
        }
    }

    private static async Task<IResult> RequestItemCancellationAsync(
        string qrToken,
        Guid orderId,
        Guid orderItemId,
        RequestPublicOrderItemCancellationRequest request,
        HttpContext httpContext,
        IOrderService orderService,
        IAdminNotificationService notificationService,
        IAdminOrderRealtimeNotifier realtimeNotifier,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await orderService.RequestItemCancellationAsync(qrToken, orderId, orderItemId, ReadCustomerDeviceToken(httpContext), request, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            var order = result.Value!;
            try
            {
                await notificationService.CreateAsync(
                    order.TenantId,
                    new CreateAdminNotificationRequest(
                        order.BranchId,
                        "order-item-cancel-requested",
                        "Item cancellation requested",
                        $"Order {ShortId(order.OrderId)} has an item cancellation request.",
                        "/admin/orders"),
                    cancellationToken);
            }
            catch (Exception notificationException)
            {
                loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(notificationException, "Order {OrderId} item cancellation request was created, but its admin notification could not be stored.", orderId);
            }

            await realtimeNotifier.OrderStatusUpdatedAsync(order, cancellationToken);
            return Results.Ok(order);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(postgresException, "Database rejected public QR item cancellation request.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogError(ex, "Failed to request public QR item cancellation.");
            return ApiProblemResponses.ServerError("Item cancellation could not be requested.");
        }
    }

    private static async Task<IResult> GetOrderAsync(
        string qrToken,
        Guid orderId,
        HttpContext httpContext,
        IOrderService orderService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await orderService.GetByQrTokenAsync(
                qrToken,
                orderId,
                ReadOrderTrackingToken(httpContext),
                ReadCustomerDeviceToken(httpContext),
                cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            var lookup = result.Value!;
            return lookup.Code switch
            {
                PublicOrderLookupResultCode.Found => Results.Ok(lookup.Order),
                PublicOrderLookupResultCode.NotFound => ApiProblemResponses.NotFound("Order was not found for this QR menu."),
                PublicOrderLookupResultCode.Forbidden => ApiProblemResponses.Forbidden("This order can only be viewed from the device used to place it."),
                _ => ApiProblemResponses.ServerError("Order could not be read.")
            };
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(postgresException, "Database rejected public QR order lookup.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogError(ex, "Failed to read public QR order.");
            return ApiProblemResponses.ServerError("Order could not be read.");
        }
    }

    private static string ShortId(Guid id)
    {
        return id.ToString("N")[^6..].ToUpperInvariant();
    }

    private static async Task<IResult> CompleteCancellationAsync(
        PublicOrderResponse order,
        IAdminNotificationService notificationService,
        IAdminOrderRealtimeNotifier realtimeNotifier,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            await notificationService.CreateAsync(
                order.TenantId,
                new CreateAdminNotificationRequest(
                    order.BranchId,
                    "order-cancelled",
                    "Order cancelled by customer",
                    $"Order {ShortId(order.OrderId)} was cancelled by customer.",
                    "/admin/orders"),
                cancellationToken);
        }
        catch (Exception notificationException)
        {
            loggerFactory.CreateLogger(nameof(PublicOrderEndpoints)).LogWarning(notificationException, "Order {OrderId} was cancelled, but its admin notification could not be stored.", order.OrderId);
        }

        await realtimeNotifier.OrderStatusUpdatedAsync(order, cancellationToken);
        return Results.Ok(order);
    }

    private static Guid ReadQrSessionId(HttpContext httpContext)
    {
        return Guid.TryParse(httpContext.Request.Headers["X-QR-Session-Id"].FirstOrDefault(), out var qrSessionId)
            ? qrSessionId
            : Guid.Empty;
    }

    private static string ReadCustomerDeviceToken(HttpContext httpContext)
    {
        return httpContext.Request.Headers["X-Customer-Device-Token"].FirstOrDefault() ?? string.Empty;
    }

    private static string ReadOrderTrackingToken(HttpContext httpContext)
    {
        return httpContext.Request.Headers["X-Order-Tracking-Token"].FirstOrDefault() ?? string.Empty;
    }
}
