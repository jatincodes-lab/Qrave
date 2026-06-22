using System.Data;
using Npgsql;
using QRApp.Application.Orders;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Orders;

public sealed class SqlAdminOrderRepository(INpgsqlConnectionFactory connectionFactory) : IAdminOrderRepository
{
    public async Task<IReadOnlyCollection<AdminOrderResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeCompleted,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var orders = new List<AdminOrderResponse>();
        await using (var command = new NpgsqlCommand(StoredProcedures.AdminOrderGetListByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        })
        {
            command.AddGuid("@TenantId", tenantId);
            command.AddGuid("@BranchId", branchId);
            command.AddBool("@IncludeCompleted", includeCompleted);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                orders.Add(ReadOrder(reader, Array.Empty<AdminOrderItemResponse>()));
            }
        }

        if (orders.Count == 0)
        {
            return orders;
        }

        var itemsByOrderId = await GetItemsByBranchAsync(connection, tenantId, branchId, cancellationToken);
        return orders
            .Select(order => order with
            {
                Items = itemsByOrderId.TryGetValue(order.OrderId, out var items) ? items : Array.Empty<AdminOrderItemResponse>()
            })
            .ToArray();
    }

    public async Task<AdminOrderResponse> UpdateStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        string orderStatusCode,
        string? reason,
        Guid changedByUserId,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.AdminOrderUpdateStatus, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@OrderId", orderId);
        command.AddString("@OrderStatusCode", orderStatusCode, 32);
        command.AddString("@Reason", reason, 300);
        command.AddGuid("@ChangedByUserId", changedByUserId);

        AdminOrderResponse order;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new DataException("AdminOrder_UpdateStatus did not return an order row.");
            }

            order = ReadOrder(reader, Array.Empty<AdminOrderItemResponse>());
        }

        var itemsByOrderId = await GetItemsByBranchAsync(connection, tenantId, branchId, cancellationToken);
        return order with
        {
            Items = itemsByOrderId.TryGetValue(orderId, out var items) ? items : Array.Empty<AdminOrderItemResponse>()
        };
    }

    private static async Task<Dictionary<Guid, AdminOrderItemResponse[]>> GetItemsByBranchAsync(
        NpgsqlConnection connection,
        Guid tenantId,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(StoredProcedures.AdminOrderGetItemsByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);

        var items = new List<AdminOrderItemResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadItem(reader));
        }

        return items
            .GroupBy(item => item.OrderId)
            .ToDictionary(group => group.Key, group => group.ToArray());
    }

    private static AdminOrderResponse ReadOrder(NpgsqlDataReader reader, IReadOnlyCollection<AdminOrderItemResponse> items)
    {
        return new AdminOrderResponse(
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetGuid(reader.GetOrdinal("TableId")),
            reader.GetString(reader.GetOrdinal("TableName")),
            reader.GetString(reader.GetOrdinal("OrderStatusCode")),
            GetNullableString(reader, "CustomerName"),
            GetNullableString(reader, "CustomerWhatsApp"),
            GetNullableString(reader, "Notes"),
            reader.GetDecimal(reader.GetOrdinal("SubtotalAmount")),
            reader.GetDecimal(reader.GetOrdinal("TotalAmount")),
            GetNullableGuid(reader, "AppliedBranchOfferId"),
            GetNullableString(reader, "AppliedOfferTitle"),
            reader.GetDecimal(reader.GetOrdinal("AppliedOfferDiscountAmount")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")),
            GetNullableDateTime(reader, "ClosedAtUtc"),
            GetNullableString(reader, "LatestReason"),
            items);
    }

    private static AdminOrderItemResponse ReadItem(NpgsqlDataReader reader)
    {
        return new AdminOrderItemResponse(
            reader.GetGuid(reader.GetOrdinal("OrderItemId")),
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            reader.GetGuid(reader.GetOrdinal("MenuItemId")),
            GetNullableGuid(reader, "MenuItemVariantId"),
            reader.GetString(reader.GetOrdinal("MenuItemName")),
            GetNullableString(reader, "VariantName"),
            GetNullableString(reader, "ItemNote"),
            reader.GetString(reader.GetOrdinal("DietTypeCode")),
            reader.GetDecimal(reader.GetOrdinal("UnitPrice")),
            reader.GetInt32(reader.GetOrdinal("Quantity")),
            reader.GetDecimal(reader.GetOrdinal("LineTotal")));
    }

    private static string? GetNullableString(NpgsqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static Guid? GetNullableGuid(NpgsqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }

    private static DateTime? GetNullableDateTime(NpgsqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
    }
}
