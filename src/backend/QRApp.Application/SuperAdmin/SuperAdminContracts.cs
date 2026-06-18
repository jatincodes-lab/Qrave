using QRApp.Application.Auth;
using QRApp.Application.Tenants;

namespace QRApp.Application.SuperAdmin;

public sealed record SuperAdminBootstrapRequest(
    string Email,
    string DisplayName,
    string Password,
    string SetupToken);

public sealed record SuperAdminLoginRequest(string Email, string Password);

public sealed record SuperAdminSessionResponse(
    AuthenticatedSessionResponse Session,
    string RoleCode);

public sealed record SuperAdminLoginRecord(
    Guid SuperAdminUserId,
    string Email,
    string DisplayName,
    string PasswordHash,
    string RoleCode,
    bool IsActive);

public sealed record SuperAdminDashboardResponse(
    int TotalRestaurants,
    int ActiveRestaurants,
    int TrialRestaurants,
    int ExpiredTrials,
    int SuspendedRestaurants,
    int PaidRestaurants,
    int NewRestaurantsThisMonth,
    int TotalBranches,
    int TotalTables,
    int TotalOrders,
    decimal TotalRevenue,
    IReadOnlyCollection<SuperAdminRestaurantListItem> RecentRestaurants,
    IReadOnlyCollection<SuperAdminRestaurantListItem> NeedsAttention,
    IReadOnlyCollection<SuperAdminAuditEntryResponse> RecentActions);

public sealed record SuperAdminRestaurantListItem(
    Guid TenantId,
    string Name,
    string Slug,
    string OwnerEmail,
    string? OwnerName,
    string? OwnerPhone,
    string PlanCode,
    string SubscriptionStatusCode,
    string AccountStatusCode,
    bool IsTenantActive,
    DateTime? TrialEndAtUtc,
    int BranchCount,
    int StaffCount,
    int TableCount,
    int OrderCount,
    decimal RevenueTotal,
    DateTime? LastOrderAtUtc,
    DateTime CreatedAtUtc);

public sealed record SuperAdminRestaurantDetailResponse(
    SuperAdminRestaurantListItem Restaurant,
    TenantAccessStatusResponse AccessStatus,
    IReadOnlyCollection<SuperAdminBranchSummary> Branches,
    IReadOnlyCollection<SuperAdminStaffSummary> Staff,
    IReadOnlyCollection<SuperAdminOrderSummary> RecentOrders,
    IReadOnlyCollection<SuperAdminAuditEntryResponse> AuditEntries,
    IReadOnlyCollection<SuperAdminInternalNoteResponse> InternalNotes);

public sealed record SuperAdminBranchSummary(
    Guid BranchId,
    string Name,
    string? City,
    string? State,
    string CountryCode,
    bool IsActive,
    int TableCount,
    int OrderCount,
    DateTime CreatedAtUtc);

public sealed record SuperAdminStaffSummary(
    Guid UserId,
    string Email,
    string DisplayName,
    string RoleCode,
    string? BranchName,
    bool IsActive,
    DateTime CreatedAtUtc);

public sealed record SuperAdminOrderSummary(
    Guid OrderId,
    string BranchName,
    string TableName,
    string OrderStatusCode,
    string? CustomerName,
    decimal TotalAmount,
    DateTime CreatedAtUtc);

public sealed record SuperAdminAuditEntryResponse(
    Guid SuperAdminAuditEntryId,
    Guid? TenantId,
    string? TenantName,
    string ActionCode,
    string Summary,
    string? MetadataJson,
    Guid SuperAdminUserId,
    string SuperAdminEmail,
    DateTime CreatedAtUtc);

public sealed record SuperAdminInternalNoteResponse(
    Guid SuperAdminInternalNoteId,
    Guid TenantId,
    string Note,
    Guid CreatedBySuperAdminUserId,
    string CreatedByEmail,
    DateTime CreatedAtUtc);

public sealed record SuperAdminUpdateSubscriptionRequest(
    string PlanCode,
    string SubscriptionStatusCode,
    string AccountStatusCode,
    DateTime? TrialEndAtUtc,
    string? SubscriptionNotes);

public sealed record SuperAdminExtendTrialRequest(int Days, string? SubscriptionNotes);

public sealed record SuperAdminTenantActionRequest(string? SubscriptionNotes);

public sealed record SuperAdminCreateInternalNoteRequest(string Note);
