namespace QRApp.Application.Auth;

public sealed record CurrentUserAccessRecord(
    Guid UserId,
    Guid TenantId,
    string RoleCode,
    Guid? BranchId,
    bool IsActive);

public interface IUserAccessRepository
{
    Task<CurrentUserAccessRecord?> GetCurrentAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken);
}

public interface IUserAccessService
{
    Task<CurrentUserAccessRecord?> GetCurrentAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken);
}

public sealed class UserAccessService(IUserAccessRepository repository) : IUserAccessService
{
    public Task<CurrentUserAccessRecord?> GetCurrentAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken)
    {
        return repository.GetCurrentAsync(tenantId, userId, cancellationToken);
    }
}
