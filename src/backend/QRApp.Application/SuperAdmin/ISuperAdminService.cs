using QRApp.Shared.Results;
using QRApp.Application.Tenants;

namespace QRApp.Application.SuperAdmin;

public interface ISuperAdminService
{
    Task<OperationResult<SuperAdminSessionResponse>> BootstrapAsync(
        SuperAdminBootstrapRequest request,
        string? configuredSetupToken,
        CancellationToken cancellationToken);

    Task<OperationResult<SuperAdminSessionResponse>> LoginAsync(
        SuperAdminLoginRequest request,
        CancellationToken cancellationToken);

    Task<SuperAdminDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken);

    Task<IReadOnlyCollection<SuperAdminRestaurantListItem>> SearchRestaurantsAsync(
        string? search,
        string? status,
        string? plan,
        CancellationToken cancellationToken);

    Task<SuperAdminRestaurantDetailResponse?> GetRestaurantDetailAsync(Guid tenantId, CancellationToken cancellationToken);

    Task<OperationResult<TenantSubscriptionResponse>> UpdateSubscriptionAsync(
        Guid tenantId,
        SuperAdminUpdateSubscriptionRequest request,
        Guid superAdminUserId,
        CancellationToken cancellationToken);

    Task<OperationResult<TenantSubscriptionResponse>> ExtendTrialAsync(
        Guid tenantId,
        SuperAdminExtendTrialRequest request,
        Guid superAdminUserId,
        CancellationToken cancellationToken);

    Task<OperationResult<TenantSubscriptionResponse>> ReactivateAsync(
        Guid tenantId,
        SuperAdminTenantActionRequest request,
        Guid superAdminUserId,
        CancellationToken cancellationToken);

    Task<OperationResult<TenantSubscriptionResponse>> SuspendAsync(
        Guid tenantId,
        SuperAdminTenantActionRequest request,
        Guid superAdminUserId,
        CancellationToken cancellationToken);

    Task<OperationResult<SuperAdminInternalNoteResponse>> CreateInternalNoteAsync(
        Guid tenantId,
        SuperAdminCreateInternalNoteRequest request,
        Guid superAdminUserId,
        CancellationToken cancellationToken);
}
