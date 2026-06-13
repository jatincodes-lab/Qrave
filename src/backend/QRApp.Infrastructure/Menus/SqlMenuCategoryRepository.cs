using System.Data;
using Npgsql;
using QRApp.Application.Menus;
using QRApp.Infrastructure.Data;

namespace QRApp.Infrastructure.Menus;

public sealed class SqlMenuCategoryRepository(INpgsqlConnectionFactory connectionFactory) : IMenuCategoryRepository
{
    public async Task<MenuCategoryResponse> CreateAsync(
        Guid tenantId,
        Guid branchId,
        Guid menuCategoryId,
        CreateMenuCategoryRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.MenuCategoryCreate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        AddCategoryParameters(command, tenantId, branchId, menuCategoryId, request.Name, request.DisplayOrder);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadCategory(reader);
        }

        throw new DataException("MenuCategory_Create did not return a category row.");
    }

    public async Task<MenuCategoryResponse> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        Guid menuCategoryId,
        UpdateMenuCategoryRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.MenuCategoryUpdate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        AddCategoryParameters(command, tenantId, branchId, menuCategoryId, request.Name, request.DisplayOrder);
        command.AddBool("@IsActive", request.IsActive);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadCategory(reader);
        }

        throw new DataException("MenuCategory_Update did not return a category row.");
    }

    public async Task<IReadOnlyCollection<MenuCategoryResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.MenuCategoryGetListByBranch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddBool("@IncludeInactive", includeInactive);

        var categories = new List<MenuCategoryResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            categories.Add(ReadCategory(reader));
        }

        return categories;
    }

    public async Task DeactivateAsync(Guid tenantId, Guid branchId, Guid menuCategoryId, CancellationToken cancellationToken)
    {
        await using var connection = (NpgsqlConnection)connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(StoredProcedures.MenuCategoryDeactivate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@MenuCategoryId", menuCategoryId);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static void AddCategoryParameters(
        NpgsqlCommand command,
        Guid tenantId,
        Guid branchId,
        Guid menuCategoryId,
        string name,
        int displayOrder)
    {
        command.AddGuid("@TenantId", tenantId);
        command.AddGuid("@BranchId", branchId);
        command.AddGuid("@MenuCategoryId", menuCategoryId);
        command.AddString("@Name", name, 120);
        command.AddInt("@DisplayOrder", displayOrder);
    }

    private static MenuCategoryResponse ReadCategory(NpgsqlDataReader reader)
    {
        return new MenuCategoryResponse(
            reader.GetGuid(reader.GetOrdinal("MenuCategoryId")),
            reader.GetGuid(reader.GetOrdinal("TenantId")),
            reader.GetGuid(reader.GetOrdinal("BranchId")),
            reader.GetString(reader.GetOrdinal("Name")),
            reader.GetInt32(reader.GetOrdinal("DisplayOrder")),
            reader.GetBoolean(reader.GetOrdinal("IsActive")),
            reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")),
            reader.IsDBNull(reader.GetOrdinal("UpdatedAtUtc")) ? null : reader.GetDateTime(reader.GetOrdinal("UpdatedAtUtc")));
    }
}

