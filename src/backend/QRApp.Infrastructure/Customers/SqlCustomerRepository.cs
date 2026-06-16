using System.Data;
using Npgsql;
using QRApp.Application.Customers;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Customers;

public sealed class SqlCustomerRepository(INpgsqlConnectionFactory connectionFactory) : ICustomerRepository
{
    public async Task<PublicCustomerLookupResponse?> LookupPublicCustomerAsync(
        string qrToken,
        string customerWhatsApp,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.PublicCustomerLookupByQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);
        command.AddString("@CustomerWhatsApp", customerWhatsApp, 32);

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
