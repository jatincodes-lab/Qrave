using Npgsql;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Reports;

namespace QRApp.Api.Endpoints;

public static class AdminReportEndpoints
{
    public static IEndpointRouteBuilder MapAdminReportEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/reports").RequireAuthorization();

        group.MapGet("/orders/summary", GetOrderSummaryAsync);
        group.MapGet("/orders", GetOrdersAsync);
        group.MapGet("/orders/{orderId:guid}", GetOrderDetailAsync);
        group.MapGet("/items", GetItemsAsync);
        group.MapGet("/customers", GetCustomersAsync);

        return app;
    }

    private static async Task<IResult> GetOrderSummaryAsync(
        Guid? branchId,
        DateTime? dateFrom,
        DateTime? dateTo,
        string? status,
        string? search,
        ITenantContext tenantContext,
        IReportService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (AdminBranchAccess.ValidateRequestedBranch(branchId, tenantContext) is { } forbidden)
        {
            return forbidden;
        }

        try
        {
            return Results.Ok(await service.GetOrderSummaryAsync(tenantContext.TenantId, ToFilter(AdminBranchAccess.ScopeBranchFilter(branchId, tenantContext), dateFrom, dateTo, status, search), cancellationToken));
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminReportEndpoints)).LogWarning(postgresException, "Database failed while reading report summary.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> GetOrdersAsync(
        Guid? branchId,
        DateTime? dateFrom,
        DateTime? dateTo,
        string? status,
        string? search,
        ITenantContext tenantContext,
        IReportService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (AdminBranchAccess.ValidateRequestedBranch(branchId, tenantContext) is { } forbidden)
        {
            return forbidden;
        }

        try
        {
            return Results.Ok(await service.GetOrdersAsync(tenantContext.TenantId, ToFilter(AdminBranchAccess.ScopeBranchFilter(branchId, tenantContext), dateFrom, dateTo, status, search), cancellationToken));
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminReportEndpoints)).LogWarning(postgresException, "Database failed while reading report orders.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> GetOrderDetailAsync(
        Guid orderId,
        ITenantContext tenantContext,
        IReportService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await service.GetOrderDetailAsync(tenantContext.TenantId, orderId, cancellationToken);
            if (AdminBranchAccess.ValidateRequestedBranch(order.Order.BranchId, tenantContext) is { } forbidden)
            {
                return forbidden;
            }

            return Results.Ok(order);
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminReportEndpoints)).LogWarning(postgresException, "Database failed while reading report order {OrderId}.", orderId);
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> GetItemsAsync(
        Guid? branchId,
        DateTime? dateFrom,
        DateTime? dateTo,
        string? status,
        string? search,
        ITenantContext tenantContext,
        IReportService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (AdminBranchAccess.ValidateRequestedBranch(branchId, tenantContext) is { } forbidden)
        {
            return forbidden;
        }

        try
        {
            return Results.Ok(await service.GetItemsAsync(tenantContext.TenantId, ToFilter(AdminBranchAccess.ScopeBranchFilter(branchId, tenantContext), dateFrom, dateTo, status, search), cancellationToken));
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminReportEndpoints)).LogWarning(postgresException, "Database failed while reading report items.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> GetCustomersAsync(
        Guid? branchId,
        DateTime? dateFrom,
        DateTime? dateTo,
        string? status,
        string? search,
        ITenantContext tenantContext,
        IReportService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (AdminBranchAccess.ValidateRequestedBranch(branchId, tenantContext) is { } forbidden)
        {
            return forbidden;
        }

        try
        {
            return Results.Ok(await service.GetCustomersAsync(tenantContext.TenantId, ToFilter(AdminBranchAccess.ScopeBranchFilter(branchId, tenantContext), dateFrom, dateTo, status, search), cancellationToken));
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminReportEndpoints)).LogWarning(postgresException, "Database failed while reading report customers.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static OrderReportFilter ToFilter(Guid? branchId, DateTime? dateFrom, DateTime? dateTo, string? status, string? search)
    {
        return new OrderReportFilter(branchId, dateFrom, dateTo, status, search);
    }
}
