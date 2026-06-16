using System.Data;
using Npgsql;
using QRApp.Application.WaiterCalls;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.WaiterCalls;

public sealed class SqlWaiterCallRepository(INpgsqlConnectionFactory connectionFactory) : IWaiterCallRepository
{
    public async Task<WaiterCallResponse> CreateFromQrTokenAsync(
        string qrToken,
        Guid qrSessionId,
        Guid waiterCallId,
        CreateWaiterCallRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.WaiterCallCreateFromQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@QrSessionId", qrSessionId);
        command.AddGuid("@WaiterCallId", waiterCallId);
        command.AddString("@CustomerName", request.CustomerName, 120);
        command.AddString("@Note", request.Note, 500);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("WaiterCall_CreateFromQrToken did not return a waiter call row.");
        }

        return ReadCall(reader);
    }

    public async Task<IReadOnlyCollection<WaiterCallResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeResolved,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.WaiterCallGetListByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddBool("@IncludeResolved", includeResolved);

        var calls = new List<WaiterCallResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            calls.Add(ReadCall(reader));
        }

        return calls;
    }

    public async Task<WaiterCallResponse> UpdateStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid waiterCallId,
        string statusCode,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.WaiterCallUpdateStatus, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@WaiterCallId", waiterCallId);
        command.AddString("@StatusCode", statusCode, 32);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("WaiterCall_UpdateStatus did not return a waiter call row.");
        }

        return ReadCall(reader);
    }

    private static WaiterCallResponse ReadCall(NpgsqlDataReader reader)
    {
        return new WaiterCallResponse(
            reader.GetGuid(reader.GetOrdinal("WaiterCallId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetGuid(reader.GetOrdinal("TableId")),
            reader.GetString(reader.GetOrdinal("TableName")),
            reader.GetString(reader.GetOrdinal("StatusCode")),
            GetNullableString(reader, "CustomerName"),
            GetNullableString(reader, "Note"),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")));
    }

    private static string? GetNullableString(NpgsqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }
}
