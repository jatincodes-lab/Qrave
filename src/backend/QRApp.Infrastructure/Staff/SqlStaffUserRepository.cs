using System.Data;
using Npgsql;
using QRApp.Application.Staff;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Staff;

public sealed class SqlStaffUserRepository(INpgsqlConnectionFactory connectionFactory) : IStaffUserRepository
{
    public async Task<StaffUserResponse> CreateAsync(
        Guid tenantId,
        Guid userId,
        Guid tenantUserId,
        CreateStaffUserRequest request,
        string passwordHash,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.StaffUserCreate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@UserId", userId);
        command.AddGuid("@TenantUserId", tenantUserId);
        command.AddNullableGuid("@BranchId", request.BranchId);
        command.AddString("@Email", request.Email, 256);
        command.AddString("@DisplayName", request.DisplayName, 160);
        command.AddString("@PasswordHash", passwordHash, 512);
        command.AddString("@RoleCode", request.RoleCode, 40);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("StaffUser_Create did not return a staff row.");
        }

        return ReadStaff(reader);
    }

    public async Task<IReadOnlyCollection<StaffUserResponse>> GetListAsync(Guid tenantId, bool includeInactive, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.StaffUserGetList, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddBool("@IncludeInactive", includeInactive);

        var staffUsers = new List<StaffUserResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            staffUsers.Add(ReadStaff(reader));
        }

        return staffUsers;
    }

    public async Task<StaffUserResponse> UpdateAsync(Guid tenantId, Guid userId, UpdateStaffUserRequest request, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.StaffUserUpdate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@UserId", userId);
        command.AddNullableGuid("@BranchId", request.BranchId);
        command.AddString("@DisplayName", request.DisplayName, 160);
        command.AddString("@RoleCode", request.RoleCode, 40);
        command.AddBool("@IsActive", request.IsActive);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("StaffUser_Update did not return a staff row.");
        }

        return ReadStaff(reader);
    }

    public async Task<StaffUserResponse?> ResetPasswordAsync(Guid tenantId, Guid userId, string passwordHash, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using (var updateCommand = new NpgsqlCommand(
            """
            UPDATE "Users" u
            SET "PasswordHash" = @passwordHash
            WHERE u."UserId" = @userId
              AND EXISTS (
                  SELECT 1
                  FROM "TenantUsers" tu
                  WHERE tu."TenantId" = @tenantId
                    AND tu."UserId" = u."UserId"
                    AND lower(tu."RoleCode") <> 'owner'
              )
            """,
            connection))
        {
            updateCommand.Parameters.AddWithValue("tenantId", tenantId);
            updateCommand.Parameters.AddWithValue("userId", userId);
            updateCommand.Parameters.AddWithValue("passwordHash", passwordHash);
            var rows = await updateCommand.ExecuteNonQueryAsync(cancellationToken);
            if (rows == 0)
            {
                return null;
            }
        }

        return await GetByUserIdAsync(connection, tenantId, userId, cancellationToken);
    }

    public async Task<string?> GetPasswordHashAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            """
            SELECT u."PasswordHash"
            FROM "TenantUsers" tu
            JOIN "Users" u ON u."UserId" = tu."UserId"
            WHERE tu."TenantId" = @tenantId
              AND tu."UserId" = @userId
              AND tu."IsActive"
            LIMIT 1
            """,
            connection);

        command.Parameters.AddWithValue("tenantId", tenantId);
        command.Parameters.AddWithValue("userId", userId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is string hash ? hash : null;
    }

    public async Task<bool> UpdatePasswordAsync(Guid tenantId, Guid userId, string passwordHash, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            """
            UPDATE "Users" u
            SET "PasswordHash" = @passwordHash
            WHERE u."UserId" = @userId
              AND EXISTS (
                  SELECT 1
                  FROM "TenantUsers" tu
                  WHERE tu."TenantId" = @tenantId
                    AND tu."UserId" = u."UserId"
                    AND tu."IsActive"
              )
            """,
            connection);

        command.Parameters.AddWithValue("tenantId", tenantId);
        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("passwordHash", passwordHash);

        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    private static async Task<StaffUserResponse?> GetByUserIdAsync(NpgsqlConnection connection, Guid tenantId, Guid userId, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT
                u."UserId",
                tu."TenantUserId",
                tu."TenantId",
                tu."BranchId",
                b."Name" AS "BranchName",
                u."Email",
                u."DisplayName",
                tu."RoleCode",
                tu."IsActive" AS "IsActive",
                tu."IsActive" AS "TenantUserIsActive",
                tu."CreatedAtUtc",
                tu."UpdatedAtUtc"
            FROM "TenantUsers" tu
            JOIN "Users" u ON u."UserId" = tu."UserId"
            LEFT JOIN "Branches" b ON b."BranchId" = tu."BranchId"
            WHERE tu."TenantId" = @tenantId AND tu."UserId" = @userId
            LIMIT 1
            """,
            connection);

        command.Parameters.AddWithValue("tenantId", tenantId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadStaff(reader) : null;
    }

    private static StaffUserResponse ReadStaff(NpgsqlDataReader reader)
    {
        return new StaffUserResponse(
            reader.GetGuid(reader.GetOrdinal("UserId")),
            reader.GetGuid(reader.GetOrdinal("TenantUserId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            GetNullableGuid(reader, "BranchId"),
            GetNullableString(reader, "BranchName"),
            reader.GetString(reader.GetOrdinal("Email")),
            reader.GetString(reader.GetOrdinal("DisplayName")),
            reader.GetString(reader.GetOrdinal("RoleCode")),
            reader.GetBoolean(reader.GetOrdinal("IsActive")),
            reader.GetBoolean(reader.GetOrdinal("TenantUserIsActive")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            GetNullableDateTime(reader, "UpdatedAtUtc"));
    }

    private static Guid? GetNullableGuid(NpgsqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }

    private static string? GetNullableString(NpgsqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static DateTime? GetNullableDateTime(NpgsqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
    }
}
