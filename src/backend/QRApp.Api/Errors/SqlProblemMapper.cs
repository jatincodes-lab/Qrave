using Npgsql;

namespace QRApp.Api.Errors;

internal static class SqlProblemMapper
{
    public static IResult ToProblem(PostgresException exception)
    {
        if (int.TryParse(exception.MessageText, out var domainError))
        {
            return ToDomainProblem(domainError);
        }

        return exception.SqlState switch
        {
            PostgresErrorCodes.UniqueViolation => Conflict("A record with the same unique value already exists."),
            PostgresErrorCodes.ForeignKeyViolation => ApiProblemResponses.BadRequest("The request violates a database relationship constraint."),
            PostgresErrorCodes.NotNullViolation => ApiProblemResponses.BadRequest("A required database value was missing."),
            PostgresErrorCodes.QueryCanceled => ServiceUnavailable("Database operation timed out."),
            PostgresErrorCodes.UndefinedTable
                or PostgresErrorCodes.UndefinedColumn
                or PostgresErrorCodes.UndefinedFunction
                or "42702"
                or "42P13" => ServiceUnavailable("Database schema is not up to date. Apply the latest database scripts and try again."),
            _ when exception.SqlState.StartsWith("08", StringComparison.Ordinal) => ServiceUnavailable("Database is not available or not configured correctly."),
            _ => ApiProblemResponses.ServerError("A database error occurred.")
        };
    }

    private static IResult ToDomainProblem(int errorNumber)
    {
        return errorNumber switch
        {
            51001 => Conflict("Tenant slug already exists."),
            51002 => Conflict("Tenant owner email already exists."),
            51301 => Conflict("User email already exists."),
            51102 => Conflict("Branch name already exists for this tenant."),
            51202 => Conflict("Branch order settings already exist."),
            51402 => Conflict("Menu category name already exists for this branch."),
            51502 => Conflict("Menu item name already exists for this category."),
            51602 => Conflict("Table name already exists for this branch."),
            51604 => Conflict("QR token already exists."),
            51702 => Conflict("Direct QR ordering is disabled for this branch."),

            51101 => ApiProblemResponses.NotFound("Active tenant was not found."),
            51103 => ApiProblemResponses.NotFound("Branch was not found for this tenant."),
            51201 => ApiProblemResponses.NotFound("Active branch was not found for this tenant."),
            51203 => ApiProblemResponses.NotFound("Branch order settings were not found for this tenant and branch."),
            51401 => ApiProblemResponses.NotFound("Active branch was not found for this tenant."),
            51403 => ApiProblemResponses.NotFound("Menu category was not found for this tenant and branch."),
            51501 => ApiProblemResponses.NotFound("Active menu category was not found for this tenant and branch."),
            51503 => ApiProblemResponses.NotFound("Menu item was not found for this tenant and branch."),
            51504 => ApiProblemResponses.BadRequest("Food type is invalid."),
            51601 => ApiProblemResponses.NotFound("Active branch was not found for this tenant."),
            51603 => ApiProblemResponses.NotFound("Table was not found for this tenant and branch."),
            51701 => ApiProblemResponses.NotFound("Active QR table was not found."),

            51703 => ApiProblemResponses.BadRequest("Customer name is required for this branch."),
            51704 => ApiProblemResponses.BadRequest("Customer WhatsApp is required for this branch."),
            51705 => ApiProblemResponses.BadRequest("At least one valid order item is required."),
            51706 => ApiProblemResponses.BadRequest("One or more menu items are unavailable for ordering."),
            51707 => ApiProblemResponses.BadRequest("Order status is invalid."),
            51708 => ApiProblemResponses.NotFound("Order was not found for this tenant and branch."),
            51709 => ApiProblemResponses.NotFound("Order was not found for this QR table."),
            51801 => ApiProblemResponses.NotFound("Active QR table was not found."),
            51802 => Conflict("Waiter call is disabled for this branch."),
            51803 => ApiProblemResponses.BadRequest("Waiter call status is invalid."),
            51804 => ApiProblemResponses.NotFound("Waiter call was not found for this tenant and branch."),
            52001 => Conflict("This table session has expired. Please scan the QR code at your table again."),
            51901 => ApiProblemResponses.BadRequest("Plan code is invalid."),
            51902 => ApiProblemResponses.BadRequest("Subscription status is invalid."),
            51903 => ApiProblemResponses.BadRequest("Account status is invalid."),
            51904 => ApiProblemResponses.BadRequest("Trial end date is required for trialing tenants."),
            51905 => ApiProblemResponses.NotFound("Tenant was not found."),
            _ => ApiProblemResponses.ServerError("A database error occurred.")
        };
    }

    private static IResult Conflict(string message)
    {
        return ApiProblemResponses.Conflict(message);
    }

    private static IResult ServiceUnavailable(string message)
    {
        return ApiProblemResponses.ServiceUnavailable(message);
    }
}
