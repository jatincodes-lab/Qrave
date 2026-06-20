using System.Data;
using Npgsql;
using QRApp.Application.Feedback;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Feedback;

public sealed class SqlFeedbackRepository(INpgsqlConnectionFactory connectionFactory) : IFeedbackRepository
{
    public async Task<OrderFeedbackResponse> CreatePublicAsync(
        string qrToken,
        Guid orderId,
        Guid orderFeedbackId,
        CreateOrderFeedbackRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsurePublicFeedbackSchemaAsync(connection, cancellationToken);
        await using var command = new NpgsqlCommand(
            """
            WITH order_context AS (
                SELECT
                    o."TenantId",
                    o."BranchId",
                    o."OrderId",
                    o."CustomerName",
                    o."CustomerWhatsApp",
                    NULL::uuid AS "CustomerId"
                FROM "Orders" o
                JOIN "BranchTables" bt ON bt."TableId" = o."TableId"
                WHERE o."OrderId" = @OrderId
                  AND bt."QrToken" = @QrToken
            ),
            updated AS (
                UPDATE "OrderFeedback" f
                SET
                    "Rating" = @Rating,
                    "Comment" = @Comment,
                    "CustomerName" = order_context."CustomerName",
                    "CustomerWhatsApp" = order_context."CustomerWhatsApp"
                FROM order_context
                WHERE f."OrderId" = @OrderId
                RETURNING f.*
            ),
            inserted AS (
                INSERT INTO "OrderFeedback" (
                    "OrderFeedbackId",
                    "TenantId",
                    "BranchId",
                    "OrderId",
                    "Rating",
                    "Comment",
                    "CustomerName",
                    "CustomerWhatsApp"
                )
                SELECT
                    @OrderFeedbackId,
                    order_context."TenantId",
                    order_context."BranchId",
                    @OrderId,
                    @Rating,
                    @Comment,
                    order_context."CustomerName",
                    order_context."CustomerWhatsApp"
                FROM order_context
                WHERE NOT EXISTS (SELECT 1 FROM updated)
                RETURNING *
            ),
            saved AS (
                SELECT * FROM updated
                UNION ALL
                SELECT * FROM inserted
            )
            SELECT
                saved."OrderFeedbackId",
                saved."TenantId",
                saved."BranchId",
                saved."OrderId",
                order_context."CustomerId",
                saved."Rating",
                saved."Comment",
                saved."CreatedAtUtc"
            FROM saved
            JOIN order_context ON order_context."OrderId" = saved."OrderId";
            """,
            connection);

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@OrderId", orderId);
        command.AddGuid("@OrderFeedbackId", orderFeedbackId);
        command.AddInt("@Rating", request.Rating);
        command.AddString("@Comment", request.Comment, 500);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("OrderFeedback_CreateFromQrToken did not return a row.");
        }

        return ReadPublic(reader);
    }

    public async Task<OrderFeedbackResponse?> GetPublicByOrderAsync(string qrToken, Guid orderId, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsurePublicFeedbackSchemaAsync(connection, cancellationToken);
        await using var command = new NpgsqlCommand(
            """
            SELECT
                f."OrderFeedbackId",
                f."TenantId",
                f."BranchId",
                f."OrderId",
                NULL::uuid AS "CustomerId",
                f."Rating",
                f."Comment",
                f."CreatedAtUtc"
            FROM "OrderFeedback" f
            JOIN "Orders" o ON o."OrderId" = f."OrderId"
            JOIN "BranchTables" bt ON bt."TableId" = o."TableId"
            WHERE f."OrderId" = @OrderId
              AND bt."QrToken" = @QrToken;
            """,
            connection);

        command.AddString("@QrToken", qrToken, 80);
        command.AddGuid("@OrderId", orderId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadPublic(reader) : null;
    }

    public async Task<IReadOnlyCollection<AdminFeedbackResponse>> GetAdminListAsync(Guid tenantId, Guid? branchId, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.AdminFeedbackGetList, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddNullableGuid("@BranchId", branchId);

        var feedback = new List<AdminFeedbackResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            feedback.Add(new AdminFeedbackResponse(
                reader.GetGuid(reader.GetOrdinal("OrderFeedbackId")),
                reader.GetGuid(reader.GetOrdinal("TenantId")),
                reader.GetGuid(reader.GetOrdinal("BranchId")),
                reader.GetString(reader.GetOrdinal("BranchName")),
                reader.GetGuid(reader.GetOrdinal("OrderId")),
                reader.GetString(reader.GetOrdinal("TableName")),
                GetNullableGuid(reader, "CustomerId"),
                GetNullableString(reader, "CustomerName"),
                GetNullableString(reader, "CustomerWhatsApp"),
                reader.GetInt32(reader.GetOrdinal("Rating")),
                GetNullableString(reader, "Comment"),
                reader.GetDateTime(reader.GetOrdinal("OrderCreatedAtUtc")),
                reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc"))));
        }

        return feedback;
    }

    private static OrderFeedbackResponse ReadPublic(NpgsqlDataReader reader)
    {
        return new OrderFeedbackResponse(
            reader.GetGuid(reader.GetOrdinal("OrderFeedbackId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetGuid(reader.GetOrdinal("OrderId")),
            GetNullableGuid(reader, "CustomerId"),
            reader.GetInt32(reader.GetOrdinal("Rating")),
            GetNullableString(reader, "Comment"),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")));
    }

    private static async Task EnsurePublicFeedbackSchemaAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            """
            CREATE TABLE IF NOT EXISTS "OrderFeedback" (
                "OrderFeedbackId" uuid PRIMARY KEY,
                "RowId" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
                "TenantId" uuid NOT NULL REFERENCES "Tenants" ("TenantId"),
                "BranchId" uuid NOT NULL REFERENCES "Branches" ("BranchId"),
                "OrderId" uuid NOT NULL REFERENCES "Orders" ("OrderId"),
                "Rating" integer NOT NULL CHECK ("Rating" BETWEEN 1 AND 5),
                "Comment" varchar(1000) NULL,
                "CustomerName" varchar(120) NULL,
                "CustomerWhatsApp" varchar(32) NULL,
                "CreatedAtUtc" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_OrderFeedback_OrderId" UNIQUE ("OrderId")
            );

            ALTER TABLE "OrderFeedback" ADD COLUMN IF NOT EXISTS "OrderFeedbackId" uuid;
            ALTER TABLE "OrderFeedback" ADD COLUMN IF NOT EXISTS "TenantId" uuid;
            ALTER TABLE "OrderFeedback" ADD COLUMN IF NOT EXISTS "BranchId" uuid;
            ALTER TABLE "OrderFeedback" ADD COLUMN IF NOT EXISTS "OrderId" uuid;
            ALTER TABLE "OrderFeedback" ADD COLUMN IF NOT EXISTS "Rating" integer;
            ALTER TABLE "OrderFeedback" ADD COLUMN IF NOT EXISTS "Comment" varchar(1000) NULL;
            ALTER TABLE "OrderFeedback" ADD COLUMN IF NOT EXISTS "CustomerName" varchar(120) NULL;
            ALTER TABLE "OrderFeedback" ADD COLUMN IF NOT EXISTS "CustomerWhatsApp" varchar(32) NULL;
            ALTER TABLE "OrderFeedback" ADD COLUMN IF NOT EXISTS "CreatedAtUtc" timestamptz NOT NULL DEFAULT now();
            CREATE UNIQUE INDEX IF NOT EXISTS "UX_OrderFeedback_OrderId" ON "OrderFeedback" ("OrderId");
            """,
            connection);

        await command.ExecuteNonQueryAsync(cancellationToken);
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
