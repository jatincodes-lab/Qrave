using System.Text.Json;
using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Menus;

public sealed class MenuItemService(IMenuItemRepository repository) : IMenuItemService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly HashSet<string> ValidDietTypeCodes = new(StringComparer.Ordinal)
    {
        "Unspecified",
        "Veg",
        "NonVeg",
        "Vegan",
        "Egg",
        "Jain"
    };
    public async Task<OperationResult<MenuItemResponse>> CreateAsync(
        Guid tenantId,
        Guid branchId,
        CreateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request.MenuCategoryId, request.Name, request.Description, request.Price, request.DietTypeCode, request.DisplayOrder, request.ImageUrl, request.ImageAltText, request.Variants);
        if (errors.Count > 0)
        {
            return OperationResult<MenuItemResponse>.Failed(errors.ToArray());
        }

        var cleaned = new CreateMenuItemRequest(
            request.MenuCategoryId,
            TextRules.CleanRequired(request.Name),
            TextRules.CleanOptional(request.Description),
            request.Price,
            NormalizeDietTypeCode(request.DietTypeCode),
            request.IsAvailable,
            request.DisplayOrder,
            TextRules.CleanOptional(request.ImageUrl),
            TextRules.CleanOptional(request.ImageAltText),
            CleanVariants(request.Variants));

        var item = await repository.CreateAsync(tenantId, branchId, Guid.NewGuid(), cleaned, cancellationToken);
        return OperationResult<MenuItemResponse>.Success(item);
    }

    public async Task<OperationResult<MenuItemResponse>> UpdateAsync(
        Guid tenantId,
        Guid branchId,
        Guid menuItemId,
        UpdateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request.MenuCategoryId, request.Name, request.Description, request.Price, request.DietTypeCode, request.DisplayOrder, request.ImageUrl, request.ImageAltText, request.Variants);
        if (errors.Count > 0)
        {
            return OperationResult<MenuItemResponse>.Failed(errors.ToArray());
        }

        var cleaned = new UpdateMenuItemRequest(
            request.MenuCategoryId,
            TextRules.CleanRequired(request.Name),
            TextRules.CleanOptional(request.Description),
            request.Price,
            NormalizeDietTypeCode(request.DietTypeCode),
            request.IsAvailable,
            request.IsActive,
            request.DisplayOrder,
            TextRules.CleanOptional(request.ImageUrl),
            TextRules.CleanOptional(request.ImageAltText),
            CleanVariants(request.Variants));

        var item = await repository.UpdateAsync(tenantId, branchId, menuItemId, cleaned, cancellationToken);
        return OperationResult<MenuItemResponse>.Success(item);
    }

    public Task<IReadOnlyCollection<MenuItemResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        return repository.GetListByBranchAsync(tenantId, branchId, includeInactive, cancellationToken);
    }

    public Task DeactivateAsync(Guid tenantId, Guid branchId, Guid menuItemId, CancellationToken cancellationToken)
    {
        return repository.DeactivateAsync(tenantId, branchId, menuItemId, cancellationToken);
    }

    public async Task<PublicMenuResponse?> GetPublicMenuByBranchAsync(Guid branchId, CancellationToken cancellationToken)
    {
        var rows = await repository.GetPublicMenuByBranchAsync(branchId, cancellationToken);
        var first = rows.FirstOrDefault();
        if (first is null)
        {
            return null;
        }

        var categories = rows
            .GroupBy(row => new { row.MenuCategoryId, row.CategoryName, row.CategoryDisplayOrder })
            .Select(group => new PublicMenuCategoryResponse(
                group.Key.MenuCategoryId,
                group.Key.CategoryName,
                group.Key.CategoryDisplayOrder,
                group.Select(row => new PublicMenuItemResponse(
                    row.MenuItemId,
                    row.ItemName,
                    row.Description,
                    row.Price,
                    row.DietTypeCode,
                    row.ItemDisplayOrder,
                    row.ImageUrl,
                    row.ImageAltText,
                    ReadPublicVariants(row.VariantsJson))).ToArray()))
            .ToArray();

        return new PublicMenuResponse(first.BranchId, first.BranchName, first.BranchLogoUrl, categories);
    }

    private static List<ValidationFailure> Validate(
        Guid menuCategoryId,
        string name,
        string? description,
        decimal price,
        string? dietTypeCode,
        int displayOrder,
        string? imageUrl,
        string? imageAltText,
        IReadOnlyCollection<MenuItemVariantRequest>? variants)
    {
        var errors = new List<ValidationFailure>();
        var cleanName = TextRules.CleanRequired(name);
        var cleanDescription = TextRules.CleanOptional(description);

        if (menuCategoryId == Guid.Empty)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.MenuCategoryId), "Menu category is required."));
        }

        if (cleanName.Length is < 2 or > 160)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.Name), "Menu item name must be between 2 and 160 characters."));
        }

        if (cleanDescription?.Length > 1000)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.Description), "Menu item description cannot exceed 1000 characters."));
        }

        if (TextRules.CleanOptional(imageUrl)?.Length > 1000)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.ImageUrl), "Menu item image URL cannot exceed 1000 characters."));
        }

        if (TextRules.CleanOptional(imageAltText)?.Length > 200)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.ImageAltText), "Menu item image alt text cannot exceed 200 characters."));
        }

        if (price is < 0 or > 99999999.99m)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.Price), "Menu item price must be between 0 and 99999999.99."));
        }

        if (!ValidDietTypeCodes.Contains(NormalizeDietTypeCode(dietTypeCode)))
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.DietTypeCode), "Food type is invalid."));
        }

        if (displayOrder < 0)
        {
            errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.DisplayOrder), "Display order cannot be negative."));
        }

        if (variants is { Count: > 0 })
        {
            if (variants.Count > 20)
            {
                errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.Variants), "A menu item cannot have more than 20 variants."));
            }

            foreach (var variant in variants)
            {
                var cleanVariantName = TextRules.CleanRequired(variant.Name);
                if (cleanVariantName.Length is < 1 or > 80)
                {
                    errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.Variants), "Variant name must be between 1 and 80 characters."));
                }

                if (variant.Price is < 0 or > 99999999.99m)
                {
                    errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.Variants), "Variant price must be between 0 and 99999999.99."));
                }

                if (variant.DisplayOrder < 0)
                {
                    errors.Add(new ValidationFailure(nameof(CreateMenuItemRequest.Variants), "Variant display order cannot be negative."));
                }
            }
        }

        return errors;
    }

    private static IReadOnlyCollection<MenuItemVariantRequest> CleanVariants(IReadOnlyCollection<MenuItemVariantRequest>? variants)
    {
        return variants?
            .Select(variant => new MenuItemVariantRequest(
                variant.MenuItemVariantId,
                TextRules.CleanRequired(variant.Name),
                variant.Price,
                variant.IsAvailable,
                variant.DisplayOrder))
            .ToArray() ?? Array.Empty<MenuItemVariantRequest>();
    }

    private static string NormalizeDietTypeCode(string? dietTypeCode)
    {
        return string.IsNullOrWhiteSpace(dietTypeCode) ? "Unspecified" : dietTypeCode.Trim();
    }

    private static IReadOnlyCollection<PublicMenuItemVariantResponse> ReadPublicVariants(string? variantsJson)
    {
        if (string.IsNullOrWhiteSpace(variantsJson))
        {
            return Array.Empty<PublicMenuItemVariantResponse>();
        }

        return JsonSerializer.Deserialize<PublicMenuItemVariantResponse[]>(variantsJson, JsonOptions) ?? Array.Empty<PublicMenuItemVariantResponse>();
    }
}
