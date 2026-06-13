using Npgsql;
using QRApp.Api.Errors;
using QRApp.Application.Customers;

namespace QRApp.Api.Endpoints;

public static class PublicCustomerEndpoints
{
    public static IEndpointRouteBuilder MapPublicCustomerEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/public");

        group.MapGet("/qr/{qrToken}/customers/lookup", LookupCustomerAsync).AllowAnonymous();

        return app;
    }

    private static async Task<IResult> LookupCustomerAsync(
        string qrToken,
        string whatsapp,
        ICustomerService customerService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await customerService.LookupPublicCustomerAsync(qrToken, whatsapp, cancellationToken);
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
            loggerFactory.CreateLogger(nameof(PublicCustomerEndpoints)).LogWarning(postgresException, "Database rejected public customer lookup.");
            return SqlProblemMapper.ToProblem(postgresException);
        }
        catch (Exception ex)
        {
            loggerFactory.CreateLogger(nameof(PublicCustomerEndpoints)).LogError(ex, "Failed to lookup public customer.");
            return ApiProblemResponses.ServerError("Customer could not be looked up.");
        }
    }
}
