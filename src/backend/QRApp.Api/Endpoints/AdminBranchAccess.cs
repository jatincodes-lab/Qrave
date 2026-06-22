using System.Globalization;
using QRApp.Api.Errors;
using QRApp.Application.Auth;

namespace QRApp.Api.Endpoints;

internal static class AdminBranchAccess
{
    private const string ForbiddenMessage = "Your account is assigned to a different branch.";

    public static RouteGroupBuilder RequireAssignedBranchAccess(this RouteGroupBuilder group)
    {
        return group.AddEndpointFilter(async (context, next) =>
        {
            var tenantContext = context.HttpContext.RequestServices.GetRequiredService<ITenantContext>();
            if (!tenantContext.BranchId.HasValue)
            {
                return await next(context);
            }

            if (!TryReadRouteBranchId(context.HttpContext, out var requestedBranchId))
            {
                return await next(context);
            }

            return requestedBranchId == tenantContext.BranchId.Value
                ? await next(context)
                : ApiProblemResponses.Forbidden(ForbiddenMessage);
        });
    }

    public static IResult? ValidateRequestedBranch(Guid? requestedBranchId, ITenantContext tenantContext)
    {
        return tenantContext.BranchId.HasValue &&
               requestedBranchId.HasValue &&
               requestedBranchId.Value != tenantContext.BranchId.Value
            ? ApiProblemResponses.Forbidden(ForbiddenMessage)
            : null;
    }

    public static Guid? ScopeBranchFilter(Guid? requestedBranchId, ITenantContext tenantContext)
    {
        return tenantContext.BranchId ?? requestedBranchId;
    }

    private static bool TryReadRouteBranchId(HttpContext httpContext, out Guid branchId)
    {
        branchId = Guid.Empty;
        if (!httpContext.Request.RouteValues.TryGetValue("branchId", out var rawValue))
        {
            return false;
        }

        return Guid.TryParse(Convert.ToString(rawValue, CultureInfo.InvariantCulture), out branchId);
    }
}
