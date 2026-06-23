using Npgsql;
using QRApp.Application.Auth;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Auth;

public sealed class SqlUserAccessRepository(INpgsqlConnectionFactory connectionFactory) : IUserAccessRepository
{
    public async Task<CurrentUserAccessRecord?> GetCurrentAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            """
            SELECT "UserId","TenantId","RoleCode","BranchId","IsActive"
            FROM "TenantUsers"
            WHERE "TenantId" = @tenantId AND "UserId" = @userId
            LIMIT 1
            """,
            connection);

        command.Parameters.AddWithValue("tenantId", tenantId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new CurrentUserAccessRecord(
            reader.GetGuid(reader.GetOrdinal("UserId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetString(reader.GetOrdinal("RoleCode")),
            GetNullableGuid(reader, "BranchId"),
            reader.GetBoolean(reader.GetOrdinal("IsActive")));
    }

    private static Guid? GetNullableGuid(NpgsqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }
}
