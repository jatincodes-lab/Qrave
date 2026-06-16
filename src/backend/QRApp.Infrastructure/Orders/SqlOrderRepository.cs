using System.Data;
using System.Text.Json;
using Npgsql;
using QRApp.Application.Orders;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Orders;

public sealed class SqlOrderRepository(INpgsqlConnectionFactory connectionFactory) : IOrderRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<PublicOrderResponse> CreateFromQrTokenAsync(
        string qrToken,
        Guid qrSessionId,
        Guid orderId,
        CreatePublicQrOrderRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.PublicOrderCreateFromQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@QrSessionId", qrSessionId);
        command.AddGuid("@OrderId", orderId);
        command.AddString("@CustomerName", request.CustomerName, 120);
        command.AddString("@CustomerWhatsApp", request.CustomerWhatsApp, 32);
        command.AddString("@Notes", request.Notes, 500);
        command.AddString("@ItemsJson", JsonSerializer.Serialize(request.Items, JsonOptions), -1);
        command.AddBool("@MarketingConsent", request.MarketingConsent);
        command.AddString("@MarketingConsentSource", "qr_checkout", 80);

        PublicOrderResponse order;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new DataException("PublicOrder_CreateFromQrToken did not return an order row.");
            }

            order = ReadOrder(reader);
        }

        return order with { Items = await GetItemsByOrderAsync(connection, order.OrderId, cancellationToken) };
    }

    public async Task<PublicOrderResponse> GetByQrTokenAsync(
        string qrToken,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.PublicOrderGetByQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@OrderId", orderId);

        PublicOrderResponse order;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new DataException("PublicOrder_GetByQrToken did not return an order row.");
            }

            order = ReadOrder(reader);
        }

        return order with { Items = await GetItemsByOrderAsync(connection, order.OrderId, cancellationToken) };
    }

    private static async Task<IReadOnlyCollection<PublicOrderItemResponse>> GetItemsByOrderAsync(
        NpgsqlConnection connection,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(StoredProcedures.PublicOrderGetItemsByOrder, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@OrderId", orderId);

        var items = new List<PublicOrderItemResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadOrderItem(reader));
        }

        return items;
    }

    private static PublicOrderResponse ReadOrder(NpgsqlDataReader reader)
    {
        return new PublicOrderResponse(
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetGuid(reader.GetOrdinal("TableId")),
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
            Array.Empty<PublicOrderItemResponse>());
    }

    private static PublicOrderItemResponse ReadOrderItem(NpgsqlDataReader reader)
    {
        return new PublicOrderItemResponse(
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
}
