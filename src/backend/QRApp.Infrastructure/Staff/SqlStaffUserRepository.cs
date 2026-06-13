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
