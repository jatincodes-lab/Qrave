using Npgsql;
using QRApp.Api.Errors;
using QRApp.Api.Hubs;
using QRApp.Application.Auth;
using QRApp.Application.Billing;
using QRApp.Application.Notifications;
using QRApp.Application.Orders;

namespace QRApp.Api.Endpoints;

public static class AdminOrderEndpoints
{
    public static IEndpointRouteBuilder MapAdminOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin").RequireAuthorization();

        group.MapGet("/branches/{branchId:guid}/orders", GetOrdersAsync);
        group.MapPut("/branches/{branchId:guid}/orders/{orderId:guid}/status", UpdateStatusAsync);
        group.MapPost("/branches/{branchId:guid}/orders/{orderId:guid}/items/{orderItemId:guid}/cancel", CancelItemAsync);
        group.MapGet("/branches/{branchId:guid}/orders/{orderId:guid}/bill", GetBillAsync);
        group.MapPost("/branches/{branchId:guid}/orders/{orderId:guid}/bill", GenerateBillAsync);
        group.MapPut("/branches/{branchId:guid}/orders/{orderId:guid}/bill/payment-status", UpdateBillPaymentStatusAsync);
        group.MapPut("/branches/{branchId:guid}/orders/{orderId:guid}/bill/refund-status", UpdateBillRefundStatusAsync);

        return app;
    }

    private static async Task<IResult> GetOrdersAsync(
        Guid branchId,
        bool? includeCompleted,
        ITenantContext tenantContext,
        IAdminOrderService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var orders = await service.GetListByBranchAsync(
                tenantContext.TenantId,
                branchId,
                includeCompleted.GetValueOrDefault(),
                cancellationToken);

            return Results.Ok(orders);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(postgresException, "Database failed while listing orders for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> UpdateStatusAsync(
        Guid branchId,
        Guid orderId,
        UpdateAdminOrderStatusRequest request,
        ITenantContext tenantContext,
        IAdminOrderService service,
        IAdminNotificationService notificationService,
        IAdminOrderRealtimeNotifier realtimeNotifier,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.UpdateStatusAsync(tenantContext.TenantId, branchId, orderId, request, tenantContext.UserId, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            try
            {
                await notificationService.CreateAsync(
                    tenantContext.TenantId,
                    new CreateAdminNotificationRequest(
                        branchId,
                        "order-status-updated",
                        "Order status updated",
                        $"Order {ShortId(orderId)} is now {result.Value!.OrderStatusCode}.",
                        "/admin/orders"),
                    cancellationToken);
            }
            catch (Exception notificationException)
            {
                loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(notificationException, "Order {OrderId} status was updated, but its admin notification could not be stored.", orderId);
            }

            await realtimeNotifier.OrderStatusUpdatedAsync(result.Value!, cancellationToken);
            return Results.Ok(result.Value);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(postgresException, "Database rejected order status update for order {OrderId}.", orderId);
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogError(ex, "Failed to update order {OrderId}.", orderId);
            return ApiProblemResponses.ServerError("Order status could not be updated.");
        }
    }

    private static string ShortId(Guid id)
    {
        return id.ToString("N")[^6..].ToUpperInvariant();
    }

    private static async Task<IResult> CancelItemAsync(
        Guid branchId,
        Guid orderId,
        Guid orderItemId,
        CancelAdminOrderItemRequest request,
        ITenantContext tenantContext,
        IAdminOrderService service,
        IAdminNotificationService notificationService,
        IAdminOrderRealtimeNotifier realtimeNotifier,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.CancelItemAsync(tenantContext.TenantId, branchId, orderId, orderItemId, request, tenantContext.UserId, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            try
            {
                await notificationService.CreateAsync(
                    tenantContext.TenantId,
                    new CreateAdminNotificationRequest(
                        branchId,
                        "order-item-cancelled",
                        "Order item cancelled",
                        $"Order {ShortId(orderId)} had {request.Quantity} item(s) cancelled.",
                        "/admin/orders"),
                    cancellationToken);
            }
            catch (Exception notificationException)
            {
                loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(notificationException, "Order {OrderId} item cancellation was saved, but its admin notification could not be stored.", orderId);
            }

            await realtimeNotifier.OrderStatusUpdatedAsync(result.Value!, cancellationToken);
            return Results.Ok(result.Value);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(postgresException, "Database rejected item cancellation for order {OrderId}, item {OrderItemId}.", orderId, orderItemId);
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogError(ex, "Failed to cancel item {OrderItemId} for order {OrderId}.", orderItemId, orderId);
            return ApiProblemResponses.ServerError("Order item could not be cancelled.");
        }
    }

    private static async Task<IResult> GetBillAsync(
        Guid branchId,
        Guid orderId,
        ITenantContext tenantContext,
        IBillingService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var bill = await service.GetOrderBillAsync(tenantContext.TenantId, branchId, orderId, cancellationToken);
            return bill is null ? ApiProblemResponses.NotFound("Bill was not found for this order.") : Results.Ok(bill);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(postgresException, "Database failed while reading bill for order {OrderId}.", orderId);
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> GenerateBillAsync(
        Guid branchId,
        Guid orderId,
        GenerateOrderBillRequest request,
        ITenantContext tenantContext,
        IBillingService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            if (request.DiscountAmount > 0 && !CanRoleApplyDiscount(tenantContext.RoleCode))
            {
                var settings = await service.GetSettingsAsync(tenantContext.TenantId, branchId, cancellationToken);
                if (settings?.StaffCanApplyDiscount != true)
                {
                    return ApiProblemResponses.Forbidden("Your staff role cannot apply bill discounts for this branch.");
                }
            }

            var result = await service.GenerateOrderBillAsync(tenantContext.TenantId, branchId, orderId, request, tenantContext.UserId, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(postgresException, "Database rejected bill generation for order {OrderId}.", orderId);
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogError(ex, "Failed to generate bill for order {OrderId}.", orderId);
            return ApiProblemResponses.ServerError("Bill could not be generated.");
        }
    }

    private static async Task<IResult> UpdateBillPaymentStatusAsync(
        Guid branchId,
        Guid orderId,
        UpdateOrderBillPaymentStatusRequest request,
        ITenantContext tenantContext,
        IBillingService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.UpdatePaymentStatusAsync(tenantContext.TenantId, branchId, orderId, request, tenantContext.UserId, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(postgresException, "Database rejected bill payment status update for order {OrderId}.", orderId);
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogError(ex, "Failed to update bill payment status for order {OrderId}.", orderId);
            return ApiProblemResponses.ServerError("Bill payment status could not be updated.");
        }
    }

    private static async Task<IResult> UpdateBillRefundStatusAsync(
        Guid branchId,
        Guid orderId,
        UpdateOrderBillRefundStatusRequest request,
        ITenantContext tenantContext,
        IBillingService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.UpdateRefundStatusAsync(tenantContext.TenantId, branchId, orderId, request, tenantContext.UserId, cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogWarning(postgresException, "Database rejected bill refund status update for order {OrderId}.", orderId);
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminOrderEndpoints)).LogError(ex, "Failed to update bill refund status for order {OrderId}.", orderId);
            return ApiProblemResponses.ServerError("Bill refund status could not be updated.");
        }
    }

    private static bool CanRoleApplyDiscount(string roleCode)
    {
        return string.Equals(roleCode, "owner", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(roleCode, "admin", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(roleCode, "manager", StringComparison.OrdinalIgnoreCase);
    }
}
