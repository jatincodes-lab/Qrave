using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using QRApp.Api.Auth;
using QRApp.Api.Database;
using QRApp.Api.Endpoints;
using QRApp.Api.Errors;
using QRApp.Api.Hubs;
using QRApp.Api.Media;
using QRApp.Application;
using QRApp.Application.Auth;
using QRApp.Application.Tenants;
using QRApp.Infrastructure;

AppContext.SetSwitch("Npgsql.EnableStoredProcedureCompatMode", true);

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<RouteHandlerOptions>(options =>
{
    options.ThrowOnBadRequest = true;
});
builder.Services.AddHealthChecks();
builder.Services.AddHttpContextAccessor();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>()?
            .Where(origin => !string.IsNullOrWhiteSpace(origin))
            .ToArray();

        if (allowedOrigins is { Length: > 0 })
        {
            policy.WithOrigins(allowedOrigins);
        }
        else
        {
            policy.WithOrigins(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "http://localhost:3010",
                "http://127.0.0.1:3010");
        }

        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
builder.Services.AddSignalR();
builder.Services.AddApplication();
builder.Services.AddInfrastructure();
builder.Services.AddScoped<ITenantContext, HttpTenantContext>();
builder.Services.AddHttpClient<IImageUploadService, CloudinaryImageUploadService>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<IAdminOrderRealtimeNotifier, AdminOrderRealtimeNotifier>();
builder.Services.Configure<CloudinaryOptions>(builder.Configuration.GetSection(CloudinaryOptions.SectionName));

builder.Services
    .AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .Validate(options => options.SigningKey.Length >= 32, "JWT signing key must be at least 32 characters.")
    .ValidateOnStart();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrWhiteSpace(accessToken) && path.StartsWithSegments(AdminOrderHub.Route))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
            OnChallenge = AuthProblemResponses.WriteUnauthorizedAsync,
            OnForbidden = AuthProblemResponses.WriteForbiddenAsync
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder(JwtBearerDefaults.AuthenticationScheme)
        .RequireAuthenticatedUser()
        .RequireClaim(TokenClaims.UserId)
        .RequireClaim(TokenClaims.TenantId)
        .RequireClaim(TokenClaims.RoleCode)
        .Build();
});

var app = builder.Build();

await app.ApplyDatabaseStartupPatchesAsync();

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (BadHttpRequestException)
    {
        await ApiProblemResponses.BadRequest("The request body, route value, or query value is invalid.").ExecuteAsync(context);
    }
    catch (Exception)
    {
        await ApiProblemResponses.ServerError("An unexpected server error occurred.").ExecuteAsync(context);
    }
});

app.UseStatusCodePages(async statusCodeContext =>
{
    var response = statusCodeContext.HttpContext.Response;
    if (response.HasStarted)
    {
        return;
    }

    var result = response.StatusCode switch
    {
        StatusCodes.Status404NotFound => ApiProblemResponses.NotFound("The requested API endpoint was not found."),
        StatusCodes.Status405MethodNotAllowed => ApiProblemResponses.MethodNotAllowed("The HTTP method is not allowed for this API endpoint."),
        _ => null
    };

    if (result is not null)
    {
        await result.ExecuteAsync(statusCodeContext.HttpContext);
    }
});

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.Use(async (context, next) =>
{
    if (await ShouldBlockForCurrentUserAccessAsync(context))
    {
        return;
    }

    await next();
});
app.Use(async (context, next) =>
{
    if (await ShouldBlockForTenantAccessAsync(context))
    {
        return;
    }

    await next();
});
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/v1/admin") &&
        context.User.Identity?.IsAuthenticated == true)
    {
        var decision = GetAdminPermissionDecision(context);
        if (!decision.IsAllowed)
        {
            await ApiProblemResponses.Forbidden(decision.Reason ?? "Your staff role cannot access this admin action.").ExecuteAsync(context);
            return;
        }
    }

    await next();
});

app.MapGet("/health", () =>
{
    return Results.Ok(new
    {
        //status = "Healthy",
        service = "QRApp.Api",
        apiVersion = "2026-06-20.feedback-fix.2",
        utc = DateTimeOffset.UtcNow
    });
});

app.MapHealthChecks("/health/live");
app.MapAuthEndpoints();
app.MapAdminBranchEndpoints();
app.MapAdminMediaEndpoints();
app.MapAdminMenuEndpoints();
app.MapAdminNotificationEndpoints();
app.MapAdminTableEndpoints();
app.MapAdminOrderEndpoints();
app.MapAdminReportEndpoints();
app.MapAdminCampaignEndpoints();
app.MapAdminStaffEndpoints();
app.MapAdminBillingEndpoints();
app.MapSuperAdminEndpoints();
app.MapFeedbackEndpoints();
app.MapPublicMenuEndpoints();
app.MapPublicQrEndpoints();
app.MapPublicCustomerEndpoints();
app.MapPublicOrderEndpoints();
app.MapTenantBranchEndpoints();
app.MapWaiterCallEndpoints();
app.MapHub<AdminOrderHub>(AdminOrderHub.Route);

