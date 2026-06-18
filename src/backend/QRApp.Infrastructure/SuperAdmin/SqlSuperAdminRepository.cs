using System.Data;
using Npgsql;
using NpgsqlTypes;
using QRApp.Application.SuperAdmin;
using QRApp.Application.Tenants;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.SuperAdmin;

public sealed class SqlSuperAdminRepository(INpgsqlConnectionFactory connectionFactory) : ISuperAdminRepository
{
    public async Task<bool> HasAnySuperAdminAsync(CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(@"SELECT EXISTS (SELECT 1 FROM ""SuperAdminUsers"" WHERE ""IsActive"")", connection);
        return (bool)(await command.ExecuteScalarAsync(cancellationToken) ?? false);
    }

    public async Task<SuperAdminLoginRecord?> GetUserByEmailAsync(string email, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            @"SELECT ""SuperAdminUserId"",""Email"",""DisplayName"",""PasswordHash"",""RoleCode"",""IsActive""
              FROM ""SuperAdminUsers""
              WHERE lower(""Email"") = lower(@email)
              LIMIT 1", connection);
        command.Parameters.AddWithValue("email", email);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadLoginRecord(reader) : null;
    }

    public async Task<SuperAdminLoginRecord> CreateUserAsync(
        Guid superAdminUserId,
        SuperAdminBootstrapRequest request,
        string passwordHash,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            @"INSERT INTO ""SuperAdminUsers"" (""SuperAdminUserId"",""Email"",""DisplayName"",""PasswordHash"",""RoleCode"")
              VALUES (@id,@email,@displayName,@passwordHash,'super_admin')
              RETURNING ""SuperAdminUserId"",""Email"",""DisplayName"",""PasswordHash"",""RoleCode"",""IsActive""", connection);
        command.Parameters.AddWithValue("id", superAdminUserId);
        command.Parameters.AddWithValue("email", request.Email);
        command.Parameters.AddWithValue("displayName", request.DisplayName);
        command.Parameters.AddWithValue("passwordHash", passwordHash);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadLoginRecord(reader);
        }

        throw new DataException("Super admin user insert did not return a row.");
    }

    public async Task<SuperAdminDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var stats = await ReadDashboardStatsAsync(connection, cancellationToken);
        var recent = await ReadRestaurantListAsync(connection, RestaurantListSql + @" ORDER BY t.""CreatedAtUtc"" DESC LIMIT 8", null, null, null, cancellationToken);
        var attention = await ReadRestaurantListAsync(
            connection,
            RestaurantListSql + @" WHERE t.""SubscriptionStatusCode"" IN ('Expired','PastDue','Suspended','Cancelled') OR t.""AccountStatusCode""='Inactive' OR (t.""SubscriptionStatusCode""='Trialing' AND t.""TrialEndAtUtc"" < public.app_now()) ORDER BY t.""TrialEndAtUtc"" NULLS LAST, t.""CreatedAtUtc"" DESC LIMIT 8",
            null,
            null,
            null,
            cancellationToken);
        var audit = await ReadAuditEntriesAsync(connection, null, 8, cancellationToken);

        return stats with
        {
            RecentRestaurants = recent,
            NeedsAttention = attention,
            RecentActions = audit
        };
    }

    public async Task<IReadOnlyCollection<SuperAdminRestaurantListItem>> SearchRestaurantsAsync(
        string? search,
        string? status,
        string? plan,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add(@"(t.""Name"" ILIKE @search OR t.""Slug"" ILIKE @search OR t.""OwnerEmail"" ILIKE @search OR owner.""DisplayName"" ILIKE @search)");
        }

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            where.Add(@"t.""SubscriptionStatusCode"" = @status");
        }

        if (!string.IsNullOrWhiteSpace(plan) && !string.Equals(plan, "all", StringComparison.OrdinalIgnoreCase))
        {
            where.Add(@"t.""PlanCode"" = @plan");
        }

        var sql = RestaurantListSql +
                  (where.Count > 0 ? " WHERE " + string.Join(" AND ", where) : string.Empty) +
                  @" ORDER BY t.""CreatedAtUtc"" DESC LIMIT 250";

        return await ReadRestaurantListAsync(connection, sql, search, status, plan, cancellationToken);
    }

    public async Task<SuperAdminRestaurantDetailResponse?> GetRestaurantDetailAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var restaurants = await ReadRestaurantListAsync(connection, RestaurantListSql + @" WHERE t.""TenantId"" = @tenantId", null, null, null, cancellationToken, tenantId);
        var restaurant = restaurants.FirstOrDefault();
        if (restaurant is null)
        {
            return null;
        }

        var accessStatus = QRApp.Application.Tenants.TenantAccessRules.CreateStatus(
            restaurant.TenantId,
            restaurant.PlanCode,
            null,
            restaurant.TrialEndAtUtc,
            restaurant.SubscriptionStatusCode,
            restaurant.AccountStatusCode,
            restaurant.IsTenantActive,
            DateTime.UtcNow);

        var branches = await ReadBranchesAsync(connection, tenantId, cancellationToken);
        var staff = await ReadStaffAsync(connection, tenantId, cancellationToken);
        var orders = await ReadRecentOrdersAsync(connection, tenantId, cancellationToken);
        var audit = await ReadAuditEntriesAsync(connection, tenantId, 25, cancellationToken);
        var notes = await ReadInternalNotesAsync(connection, tenantId, cancellationToken);

        return new SuperAdminRestaurantDetailResponse(restaurant, accessStatus, branches, staff, orders, audit, notes);
    }

    public async Task<TenantSubscriptionResponse?> GetSubscriptionAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(SubscriptionSql + @" WHERE t.""TenantId""=@tenantId", connection);
        command.Parameters.AddWithValue("tenantId", tenantId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadSubscription(reader) : null;
    }

    public async Task<TenantSubscriptionResponse> UpdateSubscriptionAsync(
        Guid tenantId,
        SuperAdminUpdateSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            @"UPDATE ""Tenants""
              SET ""PlanCode""=@planCode,
                  ""SubscriptionStatusCode""=@subscriptionStatus,
                  ""AccountStatusCode""=@accountStatus,
                  ""TrialEndAtUtc""=@trialEndAtUtc,
                  ""SubscriptionNotes""=@notes,
                  ""SubscriptionUpdatedAtUtc""=public.app_now(),
                  ""UpdatedAtUtc""=public.app_now()
              WHERE ""TenantId""=@tenantId
              RETURNING ""TenantId""", connection);
        command.Parameters.AddWithValue("tenantId", tenantId);
        command.Parameters.AddWithValue("planCode", request.PlanCode);
        command.Parameters.AddWithValue("subscriptionStatus", request.SubscriptionStatusCode);
        command.Parameters.AddWithValue("accountStatus", request.AccountStatusCode);
        command.Parameters.Add("trialEndAtUtc", NpgsqlDbType.TimestampTz).Value = request.TrialEndAtUtc.HasValue ? AppTime.ToPostgresTimestamp(request.TrialEndAtUtc.Value) : DBNull.Value;
        command.Parameters.Add("notes", NpgsqlDbType.Text).Value = request.SubscriptionNotes is null ? DBNull.Value : request.SubscriptionNotes;

