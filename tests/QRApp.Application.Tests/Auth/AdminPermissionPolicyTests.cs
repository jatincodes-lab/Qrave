using QRApp.Application.Auth;

namespace QRApp.Application.Tests.Auth;

public sealed class AdminPermissionPolicyTests
{
    private static readonly Guid BranchA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid BranchB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public void CanAccess_WhenOwnerAccessesBilling_Allows()
    {
        var decision = AdminPermissionPolicy.CanAccess(
            new AdminPrincipalAccess("owner", null),
            Request("GET", "/api/v1/admin/billing/subscription"));

        Assert.True(decision.IsAllowed);
    }

    [Fact]
    public void CanAccess_WhenAdminAccessesStaff_Denies()
    {
        var decision = AdminPermissionPolicy.CanAccess(
            new AdminPrincipalAccess("admin", null),
            Request("GET", "/api/v1/admin/staff"));

        Assert.False(decision.IsAllowed);
    }

    [Fact]
    public void CanAccess_WhenManagerCreatesBranch_Denies()
    {
        var decision = AdminPermissionPolicy.CanAccess(
            new AdminPrincipalAccess("manager", null),
            Request("POST", "/api/v1/admin/branches"));

        Assert.False(decision.IsAllowed);
    }

    [Fact]
    public void CanAccess_WhenManagerReadsReports_Allows()
    {
        var decision = AdminPermissionPolicy.CanAccess(
            new AdminPrincipalAccess("manager", null),
            Request("GET", "/api/v1/admin/reports/customers"));

        Assert.True(decision.IsAllowed);
    }

    [Fact]
    public void CanAccess_WhenKitchenAccessesReports_Denies()
    {
        var decision = AdminPermissionPolicy.CanAccess(
            new AdminPrincipalAccess("kitchen", BranchA),
            Request("GET", "/api/v1/admin/reports/orders/summary", BranchA));

        Assert.False(decision.IsAllowed);
    }

    [Fact]
    public void CanAccess_WhenWaiterUpdatesOrderForAssignedBranch_Allows()
    {
        var decision = AdminPermissionPolicy.CanAccess(
            new AdminPrincipalAccess("waiter", BranchA),
            Request("PUT", $"/api/v1/admin/branches/{BranchA}/orders/{Guid.NewGuid()}/status"));

        Assert.True(decision.IsAllowed);
    }

    [Fact]
    public void CanAccess_WhenAssignedStaffAccessesOtherBranch_Denies()
    {
        var decision = AdminPermissionPolicy.CanAccess(
            new AdminPrincipalAccess("staff", BranchA),
            Request("GET", $"/api/v1/admin/branches/{BranchB}/orders"));

        Assert.False(decision.IsAllowed);
        Assert.Equal("Your account is assigned to a different branch.", decision.Reason);
    }

    [Fact]
    public void CanAccess_WhenAssignedManagerUsesOtherBranchQuery_Denies()
    {
        var decision = AdminPermissionPolicy.CanAccess(
            new AdminPrincipalAccess("manager", BranchA),
            Request("GET", "/api/v1/admin/reports/orders", BranchB));

        Assert.False(decision.IsAllowed);
        Assert.Equal("Your account is assigned to a different branch.", decision.Reason);
    }

    private static AdminRequestAccess Request(string method, string path, Guid? branchId = null)
    {
        return new AdminRequestAccess(method, path, branchId);
    }
}
