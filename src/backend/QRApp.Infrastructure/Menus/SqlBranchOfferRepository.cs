using System.Data;
using Npgsql;
using NpgsqlTypes;
using QRApp.Application.Menus;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Menus;

public sealed class SqlBranchOfferRepository(INpgsqlConnectionFactory connectionFactory) : IBranchOfferRepository
{
    public async Task<BranchOfferResponse> CreateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, CreateBranchOfferRequest request, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.BranchOfferCreate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@BranchOfferId", branchOfferId);
        AddOfferParameters(command, request.Title, request.Subtitle, request.DiscountText, request.ImageUrl, request.ImageAltText, request.DisplayOrder, request.StartsAtUtc, request.EndsAtUtc, request.DiscountTypeCode, request.DiscountValue, request.MinimumOrderAmount, request.MaxDiscountAmount, request.AutoApply, request.PromoCode, request.RequiresPromoCode, request.MaxTotalRedemptions, request.MaxRedemptionsPerCustomer, request.MaxRedemptionsPerDay);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadOffer(reader);
        }

        throw new DataException("BranchOffer_Create did not return an offer row.");
    }

    public async Task<BranchOfferResponse> UpdateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, UpdateBranchOfferRequest request, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.BranchOfferUpdate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@BranchOfferId", branchOfferId);
        AddOfferParameters(command, request.Title, request.Subtitle, request.DiscountText, request.ImageUrl, request.ImageAltText, request.DisplayOrder, request.StartsAtUtc, request.EndsAtUtc, request.DiscountTypeCode, request.DiscountValue, request.MinimumOrderAmount, request.MaxDiscountAmount, request.AutoApply, request.PromoCode, request.RequiresPromoCode, request.MaxTotalRedemptions, request.MaxRedemptionsPerCustomer, request.MaxRedemptionsPerDay);
        command.AddBool("@IsActive", request.IsActive);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadOffer(reader);
        }

        throw new DataException("BranchOffer_Update did not return an offer row.");
    }

    public async Task<IReadOnlyCollection<BranchOfferResponse>> GetListByBranchAsync(Guid tenantId, Guid branchId, bool includeInactive, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.BranchOfferGetListByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddBool("@IncludeInactive", includeInactive);

        var offers = new List<BranchOfferResponse>();
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                offers.Add(ReadOffer(reader));
            }
        }

        return await AttachAnalyticsAsync(connection, tenantId, branchId, offers, cancellationToken);
    }

    public async Task<IReadOnlyCollection<PublicMenuOfferResponse>> GetPublicByQrTokenAsync(string qrToken, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.PublicOffersGetByQrToken, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddString("@QrToken", qrToken, 80);

        var offers = new List<PublicMenuOfferResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            offers.Add(new PublicMenuOfferResponse(
                reader.GetGuid(reader.GetOrdinal("BranchOfferId")),
                reader.GetString(reader.GetOrdinal("Title")),
                GetNullableString(reader, "Subtitle"),
                GetNullableString(reader, "DiscountText"),
                GetNullableString(reader, "ImageUrl"),
                GetNullableString(reader, "ImageAltText"),
                reader.GetInt32(reader.GetOrdinal("DisplayOrder")),
                reader.GetString(reader.GetOrdinal("DiscountTypeCode")),
                reader.GetDecimal(reader.GetOrdinal("DiscountValue")),
                reader.GetDecimal(reader.GetOrdinal("MinimumOrderAmount")),
                GetNullableDecimal(reader, "MaxDiscountAmount"),
                reader.GetBoolean(reader.GetOrdinal("AutoApply")),
                GetNullableString(reader, "PromoCode"),
                reader.GetBoolean(reader.GetOrdinal("RequiresPromoCode"))));
        }

        return offers;
    }

    public async Task DeactivateAsync(Guid tenantId, Guid branchId, Guid branchOfferId, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.BranchOfferDeactivate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@BranchOfferId", branchOfferId);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static void AddOfferParameters(
        NpgsqlCommand command,
        string title,
        string? subtitle,
        string? discountText,
        string? imageUrl,
        string? imageAltText,
        int displayOrder,
        DateTime? startsAtUtc,
        DateTime? endsAtUtc,
        string discountTypeCode,
        decimal discountValue,
        decimal minimumOrderAmount,
        decimal? maxDiscountAmount,
        bool autoApply,
        string? promoCode,
        bool requiresPromoCode,
        int? maxTotalRedemptions,
        int? maxRedemptionsPerCustomer,
        int? maxRedemptionsPerDay)
    {
        command.AddString("@Title", title, 160);
        command.AddString("@Subtitle", subtitle, 300);
        command.AddString("@DiscountText", discountText, 80);
        command.AddString("@ImageUrl", imageUrl, 1000);
        command.AddString("@ImageAltText", imageAltText, 200);
        command.AddInt("@DisplayOrder", displayOrder);
        AddNullableDateTime(command, "@StartsAtUtc", startsAtUtc);
        AddNullableDateTime(command, "@EndsAtUtc", endsAtUtc);
        command.AddString("@DiscountTypeCode", discountTypeCode, 32);
        command.AddDecimal("@DiscountValue", discountValue, 10, 2);
        command.AddDecimal("@MinimumOrderAmount", minimumOrderAmount, 10, 2);
        AddNullableDecimal(command, "@MaxDiscountAmount", maxDiscountAmount, 10, 2);
        command.AddBool("@AutoApply", autoApply);
        command.AddString("@PromoCode", promoCode, 40);
        command.AddBool("@RequiresPromoCode", requiresPromoCode);
        AddNullableInt(command, "@MaxTotalRedemptions", maxTotalRedemptions);
        AddNullableInt(command, "@MaxRedemptionsPerCustomer", maxRedemptionsPerCustomer);
        AddNullableInt(command, "@MaxRedemptionsPerDay", maxRedemptionsPerDay);
    }

    private static BranchOfferResponse ReadOffer(NpgsqlDataReader reader)
    {
        return new BranchOfferResponse(
            reader.GetGuid(reader.GetOrdinal("BranchOfferId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetString(reader.GetOrdinal("Title")),
            GetNullableString(reader, "Subtitle"),
            GetNullableString(reader, "DiscountText"),
            GetNullableString(reader, "ImageUrl"),
            GetNullableString(reader, "ImageAltText"),
            reader.GetInt32(reader.GetOrdinal("DisplayOrder")),
            reader.GetBoolean(reader.GetOrdinal("IsActive")),
            GetNullableDateTime(reader, "StartsAtUtc"),
            GetNullableDateTime(reader, "EndsAtUtc"),
            reader.GetString(reader.GetOrdinal("DiscountTypeCode")),
            reader.GetDecimal(reader.GetOrdinal("DiscountValue")),
            reader.GetDecimal(reader.GetOrdinal("MinimumOrderAmount")),
            GetNullableDecimal(reader, "MaxDiscountAmount"),
            reader.GetBoolean(reader.GetOrdinal("AutoApply")),
            GetNullableString(reader, "PromoCode"),
            reader.GetBoolean(reader.GetOrdinal("RequiresPromoCode")),
            GetNullableInt(reader, "MaxTotalRedemptions"),
            GetNullableInt(reader, "MaxRedemptionsPerCustomer"),
            GetNullableInt(reader, "MaxRedemptionsPerDay"),
            GetIntOrDefault(reader, "TotalRedemptions"),
            GetDecimalOrDefault(reader, "TotalDiscountAmount"),
            GetDecimalOrDefault(reader, "TotalRevenueAmount"),
            GetDecimalOrDefault(reader, "AverageOrderValue"),
            GetNullableDateTime(reader, "LastRedeemedAtUtc"),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            GetNullableDateTime(reader, "UpdatedAtUtc"));
    }

    private static async Task<IReadOnlyCollection<BranchOfferResponse>> AttachAnalyticsAsync(
        NpgsqlConnection connection,
        Guid tenantId,
        Guid branchId,
        IReadOnlyCollection<BranchOfferResponse> offers,
        CancellationToken cancellationToken)
    {
        if (offers.Count == 0)
        {
            return offers;
        }

        await using var command = new NpgsqlCommand(
            @"SELECT ""BranchOfferId"",
                     COUNT(*)::int ""TotalRedemptions"",
                     COALESCE(SUM(""DiscountAmount""),0) ""TotalDiscountAmount"",
                     COALESCE(SUM(""FinalTotalAmount""),0) ""TotalRevenueAmount"",
                     COALESCE(AVG(""FinalTotalAmount""),0) ""AverageOrderValue"",
                     MAX(""RedeemedAtUtc"") ""LastRedeemedAtUtc""
              FROM ""BranchOfferRedemptions""
              WHERE ""TenantId""=@tenantId AND ""BranchId""=@branchId
              GROUP BY ""BranchOfferId""",
            connection);
        command.Parameters.Add("tenantId", NpgsqlDbType.Uuid).Value = tenantId;
        command.Parameters.Add("branchId", NpgsqlDbType.Uuid).Value = branchId;

        var analytics = new Dictionary<Guid, (int Total, decimal Discount, decimal Revenue, decimal Average, DateTime? Last)>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            analytics[reader.GetGuid(reader.GetOrdinal("BranchOfferId"))] = (
                reader.GetInt32(reader.GetOrdinal("TotalRedemptions")),
                reader.GetDecimal(reader.GetOrdinal("TotalDiscountAmount")),
                reader.GetDecimal(reader.GetOrdinal("TotalRevenueAmount")),
                reader.GetDecimal(reader.GetOrdinal("AverageOrderValue")),
                reader.IsDBNull(reader.GetOrdinal("LastRedeemedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("LastRedeemedAtUtc")));
        }

        return offers
            .Select(offer => analytics.TryGetValue(offer.BranchOfferId, out var item)
                ? offer with
                {
                    TotalRedemptions = item.Total,
                    TotalDiscountAmount = item.Discount,
                    TotalRevenueAmount = item.Revenue,
                    AverageOrderValue = item.Average,
                    LastRedeemedAtUtc = item.Last
                }
                : offer)
            .ToArray();
    }

    private static void AddNullableDateTime(NpgsqlCommand command, string name, DateTime? value)
    {
        var parameter = command.Parameters.Add(NpgsqlCommandExtensions.ToPostgresParameterName(name), NpgsqlDbType.TimestampTz);
        parameter.Value = value.HasValue ? AppTime.ToPostgresTimestamp(value.Value) : DBNull.Value;
    }

    private static void AddNullableDecimal(NpgsqlCommand command, string name, decimal? value, byte precision, byte scale)
    {
        var parameter = command.Parameters.Add(NpgsqlCommandExtensions.ToPostgresParameterName(name), NpgsqlDbType.Numeric);
        parameter.Precision = precision;
        parameter.Scale = scale;
        parameter.Value = value.HasValue ? value.Value : DBNull.Value;
    }

    private static void AddNullableInt(NpgsqlCommand command, string name, int? value)
    {
        var parameter = command.Parameters.Add(NpgsqlCommandExtensions.ToPostgresParameterName(name), NpgsqlDbType.Integer);
        parameter.Value = value.HasValue ? value.Value : DBNull.Value;
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

    private static decimal? GetNullableDecimal(NpgsqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetDecimal(ordinal);
    }

    private static int? GetNullableInt(NpgsqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetInt32(ordinal);
    }

    private static int GetIntOrDefault(NpgsqlDataReader reader, string name)
    {
        return HasColumn(reader, name) && !reader.IsDBNull(reader.GetOrdinal(name)) ? reader.GetInt32(reader.GetOrdinal(name)) : 0;
    }

    private static decimal GetDecimalOrDefault(NpgsqlDataReader reader, string name)
    {
        return HasColumn(reader, name) && !reader.IsDBNull(reader.GetOrdinal(name)) ? reader.GetDecimal(reader.GetOrdinal(name)) : 0;
    }

    private static bool HasColumn(NpgsqlDataReader reader, string name)
    {
        for (var i = 0; i < reader.FieldCount; i++)
        {
            if (string.Equals(reader.GetName(i), name, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}
