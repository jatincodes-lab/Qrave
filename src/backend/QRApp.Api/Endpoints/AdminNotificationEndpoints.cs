using Npgsql;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Notifications;

namespace QRApp.Api.Endpoints;

public static class AdminNotificationEndpoints
{
    public static IEndpointRouteBuilder MapAdminNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin").RequireAuthorization();

        group.MapGet("/notifications", GetNotificationsAsync);
        group.MapPost("/notifications/{notificationId:guid}/read", MarkReadAsync);
        group.MapPost("/notifications/read-all", MarkAllReadAsync);
        group.MapGet("/search", SearchAsync);

        return app;
    }

    private static async Task<IResult> GetNotificationsAsync(
        Guid? branchId,
        ITenantContext tenantContext,
        IAdminNotificationService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (AdminBranchAccess.ValidateRequestedBranch(branchId, tenantContext) is { } forbidden)
        {
            return forbidden;
        }

        try
        {
            var notifications = await service.GetListAsync(tenantContext.TenantId, AdminBranchAccess.ScopeBranchFilter(branchId, tenantContext), cancellationToken);
            return Results.Ok(notifications);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminNotificationEndpoints)).LogWarning(postgresException, "Database failed while listing admin notifications.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> MarkReadAsync(
        Guid notificationId,
        ITenantContext tenantContext,
        IAdminNotificationService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            if (tenantContext.BranchId.HasValue)
            {
                var visibleNotifications = await service.GetListAsync(tenantContext.TenantId, tenantContext.BranchId.Value, cancellationToken);
                if (!visibleNotifications.Any(notification => notification.AdminNotificationId == notificationId))
                {
                    return ApiProblemResponses.Forbidden("Your account is assigned to a different branch.");
                }
            }

            await service.MarkReadAsync(tenantContext.TenantId, notificationId, cancellationToken);
            return Results.NoContent();
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminNotificationEndpoints)).LogWarning(postgresException, "Database failed while marking notification {NotificationId} read.", notificationId);
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> MarkAllReadAsync(
        Guid? branchId,
        ITenantContext tenantContext,
        IAdminNotificationService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (AdminBranchAccess.ValidateRequestedBranch(branchId, tenantContext) is { } forbidden)
        {
            return forbidden;
        }

        try
        {
            await service.MarkAllReadAsync(tenantContext.TenantId, AdminBranchAccess.ScopeBranchFilter(branchId, tenantContext), cancellationToken);
            return Results.NoContent();
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminNotificationEndpoints)).LogWarning(postgresException, "Database failed while marking notifications read.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> SearchAsync(
        string q,
        Guid? branchId,
        ITenantContext tenantContext,
        IAdminNotificationService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (AdminBranchAccess.ValidateRequestedBranch(branchId, tenantContext) is { } forbidden)
        {
            return forbidden;
        }

        try
        {
            var results = await service.SearchAsync(tenantContext.TenantId, AdminBranchAccess.ScopeBranchFilter(branchId, tenantContext), q, cancellationToken);
            return Results.Ok(results);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminNotificationEndpoints)).LogWarning(postgresException, "Database failed while running admin search.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }
}
