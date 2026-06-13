using Npgsql;
using QRApp.Api.Errors;
using QRApp.Application.Menus;

namespace QRApp.Api.Endpoints;

public static class PublicMenuEndpoints
{
    public static IEndpointRouteBuilder MapPublicMenuEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/public");

        group.MapGet("/branches/{branchId:guid}/menu", GetPublicMenuAsync).AllowAnonymous();

        return app;
    }

    private static async Task<IResult> GetPublicMenuAsync(
        Guid branchId,
        IMenuItemService menuItemService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            var menu = await menuItemService.GetPublicMenuByBranchAsync(branchId, cancellationToken);
            return menu is null ? ApiProblemResponses.NotFound("Public menu was not found for this branch.") : Results.Ok(menu);
        }
        catch (Exception ex)
        when (ex is PostgresException)
        {
            var postgresException = (PostgresException)ex;
            loggerFactory.CreateLogger(nameof(PublicMenuEndpoints)).LogWarning(postgresException, "Database failed while reading public menu for branch {BranchId}.", branchId);
            return SqlProblemMapper.ToProblem(postgresException);
        }
    }
}