app.Run();

static AdminPermissionDecision GetAdminPermissionDecision(HttpContext context)
{
    var roleCode = context.User.FindFirstValue(TokenClaims.RoleCode);
    return string.IsNullOrWhiteSpace(roleCode)
        ? new AdminPermissionDecision(false, "Your staff role cannot access this admin action.")
        : AdminPermissionPolicy.CanAccess(
            new AdminPrincipalAccess(roleCode, ReadOptionalGuidClaim(context.User, TokenClaims.BranchId)),
            new AdminRequestAccess(context.Request.Method, context.Request.Path.Value ?? string.Empty, ReadBranchIdFromQuery(context)));
}

static async Task<bool> ShouldBlockForTenantAccessAsync(HttpContext context)
{
    if (IsAnonymousAuthPath(context.Request.Path))
    {
        return false;
    }

    if (IsTenantAccessManagementPath(context.Request.Path))
    {
        return false;
    }

    var service = context.RequestServices.GetRequiredService<ITenantAccessService>();
    TenantAccessStatusResponse? accessStatus = null;

    if (context.Request.Path.StartsWithSegments("/api/v1/admin") && context.User.Identity?.IsAuthenticated == true)
    {
        var tenantId = ReadOptionalGuidClaim(context.User, TokenClaims.TenantId);
        if (tenantId.HasValue)
        {
            accessStatus = await service.GetByTenantIdAsync(tenantId.Value, context.RequestAborted);
        }
    }
    else if (context.Request.Path.StartsWithSegments("/api/v1/public/qr"))
    {
        var qrToken = ReadQrTokenFromPublicPath(context.Request.Path.Value ?? string.Empty);
        if (!string.IsNullOrWhiteSpace(qrToken))
        {
            accessStatus = await service.GetByQrTokenAsync(Uri.UnescapeDataString(qrToken), context.RequestAborted);
        }
    }

    if (accessStatus is null || accessStatus.IsAccessAllowed)
    {
        return false;
    }

    await ApiProblemResponses.PaymentRequired(accessStatus.Message).ExecuteAsync(context);
    return true;
}

static async Task<bool> ShouldBlockForCurrentUserAccessAsync(HttpContext context)
{
    if ((!context.Request.Path.StartsWithSegments("/api/v1/admin") &&
         !context.Request.Path.StartsWithSegments("/api/v1/me")) ||
        context.User.Identity?.IsAuthenticated != true)
    {
        return false;
    }

    var userId = ReadOptionalGuidClaim(context.User, TokenClaims.UserId);
    var tenantId = ReadOptionalGuidClaim(context.User, TokenClaims.TenantId);
    var tokenRole = context.User.FindFirstValue(TokenClaims.RoleCode);
    if (!userId.HasValue || !tenantId.HasValue || string.IsNullOrWhiteSpace(tokenRole))
    {
        await ApiProblemResponses.Unauthorized("Your login session is invalid. Please login again.").ExecuteAsync(context);
        return true;
    }

    var service = context.RequestServices.GetRequiredService<IUserAccessService>();
    var currentAccess = await service.GetCurrentAsync(tenantId.Value, userId.Value, context.RequestAborted);
    if (currentAccess is null || !currentAccess.IsActive)
    {
        await ApiProblemResponses.Unauthorized("Your staff access is no longer active. Please login again.").ExecuteAsync(context);
        return true;
    }

    var tokenBranchId = ReadOptionalGuidClaim(context.User, TokenClaims.BranchId);
    if (!string.Equals(currentAccess.RoleCode, tokenRole, StringComparison.OrdinalIgnoreCase) ||
        currentAccess.BranchId != tokenBranchId)
    {
        await ApiProblemResponses.Unauthorized("Your staff access changed. Please login again.").ExecuteAsync(context);
        return true;
    }

    return false;
}

static bool IsAnonymousAuthPath(PathString path)
{
    return path.StartsWithSegments("/api/v1/auth");
}

static bool IsTenantAccessManagementPath(PathString path)
{
    return path.StartsWithSegments("/api/v1/admin/billing");
}

static string? ReadQrTokenFromPublicPath(string path)
{
    var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
    for (var index = 0; index < segments.Length - 1; index++)
    {
        if (string.Equals(segments[index], "qr", StringComparison.OrdinalIgnoreCase))
        {
            return segments[index + 1];
        }
    }

    return null;
}

static Guid? ReadBranchIdFromQuery(HttpContext context)
{
    return Guid.TryParse(context.Request.Query["branchId"], out var branchId) ? branchId : null;
}

static Guid? ReadOptionalGuidClaim(ClaimsPrincipal user, string claimType)
{
    return Guid.TryParse(user.FindFirstValue(claimType), out var value) ? value : null;
}

public partial class Program;
