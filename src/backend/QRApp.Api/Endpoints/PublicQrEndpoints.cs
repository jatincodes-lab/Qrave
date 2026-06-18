using Npgsql;
using QRApp.Api.Errors;
using QRApp.Application.Tables;
using QRApp.Application.Tenants;

namespace QRApp.Api.Endpoints;

public static class PublicQrEndpoints
{
    public static IEndpointRouteBuilder MapPublicQrEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/public");

        group.MapGet("/qr/{qrToken}", GetPublicQrMenuAsync).AllowAnonymous();
        group.MapPost("/qr/{qrToken}/sessions", CreatePublicQrSessionAsync).AllowAnonymous();

        return app;
    }

    private static async Task<IResult> GetPublicQrMenuAsync(
        string qrToken,
        IBranchTableService branchTableService,
        ITenantAccessService tenantAccessService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var accessStatus = await tenantAccessService.GetByQrTokenAsync(qrToken, cancellationToken);
            if (accessStatus is { IsAccessAllowed: false })
            {
                return ApiProblemResponses.Locked("This restaurant is temporarily unavailable.");
            }

            var menu = await branchTableService.GetPublicMenuByQrTokenAsync(qrToken, cancellationToken);
            return menu is null ? ApiProblemResponses.NotFound("QR menu was not found. Check that the QR code is active and belongs to an active table.") : Results.Ok(menu);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(PublicQrEndpoints)).LogWarning(postgresException, "Database failed while reading public menu for QR token.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }

    private static async Task<IResult> CreatePublicQrSessionAsync(
        string qrToken,
        IBranchTableService branchTableService,
        ITenantAccessService tenantAccessService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var accessStatus = await tenantAccessService.GetByQrTokenAsync(qrToken, cancellationToken);
            if (accessStatus is { IsAccessAllowed: false })
            {
                return ApiProblemResponses.Locked("This restaurant is temporarily unavailable.");
            }

            var session = await branchTableService.CreatePublicQrSessionAsync(qrToken, cancellationToken);
            return session is null
                ? ApiProblemResponses.NotFound("QR menu was not found. Check that the QR code is active and belongs to an active table.")
                : Results.Created($"/api/v1/public/qr/{qrToken}/sessions/{session.QrSessionId}", session);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(PublicQrEndpoints)).LogWarning(postgresException, "Database failed while creating public QR session.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }
}
