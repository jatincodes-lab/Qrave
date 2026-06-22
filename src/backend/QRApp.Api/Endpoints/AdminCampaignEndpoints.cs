using Npgsql;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.Campaigns;

namespace QRApp.Api.Endpoints;

public static class AdminCampaignEndpoints
{
    public static IEndpointRouteBuilder MapAdminCampaignEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/campaigns").RequireAuthorization();

        group.MapGet("", GetListAsync);
        group.MapGet("/preview", PreviewAsync);
        group.MapPost("", CreateAsync);

        return app;
    }

    private static async Task<IResult> GetListAsync(
        Guid? branchId,
        ITenantContext tenantContext,
        ICampaignService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (AdminBranchAccess.ValidateRequestedBranch(branchId, tenantContext) is { } forbidden)
        {
            return forbidden;
        }

        try
        {
            return Results.Ok(await service.GetListAsync(tenantContext.TenantId, AdminBranchAccess.ScopeBranchFilter(branchId, tenantContext), cancellationToken));
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminCampaignEndpoints)).LogWarning(postgresException, "Database failed while listing campaigns.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> PreviewAsync(
        Guid? branchId,
        string targetSegment,
        ITenantContext tenantContext,
        ICampaignService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (AdminBranchAccess.ValidateRequestedBranch(branchId, tenantContext) is { } forbidden)
        {
            return forbidden;
        }

        try
        {
            var result = await service.PreviewRecipientsAsync(tenantContext.TenantId, AdminBranchAccess.ScopeBranchFilter(branchId, tenantContext), targetSegment, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            return Results.Ok(result.Value);
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminCampaignEndpoints)).LogWarning(postgresException, "Database failed while previewing campaign recipients.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> CreateAsync(
        CreateCampaignRequest request,
        ITenantContext tenantContext,
        ICampaignService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (AdminBranchAccess.ValidateRequestedBranch(request.BranchId, tenantContext) is { } forbidden)
        {
            return forbidden;
        }

        var scopedRequest = tenantContext.BranchId.HasValue
            ? request with { BranchId = tenantContext.BranchId.Value }
            : request;

        try
        {
            var result = await service.CreateAsync(tenantContext.TenantId, scopedRequest, cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            return Results.Created($"/api/v1/admin/campaigns/{result.Value!.CampaignId}", result.Value);
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(AdminCampaignEndpoints)).LogWarning(postgresException, "Database rejected campaign creation.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(AdminCampaignEndpoints)).LogError(ex, "Failed to create campaign.");
            return ApiProblemResponses.ServerError("Campaign could not be created.");
        }
    }
}
