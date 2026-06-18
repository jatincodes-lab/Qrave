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
        command.AddString("@PromoCode", request.PromoCode, 40);

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

    public async Task<PublicQrPromoCodeValidationResponse> ValidatePromoCodeAsync(
        string qrToken,
        Guid qrSessionId,
        ValidatePublicQrPromoCodeRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            """
            WITH tenant_guard AS (
                SELECT public.publicqr_assert_tenant_available(@p_qrtoken)
            ),
            session_guard AS (
                SELECT * FROM public.qrvisitsession_assert_active(@p_qrtoken,@p_qrsessionid)
            ),
            ctx AS (
                SELECT bt."TenantId", bt."BranchId", bt."TableId"
                FROM "BranchTables" bt
                JOIN "Branches" b ON b."BranchId" = bt."BranchId" AND b."IsActive"
                WHERE bt."QrToken" = @p_qrtoken AND bt."IsActive"
            ),
            items AS (
                SELECT COALESCE(v."Price", mi."Price") "UnitPrice",
                       GREATEST(COALESCE((x->>'quantity')::integer,0),0) "Quantity"
                FROM ctx
                CROSS JOIN jsonb_array_elements(COALESCE(NULLIF(@p_itemsjson,'')::jsonb,'[]'::jsonb)) x
                JOIN "MenuItems" mi ON mi."MenuItemId" = (x->>'menuItemId')::uuid
                    AND mi."TenantId" = ctx."TenantId"
                    AND mi."BranchId" = ctx."BranchId"
                    AND mi."IsActive"
                    AND mi."IsAvailable"
                LEFT JOIN "MenuItemVariants" v ON v."MenuItemVariantId" = NULLIF(x->>'menuItemVariantId','')::uuid
                    AND v."MenuItemId" = mi."MenuItemId"
                    AND v."IsAvailable"
                WHERE GREATEST(COALESCE((x->>'quantity')::integer,0),0) > 0
            ),
            subtotal AS (
                SELECT COALESCE(SUM("UnitPrice" * "Quantity"), 0) "SubtotalAmount"
                FROM items
            ),
            selected_offer AS (
                SELECT bo."BranchOfferId",
                       bo."Title",
                       bo."DiscountText",
                       bo."MaxTotalRedemptions",
                       bo."MaxRedemptionsPerCustomer",
                       bo."MaxRedemptionsPerDay",
                       round(LEAST(
                           subtotal."SubtotalAmount",
                           GREATEST(
                               0,
                               CASE
                                   WHEN bo."MaxDiscountAmount" IS NOT NULL THEN LEAST(
                                       CASE bo."DiscountTypeCode"
                                           WHEN 'Percentage' THEN round(subtotal."SubtotalAmount" * bo."DiscountValue" / 100, 2)
                                           ELSE round(bo."DiscountValue", 2)
                                       END,
                                       bo."MaxDiscountAmount"
                                   )
                                   ELSE CASE bo."DiscountTypeCode"
                                       WHEN 'Percentage' THEN round(subtotal."SubtotalAmount" * bo."DiscountValue" / 100, 2)
                                       ELSE round(bo."DiscountValue", 2)
                                   END
                               END
                           )
                       ), 2) "DiscountAmount"
                FROM ctx
                CROSS JOIN subtotal
                JOIN "BranchOffers" bo ON bo."TenantId" = ctx."TenantId"
                    AND bo."BranchId" = ctx."BranchId"
                    AND bo."IsActive"
                    AND bo."DiscountTypeCode" <> 'DisplayOnly'
                    AND bo."DiscountValue" > 0
                    AND subtotal."SubtotalAmount" >= bo."MinimumOrderAmount"
                    AND (bo."StartsAtUtc" IS NULL OR bo."StartsAtUtc" <= public.app_now())
                    AND (bo."EndsAtUtc" IS NULL OR bo."EndsAtUtc" >= public.app_now())
                    AND upper(bo."PromoCode") = @p_promocode
                ORDER BY "DiscountAmount" DESC, bo."DisplayOrder", bo."Title"
                LIMIT 1
            ),
            invalid_items AS (
                SELECT public.raise_app_error(51705) WHERE NOT EXISTS (SELECT 1 FROM items)
            ),
            invalid_code AS (
                SELECT public.raise_app_error(52101) WHERE NOT EXISTS (SELECT 1 FROM selected_offer)
            ),
            total_limit AS (
                SELECT public.raise_app_error(52102)
                FROM selected_offer s
                WHERE s."MaxTotalRedemptions" IS NOT NULL
                  AND (SELECT COUNT(*) FROM "BranchOfferRedemptions" r WHERE r."BranchOfferId" = s."BranchOfferId") >= s."MaxTotalRedemptions"
            ),
            daily_limit AS (
                SELECT public.raise_app_error(52102)
                FROM selected_offer s
                WHERE s."MaxRedemptionsPerDay" IS NOT NULL
                  AND (SELECT COUNT(*) FROM "BranchOfferRedemptions" r WHERE r."BranchOfferId" = s."BranchOfferId" AND r."RedeemedAtUtc" >= date_trunc('day', public.app_now())) >= s."MaxRedemptionsPerDay"
            ),
            customer_limit AS (
                SELECT public.raise_app_error(52103)
                FROM selected_offer s
                WHERE s."MaxRedemptionsPerCustomer" IS NOT NULL
                  AND NULLIF(btrim(@p_customerwhatsapp),'') IS NOT NULL
                  AND (SELECT COUNT(*) FROM "BranchOfferRedemptions" r WHERE r."BranchOfferId" = s."BranchOfferId" AND r."CustomerWhatsApp" = @p_customerwhatsapp) >= s."MaxRedemptionsPerCustomer"
            ),
            checks AS (
                SELECT
                    (SELECT COUNT(*) FROM tenant_guard) "TenantGuard",
                    (SELECT COUNT(*) FROM session_guard) "SessionGuard",
                    (SELECT COUNT(*) FROM invalid_items) "InvalidItems",
                    (SELECT COUNT(*) FROM invalid_code) "InvalidCode",
                    (SELECT COUNT(*) FROM total_limit) "TotalLimit",
                    (SELECT COUNT(*) FROM daily_limit) "DailyLimit",
                    (SELECT COUNT(*) FROM customer_limit) "CustomerLimit"
            )
            SELECT @p_promocode "PromoCode",
                   s."BranchOfferId",
                   s."Title",
                   s."DiscountText",
                   s."DiscountAmount"
            FROM selected_offer s
            CROSS JOIN checks
            """,
            connection);

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@QrSessionId", qrSessionId);
        command.AddString("@CustomerWhatsApp", request.CustomerWhatsApp, 32);
        command.AddString("@PromoCode", request.PromoCode, 40);
        command.AddString("@ItemsJson", JsonSerializer.Serialize(request.Items, JsonOptions), -1);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("Public promo code validation did not return a result.");
        }

        return new PublicQrPromoCodeValidationResponse(
            reader.GetString(reader.GetOrdinal("PromoCode")),
            reader.GetGuid(reader.GetOrdinal("BranchOfferId")),
            reader.GetString(reader.GetOrdinal("Title")),
            GetNullableString(reader, "DiscountText"),
            reader.GetDecimal(reader.GetOrdinal("DiscountAmount")));
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
