using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Npgsql;
using QRApp.Api.Auth;
using QRApp.Api.Errors;
using QRApp.Application.Auth;
using QRApp.Application.SuperAdmin;

namespace QRApp.Api.Endpoints;

public static class SuperAdminEndpoints
{
    public static IEndpointRouteBuilder MapSuperAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/superadmin");

        group.MapPost("/bootstrap", BootstrapAsync).AllowAnonymous();
        group.MapPost("/login", LoginAsync).AllowAnonymous();
        group.MapGet("/dashboard", GetDashboardAsync).RequireAuthorization();
        group.MapGet("/restaurants", SearchRestaurantsAsync).RequireAuthorization();
        group.MapGet("/restaurants/{tenantId:guid}", GetRestaurantDetailAsync).RequireAuthorization();
        group.MapPut("/restaurants/{tenantId:guid}/subscription", UpdateSubscriptionAsync).RequireAuthorization();
        group.MapPost("/restaurants/{tenantId:guid}/extend-trial", ExtendTrialAsync).RequireAuthorization();
        group.MapPost("/restaurants/{tenantId:guid}/reactivate", ReactivateAsync).RequireAuthorization();
        group.MapPost("/restaurants/{tenantId:guid}/suspend", SuspendAsync).RequireAuthorization();
        group.MapPost("/restaurants/{tenantId:guid}/notes", CreateInternalNoteAsync).RequireAuthorization();

        return app;
    }

    private static async Task<IResult> BootstrapAsync(
        SuperAdminBootstrapRequest request,
        ISuperAdminService service,
        IJwtTokenService jwtTokenService,
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.BootstrapAsync(request, configuration["SuperAdmin:SetupToken"], cancellationToken);
            return result.IsSuccess ? Results.Created("/api/v1/superadmin/dashboard", ToTokenResponse(result.Value!, jwtTokenService)) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(SuperAdminEndpoints)).LogWarning(postgresException, "Database rejected super admin bootstrap.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> LoginAsync(
        SuperAdminLoginRequest request,
        ISuperAdminService service,
        IJwtTokenService jwtTokenService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.LoginAsync(request, cancellationToken);
            return result.IsSuccess ? Results.Ok(ToTokenResponse(result.Value!, jwtTokenService)) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(SuperAdminEndpoints)).LogWarning(postgresException, "Database failed during super admin login.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> GetDashboardAsync(
        ClaimsPrincipal user,
        ISuperAdminService service,
        CancellationToken cancellationToken)
    {
        if (!IsSuperAdmin(user))
        {
            return ApiProblemResponses.Forbidden("Super admin access is required.");
        }

        return Results.Ok(await service.GetDashboardAsync(cancellationToken));
    }

    private static async Task<IResult> SearchRestaurantsAsync(
        string? search,
        string? status,
        string? plan,
        ClaimsPrincipal user,
        ISuperAdminService service,
        CancellationToken cancellationToken)
    {
        if (!IsSuperAdmin(user))
        {
            return ApiProblemResponses.Forbidden("Super admin access is required.");
        }

        return Results.Ok(await service.SearchRestaurantsAsync(search, status, plan, cancellationToken));
    }

    private static async Task<IResult> GetRestaurantDetailAsync(
        Guid tenantId,
        ClaimsPrincipal user,
        ISuperAdminService service,
        CancellationToken cancellationToken)
    {
        if (!IsSuperAdmin(user))
        {
            return ApiProblemResponses.Forbidden("Super admin access is required.");
        }

        var detail = await service.GetRestaurantDetailAsync(tenantId, cancellationToken);
        return detail is null ? ApiProblemResponses.NotFound("Restaurant was not found.") : Results.Ok(detail);
    }

    private static async Task<IResult> UpdateSubscriptionAsync(
        Guid tenantId,
        SuperAdminUpdateSubscriptionRequest request,
        ClaimsPrincipal user,
        ISuperAdminService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        return await ExecuteSuperAdminChangeAsync(user, loggerFactory, () => service.UpdateSubscriptionAsync(tenantId, request, ReadUserId(user), cancellationToken));
    }

    private static async Task<IResult> ExtendTrialAsync(
        Guid tenantId,
        SuperAdminExtendTrialRequest request,
        ClaimsPrincipal user,
        ISuperAdminService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        return await ExecuteSuperAdminChangeAsync(user, loggerFactory, () => service.ExtendTrialAsync(tenantId, request, ReadUserId(user), cancellationToken));
    }

    private static async Task<IResult> ReactivateAsync(
        Guid tenantId,
        SuperAdminTenantActionRequest request,
        ClaimsPrincipal user,
        ISuperAdminService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        return await ExecuteSuperAdminChangeAsync(user, loggerFactory, () => service.ReactivateAsync(tenantId, request, ReadUserId(user), cancellationToken));
    }

    private static async Task<IResult> SuspendAsync(
        Guid tenantId,
        SuperAdminTenantActionRequest request,
        ClaimsPrincipal user,
        ISuperAdminService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        return await ExecuteSuperAdminChangeAsync(user, loggerFactory, () => service.SuspendAsync(tenantId, request, ReadUserId(user), cancellationToken));
    }

    private static async Task<IResult> CreateInternalNoteAsync(
        Guid tenantId,
        SuperAdminCreateInternalNoteRequest request,
        ClaimsPrincipal user,
        ISuperAdminService service,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (!IsSuperAdmin(user))
        {
            return ApiProblemResponses.Forbidden("Super admin access is required.");
        }

        try
        {
            var result = await service.CreateInternalNoteAsync(tenantId, request, ReadUserId(user), cancellationToken);
            return result.IsSuccess ? Results.Created($"/api/v1/superadmin/restaurants/{tenantId}/notes", result.Value) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(SuperAdminEndpoints)).LogWarning(postgresException, "Database rejected super admin note creation.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> ExecuteSuperAdminChangeAsync<T>(
        ClaimsPrincipal user,
        ILoggerFactory loggerFactory,
        Func<Task<QRApp.Shared.Results.OperationResult<T>>> action)
    {
        if (!IsSuperAdmin(user))
        {
            return ApiProblemResponses.Forbidden("Super admin access is required.");
        }

        try
        {
            var result = await action();
            return result.IsSuccess ? Results.Ok(result.Value) : ApiProblemResponses.Validation(result.Errors);
        }
        catch (Exception ex) when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(SuperAdminEndpoints)).LogWarning(postgresException, "Database rejected super admin change.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static SuperAdminTokenResponse ToTokenResponse(SuperAdminSessionResponse response, IJwtTokenService jwtTokenService)
    {
        var token = jwtTokenService.CreateToken(response.Session);
        return new SuperAdminTokenResponse(token.AccessToken, token.ExpiresAtUtc, response.Session.User, response.RoleCode);
    }

    private static bool IsSuperAdmin(ClaimsPrincipal user)
    {
        return string.Equals(user.FindFirstValue(TokenClaims.RoleCode), "super_admin", StringComparison.OrdinalIgnoreCase);
    }

    private static Guid ReadUserId(ClaimsPrincipal user)
    {
        return Guid.TryParse(user.FindFirstValue(TokenClaims.UserId), out var userId) ? userId : Guid.Empty;
    }

    private sealed record SuperAdminTokenResponse(
        string AccessToken,
        DateTime ExpiresAtUtc,
        AuthenticatedUserResponse User,
        string RoleCode);
}
