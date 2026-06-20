using Npgsql;
using QRApp.Api.Errors;
using QRApp.Application.Customers;

namespace QRApp.Api.Endpoints;

public static class PublicCustomerEndpoints
{
    public static IEndpointRouteBuilder MapPublicCustomerEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/public");

        group.MapGet("/qr/{qrToken}/customers/me", GetCustomerAsync).AllowAnonymous();

        return app;
    }

    private static async Task<IResult> GetCustomerAsync(
        string qrToken,
        HttpContext httpContext,
        ICustomerService customerService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await customerService.GetByDeviceAccessAsync(
                qrToken,
                httpContext.Request.Headers["X-Customer-Device-Token"].FirstOrDefault() ?? string.Empty,
                cancellationToken);
            if (!result.IsSuccess)
            {
                return ApiProblemResponses.Validation(result.Errors);
            }

            return result.Value is null ? Results.NoContent() : Results.Ok(result.Value);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(PublicCustomerEndpoints)).LogWarning(postgresException, "Database rejected customer device access.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(PublicCustomerEndpoints)).LogError(ex, "Failed to read customer device access.");
            return ApiProblemResponses.ServerError("Customer history could not be loaded.");
        }
    }
}
