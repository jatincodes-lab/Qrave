using QRApp.Application.Tenants;

namespace QRApp.Application.SuperAdmin;

public interface ISuperAdminRepository
{
    Task<bool> HasAnySuperAdminAsync(CancellationToken cancellationToken);

    Task<SuperAdminLoginRecord?> GetUserByEmailAsync(string email, CancellationToken cancellationToken);

    Task<SuperAdminLoginRecord> CreateUserAsync(
        Guid superAdminUserId,
        SuperAdminBootstrapRequest request,
        string passwordHash,
        CancellationToken cancellationToken);

    Task<SuperAdminDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken);

    Task<IReadOnlyCollection<SuperAdminRestaurantListItem>> SearchRestaurantsAsync(
        string? search,
        string? status,
        string? plan,
        CancellationToken cancellationToken);

    Task<SuperAdminRestaurantDetailResponse?> GetRestaurantDetailAsync(Guid tenantId, CancellationToken cancellationToken);

    Task<TenantSubscriptionResponse?> GetSubscriptionAsync(Guid tenantId, CancellationToken cancellationToken);

    Task<TenantSubscriptionResponse> UpdateSubscriptionAsync(
        Guid tenantId,
        SuperAdminUpdateSubscriptionRequest request,
        CancellationToken cancellationToken);

    Task<SuperAdminInternalNoteResponse> CreateInternalNoteAsync(
        Guid tenantId,
        Guid superAdminUserId,
        string note,
        CancellationToken cancellationToken);

    Task AddAuditEntryAsync(
        Guid? tenantId,
        Guid superAdminUserId,
        string actionCode,
        string summary,
        string? metadataJson,
        CancellationToken cancellationToken);
}
