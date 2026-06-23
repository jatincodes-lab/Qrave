namespace QRApp.Application.Auth;

public sealed record AdminRequestAccess(
    string Method,
    string Path,
    Guid? QueryBranchId);

public sealed record AdminPrincipalAccess(
    string RoleCode,
    Guid? BranchId);

public sealed record AdminPermissionDecision(
    bool IsAllowed,
    string? Reason = null);

public static class AdminPermissionPolicy
{
    private const string BranchMismatchMessage = "Your account is assigned to a different branch.";
    private const string ForbiddenMessage = "Your staff role cannot access this admin action.";

    public static AdminPermissionDecision CanAccess(AdminPrincipalAccess principal, AdminRequestAccess request)
    {
        var role = NormalizeRole(principal.RoleCode);
        if (role == "owner")
        {
            return BranchDecision(principal, request);
        }

        if (!KnownRoles.Contains(role))
        {
            return Denied();
        }

        if (!CanAccessArea(role, request))
        {
            return Denied();
        }

        return BranchDecision(principal, request);
    }

    private static AdminPermissionDecision BranchDecision(AdminPrincipalAccess principal, AdminRequestAccess request)
    {
        if (!principal.BranchId.HasValue)
        {
            return Allowed();
        }

        var requestedBranchId = GetBranchIdFromPath(request.Path) ?? request.QueryBranchId;
        return !requestedBranchId.HasValue || requestedBranchId.Value == principal.BranchId.Value
            ? Allowed()
            : new AdminPermissionDecision(false, BranchMismatchMessage);
    }

    private static bool CanAccessArea(string role, AdminRequestAccess request)
    {
        var path = NormalizePath(request.Path);
        var method = request.Method.ToUpperInvariant();

        if (path is "/api/v1/me" or "/api/v1/me/password")
        {
            return true;
        }

        if (path.StartsWith("/api/v1/admin/notifications", StringComparison.Ordinal) ||
            path.StartsWith("/api/v1/admin/search", StringComparison.Ordinal))
        {
            return true;
        }

        if (path.StartsWith("/api/v1/admin/staff", StringComparison.Ordinal) ||
            path.StartsWith("/api/v1/admin/billing", StringComparison.Ordinal))
        {
            return false;
        }

        if (path.StartsWith("/api/v1/admin/reports", StringComparison.Ordinal) ||
            path.StartsWith("/api/v1/admin/campaigns", StringComparison.Ordinal) ||
            path.StartsWith("/api/v1/admin/media", StringComparison.Ordinal))
        {
            return role is "admin" or "manager";
        }

        if (path.StartsWith("/api/v1/admin/feedback", StringComparison.Ordinal))
        {
            return role is "admin" or "manager";
        }

        if (!path.StartsWith("/api/v1/admin/branches", StringComparison.Ordinal))
        {
            return false;
        }

        var branchResource = GetBranchResource(path);
        return branchResource switch
        {
            BranchResource.BranchCollection => method == "GET" || role == "admin",
            BranchResource.BranchProfile => method == "GET" || role == "admin",
            BranchResource.Menu => role is "admin" or "manager",
            BranchResource.Offers => role is "admin" or "manager",
            BranchResource.Tables => role is "admin" or "manager",
            BranchResource.OrderSettings => role is "admin" or "manager",
            BranchResource.BillingSettings => role is "admin" or "manager",
            BranchResource.Orders => role is "admin" or "manager" or "kitchen" or "waiter" or "staff",
            BranchResource.WaiterCalls => role is "admin" or "manager" or "kitchen" or "waiter" or "staff",
            _ => false
        };
    }

    public static Guid? GetBranchIdFromPath(string path)
    {
        var segments = NormalizePath(path).Split('/', StringSplitOptions.RemoveEmptyEntries);
        for (var index = 0; index < segments.Length - 1; index++)
        {
            if (string.Equals(segments[index], "branches", StringComparison.OrdinalIgnoreCase) &&
                Guid.TryParse(segments[index + 1], out var branchId))
            {
                return branchId;
            }
        }

        return null;
    }

    private static BranchResource GetBranchResource(string path)
    {
        var segments = NormalizePath(path).Split('/', StringSplitOptions.RemoveEmptyEntries);
        var branchIndex = Array.FindIndex(segments, segment => string.Equals(segment, "branches", StringComparison.OrdinalIgnoreCase));
        if (branchIndex < 0)
        {
            return BranchResource.Unknown;
        }

        if (branchIndex == segments.Length - 1)
        {
            return BranchResource.BranchCollection;
        }

        if (!Guid.TryParse(segments[branchIndex + 1], out _))
        {
            return BranchResource.Unknown;
        }

        if (branchIndex + 2 >= segments.Length)
        {
            return BranchResource.BranchProfile;
        }

        return segments[branchIndex + 2].ToLowerInvariant() switch
        {
            "menu-categories" or "menu-items" => BranchResource.Menu,
            "offers" => BranchResource.Offers,
            "tables" => BranchResource.Tables,
            "orders" => BranchResource.Orders,
            "order-settings" => BranchResource.OrderSettings,
            "billing-settings" => BranchResource.BillingSettings,
            "waiter-calls" => BranchResource.WaiterCalls,
            _ => BranchResource.Unknown
        };
    }

    private static string NormalizePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return "/";
        }

        var withoutQuery = path.Split('?', 2)[0].TrimEnd('/');
        return withoutQuery.Length == 0 ? "/" : withoutQuery.ToLowerInvariant();
    }

    private static string NormalizeRole(string roleCode)
    {
        return roleCode.Trim().ToLowerInvariant();
    }

    private static AdminPermissionDecision Allowed() => new(true);

    private static AdminPermissionDecision Denied() => new(false, ForbiddenMessage);

    private static readonly HashSet<string> KnownRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin",
        "manager",
        "kitchen",
        "waiter",
        "staff"
    };

    private enum BranchResource
    {
        Unknown,
        BranchCollection,
        BranchProfile,
        Menu,
        Offers,
        Tables,
        OrderSettings,
        BillingSettings,
        Orders,
        WaiterCalls
    }
}