        var updatedTenantId = await command.ExecuteScalarAsync(cancellationToken);
        if (updatedTenantId is null)
        {
            throw new DataException("Tenant subscription update did not update a row.");
        }

        return await GetSubscriptionAsync(tenantId, cancellationToken) ?? throw new DataException("Updated tenant subscription could not be read.");
    }

    public async Task<SuperAdminInternalNoteResponse> CreateInternalNoteAsync(
        Guid tenantId,
        Guid superAdminUserId,
        string note,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            @"INSERT INTO ""SuperAdminInternalNotes"" (""SuperAdminInternalNoteId"",""TenantId"",""Note"",""CreatedBySuperAdminUserId"")
              VALUES (gen_random_uuid(),@tenantId,@note,@userId)
              RETURNING ""SuperAdminInternalNoteId"",""TenantId"",""Note"",""CreatedBySuperAdminUserId"",
                (SELECT ""Email"" FROM ""SuperAdminUsers"" WHERE ""SuperAdminUserId""=@userId) ""CreatedByEmail"",
                ""CreatedAtUtc""", connection);
        command.Parameters.AddWithValue("tenantId", tenantId);
        command.Parameters.AddWithValue("note", note);
        command.Parameters.AddWithValue("userId", superAdminUserId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadInternalNote(reader);
        }

        throw new DataException("Internal note insert did not return a row.");
    }

    public async Task AddAuditEntryAsync(
        Guid? tenantId,
        Guid superAdminUserId,
        string actionCode,
        string summary,
        string? metadataJson,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            @"INSERT INTO ""SuperAdminAuditEntries"" (""SuperAdminAuditEntryId"",""TenantId"",""SuperAdminUserId"",""ActionCode"",""Summary"",""MetadataJson"")
              VALUES (gen_random_uuid(),@tenantId,@userId,@actionCode,@summary,@metadataJson)", connection);
        command.Parameters.Add("tenantId", NpgsqlDbType.Uuid).Value = tenantId.HasValue ? tenantId.Value : DBNull.Value;
        command.Parameters.AddWithValue("userId", superAdminUserId);
        command.Parameters.AddWithValue("actionCode", actionCode);
        command.Parameters.AddWithValue("summary", summary);
        command.Parameters.Add("metadataJson", NpgsqlDbType.Text).Value = metadataJson is null ? DBNull.Value : metadataJson;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private const string RestaurantListSql = """
SELECT
  t."TenantId",t."Name",t."Slug",t."OwnerEmail",t."PlanCode",t."SubscriptionStatusCode",t."AccountStatusCode",t."IsActive" "IsTenantActive",t."TrialEndAtUtc",t."CreatedAtUtc",
  owner."DisplayName" "OwnerName",
  NULL::varchar "OwnerPhone",
  COALESCE(branch_counts."BranchCount",0) "BranchCount",
  COALESCE(staff_counts."StaffCount",0) "StaffCount",
  COALESCE(table_counts."TableCount",0) "TableCount",
  COALESCE(order_counts."OrderCount",0) "OrderCount",
  COALESCE(order_counts."RevenueTotal",0) "RevenueTotal",
  order_counts."LastOrderAtUtc"
FROM "Tenants" t
LEFT JOIN LATERAL (
  SELECT u."DisplayName"
  FROM "TenantUsers" tu JOIN "Users" u ON u."UserId"=tu."UserId"
  WHERE tu."TenantId"=t."TenantId" AND tu."RoleCode"='owner'
  ORDER BY tu."CreatedAtUtc"
  LIMIT 1
) owner ON true
LEFT JOIN LATERAL (SELECT count(*)::int "BranchCount" FROM "Branches" b WHERE b."TenantId"=t."TenantId" AND b."IsActive") branch_counts ON true
LEFT JOIN LATERAL (SELECT count(*)::int "StaffCount" FROM "TenantUsers" tu WHERE tu."TenantId"=t."TenantId" AND tu."IsActive") staff_counts ON true
LEFT JOIN LATERAL (SELECT count(*)::int "TableCount" FROM "BranchTables" bt WHERE bt."TenantId"=t."TenantId" AND bt."IsActive") table_counts ON true
LEFT JOIN LATERAL (SELECT count(*)::int "OrderCount", COALESCE(sum(o."TotalAmount"),0) "RevenueTotal", max(o."CreatedAtUtc") "LastOrderAtUtc" FROM "Orders" o WHERE o."TenantId"=t."TenantId") order_counts ON true
""";

    private const string SubscriptionSql = """
SELECT t."TenantId",t."Name",t."Slug",t."OwnerEmail",t."PlanCode",t."TrialStartAtUtc",t."TrialEndAtUtc",t."SubscriptionStatusCode",t."AccountStatusCode",t."IsActive" "IsTenantActive",t."SubscriptionUpdatedAtUtc",t."SubscriptionNotes"
FROM "Tenants" t
""";

    private static async Task<SuperAdminDashboardResponse> ReadDashboardStatsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            @"SELECT
                count(*)::int ""TotalRestaurants"",
                count(*) FILTER (WHERE ""AccountStatusCode""='Active' AND ""IsActive"")::int ""ActiveRestaurants"",
                count(*) FILTER (WHERE ""SubscriptionStatusCode""='Trialing')::int ""TrialRestaurants"",
                count(*) FILTER (WHERE ""SubscriptionStatusCode""='Trialing' AND ""TrialEndAtUtc"" < public.app_now())::int ""ExpiredTrials"",
                count(*) FILTER (WHERE ""SubscriptionStatusCode""='Suspended' OR ""AccountStatusCode""='Inactive')::int ""SuspendedRestaurants"",
                count(*) FILTER (WHERE ""SubscriptionStatusCode"" IN ('Active','ManualActive'))::int ""PaidRestaurants"",
                count(*) FILTER (WHERE ""CreatedAtUtc"" >= date_trunc('month', public.app_now()))::int ""NewRestaurantsThisMonth"",
                (SELECT count(*)::int FROM ""Branches"" WHERE ""IsActive"") ""TotalBranches"",
                (SELECT count(*)::int FROM ""BranchTables"" WHERE ""IsActive"") ""TotalTables"",
                (SELECT count(*)::int FROM ""Orders"") ""TotalOrders"",
                (SELECT COALESCE(sum(""TotalAmount""),0) FROM ""Orders"") ""TotalRevenue""
              FROM ""Tenants""", connection);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new DataException("Super admin dashboard stats did not return a row.");
        }

        return new SuperAdminDashboardResponse(
            reader.GetInt32(reader.GetOrdinal("TotalRestaurants")),
            reader.GetInt32(reader.GetOrdinal("ActiveRestaurants")),
            reader.GetInt32(reader.GetOrdinal("TrialRestaurants")),
            reader.GetInt32(reader.GetOrdinal("ExpiredTrials")),
            reader.GetInt32(reader.GetOrdinal("SuspendedRestaurants")),
            reader.GetInt32(reader.GetOrdinal("PaidRestaurants")),
            reader.GetInt32(reader.GetOrdinal("NewRestaurantsThisMonth")),
            reader.GetInt32(reader.GetOrdinal("TotalBranches")),
            reader.GetInt32(reader.GetOrdinal("TotalTables")),
            reader.GetInt32(reader.GetOrdinal("TotalOrders")),
            reader.GetDecimal(reader.GetOrdinal("TotalRevenue")),
            Array.Empty<SuperAdminRestaurantListItem>(),
            Array.Empty<SuperAdminRestaurantListItem>(),
            Array.Empty<SuperAdminAuditEntryResponse>());
    }

    private static async Task<IReadOnlyCollection<SuperAdminRestaurantListItem>> ReadRestaurantListAsync(
        NpgsqlConnection connection,
        string sql,
        string? search,
        string? status,
        string? plan,
        CancellationToken cancellationToken,
        Guid? tenantId = null)
    {
        await using var command = new NpgsqlCommand(sql, connection);
        if (!string.IsNullOrWhiteSpace(search))
        {
            command.Parameters.AddWithValue("search", $"%{search}%");
        }

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            command.Parameters.AddWithValue("status", status);
        }

        if (!string.IsNullOrWhiteSpace(plan) && !string.Equals(plan, "all", StringComparison.OrdinalIgnoreCase))
        {
            command.Parameters.AddWithValue("plan", plan);
        }

        if (tenantId.HasValue)
        {
            command.Parameters.AddWithValue("tenantId", tenantId.Value);
        }

        var items = new List<SuperAdminRestaurantListItem>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadRestaurant(reader));
        }

        return items;
    }

    private static async Task<IReadOnlyCollection<SuperAdminBranchSummary>> ReadBranchesAsync(NpgsqlConnection connection, Guid tenantId, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            @"SELECT b.""BranchId"",b.""Name"",b.""City"",b.""State"",b.""CountryCode"",b.""IsActive"",b.""CreatedAtUtc"",
                COALESCE((SELECT count(*)::int FROM ""BranchTables"" bt WHERE bt.""BranchId""=b.""BranchId"" AND bt.""IsActive""),0) ""TableCount"",
                COALESCE((SELECT count(*)::int FROM ""Orders"" o WHERE o.""BranchId""=b.""BranchId""),0) ""OrderCount""
              FROM ""Branches"" b WHERE b.""TenantId""=@tenantId ORDER BY b.""CreatedAtUtc"" DESC", connection);
        command.Parameters.AddWithValue("tenantId", tenantId);
        var items = new List<SuperAdminBranchSummary>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new SuperAdminBranchSummary(
                reader.GetGuid(reader.GetOrdinal("BranchId")),
                reader.GetString(reader.GetOrdinal("Name")),
                GetNullableString(reader, "City"),
                GetNullableString(reader, "State"),
                reader.GetString(reader.GetOrdinal("CountryCode")),
                reader.GetBoolean(reader.GetOrdinal("IsActive")),
                reader.GetInt32(reader.GetOrdinal("TableCount")),
                reader.GetInt32(reader.GetOrdinal("OrderCount")),
                reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc"))));
        }

        return items;
    }

    private static async Task<IReadOnlyCollection<SuperAdminStaffSummary>> ReadStaffAsync(NpgsqlConnection connection, Guid tenantId, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            @"SELECT u.""UserId"",u.""Email"",u.""DisplayName"",tu.""RoleCode"",b.""Name"" ""BranchName"",tu.""IsActive"",tu.""CreatedAtUtc""
              FROM ""TenantUsers"" tu
              JOIN ""Users"" u ON u.""UserId""=tu.""UserId""
              LEFT JOIN ""Branches"" b ON b.""BranchId""=tu.""BranchId""
              WHERE tu.""TenantId""=@tenantId
              ORDER BY tu.""CreatedAtUtc"" DESC", connection);
        command.Parameters.AddWithValue("tenantId", tenantId);
        var items = new List<SuperAdminStaffSummary>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new SuperAdminStaffSummary(
                reader.GetGuid(reader.GetOrdinal("UserId")),
                reader.GetString(reader.GetOrdinal("Email")),
                reader.GetString(reader.GetOrdinal("DisplayName")),
                reader.GetString(reader.GetOrdinal("RoleCode")),
                GetNullableString(reader, "BranchName"),
                reader.GetBoolean(reader.GetOrdinal("IsActive")),
                reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc"))));
        }

        return items;
    }

    private static async Task<IReadOnlyCollection<SuperAdminOrderSummary>> ReadRecentOrdersAsync(NpgsqlConnection connection, Guid tenantId, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            @"SELECT o.""OrderId"",b.""Name"" ""BranchName"",bt.""Name"" ""TableName"",o.""OrderStatusCode"",o.""CustomerName"",o.""TotalAmount"",o.""CreatedAtUtc""
              FROM ""Orders"" o
              JOIN ""Branches"" b ON b.""BranchId""=o.""BranchId""
              JOIN ""BranchTables"" bt ON bt.""TableId""=o.""TableId""
              WHERE o.""TenantId""=@tenantId
              ORDER BY o.""CreatedAtUtc"" DESC
              LIMIT 25", connection);
        command.Parameters.AddWithValue("tenantId", tenantId);
        var items = new List<SuperAdminOrderSummary>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new SuperAdminOrderSummary(
                reader.GetGuid(reader.GetOrdinal("OrderId")),
                reader.GetString(reader.GetOrdinal("BranchName")),
                reader.GetString(reader.GetOrdinal("TableName")),
                reader.GetString(reader.GetOrdinal("OrderStatusCode")),
                GetNullableString(reader, "CustomerName"),
                reader.GetDecimal(reader.GetOrdinal("TotalAmount")),
                reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc"))));
        }

        return items;
    }

    private static async Task<IReadOnlyCollection<SuperAdminAuditEntryResponse>> ReadAuditEntriesAsync(NpgsqlConnection connection, Guid? tenantId, int limit, CancellationToken cancellationToken)
    {
        var sql = @"SELECT a.""SuperAdminAuditEntryId"",a.""TenantId"",t.""Name"" ""TenantName"",a.""ActionCode"",a.""Summary"",a.""MetadataJson"",a.""SuperAdminUserId"",u.""Email"" ""SuperAdminEmail"",a.""CreatedAtUtc""
              FROM ""SuperAdminAuditEntries"" a
              JOIN ""SuperAdminUsers"" u ON u.""SuperAdminUserId""=a.""SuperAdminUserId""
              LEFT JOIN ""Tenants"" t ON t.""TenantId""=a.""TenantId""
              {0}
              ORDER BY a.""CreatedAtUtc"" DESC
              LIMIT @limit";
        await using var command = new NpgsqlCommand(string.Format(sql, tenantId.HasValue ? @"WHERE a.""TenantId""=@tenantId" : string.Empty), connection);
        if (tenantId.HasValue)
        {
            command.Parameters.Add("tenantId", NpgsqlDbType.Uuid).Value = tenantId.Value;
        }
        command.Parameters.AddWithValue("limit", limit);
        var items = new List<SuperAdminAuditEntryResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadAuditEntry(reader));
        }

        return items;
    }

    private static async Task<IReadOnlyCollection<SuperAdminInternalNoteResponse>> ReadInternalNotesAsync(NpgsqlConnection connection, Guid tenantId, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            @"SELECT n.""SuperAdminInternalNoteId"",n.""TenantId"",n.""Note"",n.""CreatedBySuperAdminUserId"",u.""Email"" ""CreatedByEmail"",n.""CreatedAtUtc""
              FROM ""SuperAdminInternalNotes"" n
              JOIN ""SuperAdminUsers"" u ON u.""SuperAdminUserId""=n.""CreatedBySuperAdminUserId""
              WHERE n.""TenantId""=@tenantId
              ORDER BY n.""CreatedAtUtc"" DESC
              LIMIT 25", connection);
        command.Parameters.AddWithValue("tenantId", tenantId);
        var items = new List<SuperAdminInternalNoteResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadInternalNote(reader));
        }

        return items;
    }

    private static SuperAdminLoginRecord ReadLoginRecord(NpgsqlDataReader reader)
    {
        return new SuperAdminLoginRecord(
            reader.GetGuid(reader.GetOrdinal("SuperAdminUserId")),
            reader.GetString(reader.GetOrdinal("Email")),
            reader.GetString(reader.GetOrdinal("DisplayName")),
            reader.GetString(reader.GetOrdinal("PasswordHash")),
            reader.GetString(reader.GetOrdinal("RoleCode")),
            reader.GetBoolean(reader.GetOrdinal("IsActive")));
    }

    private static SuperAdminRestaurantListItem ReadRestaurant(NpgsqlDataReader reader)
    {
        return new SuperAdminRestaurantListItem(
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetString(reader.GetOrdinal("Name")),
            reader.GetString(reader.GetOrdinal("Slug")),
            reader.GetString(reader.GetOrdinal("OwnerEmail")),
            GetNullableString(reader, "OwnerName"),
            GetNullableString(reader, "OwnerPhone"),
            reader.GetString(reader.GetOrdinal("PlanCode")),
            reader.GetString(reader.GetOrdinal("SubscriptionStatusCode")),
            reader.GetString(reader.GetOrdinal("AccountStatusCode")),
            reader.GetBoolean(reader.GetOrdinal("IsTenantActive")),
            GetNullableDateTime(reader, "TrialEndAtUtc"),
            reader.GetInt32(reader.GetOrdinal("BranchCount")),
            reader.GetInt32(reader.GetOrdinal("StaffCount")),
            reader.GetInt32(reader.GetOrdinal("TableCount")),
            reader.GetInt32(reader.GetOrdinal("OrderCount")),
            reader.GetDecimal(reader.GetOrdinal("RevenueTotal")),
            GetNullableDateTime(reader, "LastOrderAtUtc"),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")));
    }

    private static TenantSubscriptionResponse ReadSubscription(NpgsqlDataReader reader)
    {
        var tenantId = reader.GetGuid(reader.GetOrdinal("TenantId"));
        var planCode = reader.GetString(reader.GetOrdinal("PlanCode"));
        var trialStart = GetNullableDateTime(reader, "TrialStartAtUtc");
        var trialEnd = GetNullableDateTime(reader, "TrialEndAtUtc");
        var subscriptionStatus = reader.GetString(reader.GetOrdinal("SubscriptionStatusCode"));
        var accountStatus = reader.GetString(reader.GetOrdinal("AccountStatusCode"));
        var isActive = reader.GetBoolean(reader.GetOrdinal("IsTenantActive"));
        var access = QRApp.Application.Tenants.TenantAccessRules.CreateStatus(tenantId, planCode, trialStart, trialEnd, subscriptionStatus, accountStatus, isActive, DateTime.UtcNow);

        return new TenantSubscriptionResponse(
            tenantId,
            reader.GetString(reader.GetOrdinal("Name")),
            reader.GetString(reader.GetOrdinal("Slug")),
            reader.GetString(reader.GetOrdinal("OwnerEmail")),
            planCode,
            trialStart,
            trialEnd,
            subscriptionStatus,
            accountStatus,
            isActive,
            GetNullableDateTime(reader, "SubscriptionUpdatedAtUtc"),
            GetNullableString(reader, "SubscriptionNotes"),
            access);
    }

    private static SuperAdminAuditEntryResponse ReadAuditEntry(NpgsqlDataReader reader)
    {
        return new SuperAdminAuditEntryResponse(
            reader.GetGuid(reader.GetOrdinal("SuperAdminAuditEntryId")),
            GetNullableGuid(reader, "TenantId"),
            GetNullableString(reader, "TenantName"),
            reader.GetString(reader.GetOrdinal("ActionCode")),
            reader.GetString(reader.GetOrdinal("Summary")),
            GetNullableString(reader, "MetadataJson"),
            reader.GetGuid(reader.GetOrdinal("SuperAdminUserId")),
            reader.GetString(reader.GetOrdinal("SuperAdminEmail")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")));
    }

    private static SuperAdminInternalNoteResponse ReadInternalNote(NpgsqlDataReader reader)
    {
        return new SuperAdminInternalNoteResponse(
            reader.GetGuid(reader.GetOrdinal("SuperAdminInternalNoteId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetString(reader.GetOrdinal("Note")),
            reader.GetGuid(reader.GetOrdinal("CreatedBySuperAdminUserId")),
            reader.GetString(reader.GetOrdinal("CreatedByEmail")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")));
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

    private static string? GetNullableString(NpgsqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }
}
