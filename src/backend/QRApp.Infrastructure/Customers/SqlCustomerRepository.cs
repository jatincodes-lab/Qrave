using System.Data;
using Npgsql;
using QRApp.Application.Customers;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Customers;

public sealed class SqlCustomerRepository(INpgsqlConnectionFactory connectionFactory) : ICustomerRepository
{
    public async Task<bool> CreateDeviceAccessAsync(
        string qrToken,
        Guid orderId,
        string tokenHash,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            """
            INSERT INTO "CustomerDeviceAccessTokens"
                ("CustomerDeviceAccessTokenId", "TenantId", "BranchId", "CustomerId", "TokenHash", "ExpiresAtUtc")
            SELECT gen_random_uuid(), o."TenantId", o."BranchId", o."CustomerId", @TokenHash, @ExpiresAtUtc
            FROM "Orders" o
            JOIN "BranchTables" bt ON bt."TableId" = o."TableId"
                AND bt."BranchId" = o."BranchId"
                AND bt."TenantId" = o."TenantId"
            WHERE bt."QrToken" = @QrToken
              AND bt."IsActive"
              AND o."OrderId" = @OrderId
              AND o."CustomerId" IS NOT NULL
            RETURNING 1
            """,
            connection);

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@OrderId", orderId);
        command.AddString("@TokenHash", tokenHash, 64);
        command.Parameters.AddWithValue("@ExpiresAtUtc", expiresAtUtc);
        return await command.ExecuteScalarAsync(cancellationToken) is not null;
    }

    public async Task<PublicCustomerLookupResponse?> GetByDeviceAccessAsync(
        string qrToken,
        string tokenHash,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            """
            SELECT c."CustomerId", c."Name", c."WhatsAppNumber", c."MarketingConsent", c."VisitCount",
                   COUNT(o."OrderId")::integer "TotalOrderCount",
                   COALESCE(SUM(o."TotalAmount"), 0) "TotalOrderValue",
                   COALESCE(c."LastVisitAtUtc", c."CreatedAtUtc") "LastVisitAtUtc"
            FROM "CustomerDeviceAccessTokens" access
            JOIN "Customers" c ON c."CustomerId" = access."CustomerId"
            LEFT JOIN "Orders" o ON o."CustomerId" = c."CustomerId"
            WHERE access."TokenHash" = @TokenHash
              AND access."RevokedAtUtc" IS NULL
              AND access."ExpiresAtUtc" > public.app_now()
              AND EXISTS (
                  SELECT 1
                  FROM "BranchTables" bt
                  WHERE bt."QrToken" = @QrToken
                    AND bt."BranchId" = access."BranchId"
                    AND bt."TenantId" = access."TenantId"
                    AND bt."IsActive"
                    AND public.tenant_public_access_allowed(bt."TenantId")
              )
            GROUP BY c."CustomerId"
            """,
            connection);

        command.AddString("@QrToken", qrToken, 80);
        command.AddString("@TokenHash", tokenHash, 64);

        PublicCustomerLookupResponse customer;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            customer = new PublicCustomerLookupResponse(
                reader.GetGuid(reader.GetOrdinal("CustomerId")),
                GetNullableString(reader, "Name"),
                reader.GetString(reader.GetOrdinal("WhatsAppNumber")),
                reader.GetBoolean(reader.GetOrdinal("MarketingConsent")),
                reader.GetInt32(reader.GetOrdinal("VisitCount")),
                reader.GetInt32(reader.GetOrdinal("TotalOrderCount")),
                reader.GetDecimal(reader.GetOrdinal("TotalOrderValue")),
                reader.GetDateTime(reader.GetOrdinal("LastVisitAtUtc")),
                Array.Empty<PublicCustomerRecentOrderResponse>());
        }

        var orders = await GetRecentOrdersAsync(connection, customer.CustomerId, cancellationToken);
        var itemsByOrderId = await GetRecentOrderItemsAsync(connection, customer.CustomerId, cancellationToken);
        var recentOrders = orders
            .Select(order => order with
            {
                Items = itemsByOrderId.TryGetValue(order.OrderId, out var items)
                    ? items
                    : Array.Empty<PublicCustomerRecentOrderItemResponse>()
            })
            .Where(order => order.Items.Count > 0)
            .ToArray();

        return customer with { RecentOrders = recentOrders };
    }

    private static async Task<IReadOnlyCollection<PublicCustomerRecentOrderResponse>> GetRecentOrdersAsync(
        NpgsqlConnection connection,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(StoredProcedures.PublicCustomerRecentOrdersByCustomer, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@CustomerId", customerId);

        var orders = new List<PublicCustomerRecentOrderResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            orders.Add(new PublicCustomerRecentOrderResponse(
                reader.GetGuid(reader.GetOrdinal("OrderId")),
                reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
                reader.GetDecimal(reader.GetOrdinal("TotalAmount")),
                Array.Empty<PublicCustomerRecentOrderItemResponse>()));
        }

        return orders;
    }

    private static async Task<Dictionary<Guid, List<PublicCustomerRecentOrderItemResponse>>> GetRecentOrderItemsAsync(
        NpgsqlConnection connection,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(StoredProcedures.PublicCustomerRecentOrderItemsByCustomer, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@CustomerId", customerId);

        var itemsByOrderId = new Dictionary<Guid, List<PublicCustomerRecentOrderItemResponse>>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var item = ReadRecentOrderItem(reader);
            if (!itemsByOrderId.TryGetValue(item.OrderId, out var items))
            {
                items = [];
                itemsByOrderId[item.OrderId] = items;
            }

            items.Add(item);
        }

        return itemsByOrderId;
    }

    private static PublicCustomerRecentOrderItemResponse ReadRecentOrderItem(NpgsqlDataReader reader)
    {
        return new PublicCustomerRecentOrderItemResponse(
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            reader.GetGuid(reader.GetOrdinal("MenuItemId")),
            GetNullableGuid(reader, "MenuItemVariantId"),
            reader.GetString(reader.GetOrdinal("MenuItemName")),
            GetNullableString(reader, "VariantName"),
            GetNullableString(reader, "ItemNote"),
            reader.GetString(reader.GetOrdinal("DietTypeCode")),
            reader.GetInt32(reader.GetOrdinal("Quantity")));
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
}
