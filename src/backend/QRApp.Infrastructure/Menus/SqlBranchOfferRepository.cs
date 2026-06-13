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
        AddOfferParameters(command, request.Title, request.Subtitle, request.DiscountText, request.ImageUrl, request.ImageAltText, request.DisplayOrder, request.StartsAtUtc, request.EndsAtUtc, request.DiscountTypeCode, request.DiscountValue, request.MinimumOrderAmount, request.MaxDiscountAmount, request.AutoApply);

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
        AddOfferParameters(command, request.Title, request.Subtitle, request.DiscountText, request.ImageUrl, request.ImageAltText, request.DisplayOrder, request.StartsAtUtc, request.EndsAtUtc, request.DiscountTypeCode, request.DiscountValue, request.MinimumOrderAmount, request.MaxDiscountAmount, request.AutoApply);
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
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            offers.Add(ReadOffer(reader));
        }

        return offers;
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
                reader.GetBoolean(reader.GetOrdinal("AutoApply"))));
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
        bool autoApply)
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
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            GetNullableDateTime(reader, "UpdatedAtUtc"));
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
}
