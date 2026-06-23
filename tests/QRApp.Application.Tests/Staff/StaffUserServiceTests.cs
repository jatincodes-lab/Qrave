using QRApp.Application.Auth;
using QRApp.Application.Staff;

namespace QRApp.Application.Tests.Staff;

public sealed class StaffUserServiceTests
{
    [Fact]
    public async Task CreateAsync_WhenPasswordIsTooShort_ReturnsValidationError()
    {
        var service = new StaffUserService(new FakeStaffRepository(), new FakePasswordHasher());

        var result = await service.CreateAsync(
            Guid.NewGuid(),
            new CreateStaffUserRequest(null, "staff@example.com", "Staff User", "short", "waiter"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(CreateStaffUserRequest.Password));
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenUserIsStaff_UpdatesHash()
    {
        var repository = new FakeStaffRepository { StaffToReturn = Staff("waiter") };
        var service = new StaffUserService(repository, new FakePasswordHasher());

        var result = await service.ResetPasswordAsync(
            Guid.NewGuid(),
            repository.StaffToReturn.UserId,
            new ResetStaffPasswordRequest("new-password"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("hashed:new-password", repository.ResetPasswordHash);
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenRepositoryCannotUpdate_ReturnsValidationError()
    {
        var service = new StaffUserService(new FakeStaffRepository(), new FakePasswordHasher());

        var result = await service.ResetPasswordAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new ResetStaffPasswordRequest("new-password"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Message == "Staff user was not found.");
    }

    [Fact]
    public async Task ChangeOwnPasswordAsync_WhenCurrentPasswordMatches_UpdatesPassword()
    {
        var repository = new FakeStaffRepository { CurrentPasswordHash = "hashed:old-password" };
        var service = new StaffUserService(repository, new FakePasswordHasher());

        var result = await service.ChangeOwnPasswordAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new ChangeOwnPasswordRequest("old-password", "new-password"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("hashed:new-password", repository.UpdatedPasswordHash);
    }

    [Fact]
    public async Task ChangeOwnPasswordAsync_WhenCurrentPasswordIsWrong_ReturnsValidationError()
    {
        var repository = new FakeStaffRepository { CurrentPasswordHash = "hashed:old-password" };
        var service = new StaffUserService(repository, new FakePasswordHasher());

        var result = await service.ChangeOwnPasswordAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new ChangeOwnPasswordRequest("wrong-password", "new-password"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.Errors, error => error.Field == nameof(ChangeOwnPasswordRequest.CurrentPassword));
    }

    private static StaffUserResponse Staff(string roleCode)
    {
        var tenantId = Guid.NewGuid();
        return new StaffUserResponse(
            Guid.NewGuid(),
            Guid.NewGuid(),
            tenantId,
            null,
            null,
            "staff@example.com",
            "Staff User",
            roleCode,
            true,
            true,
            DateTime.UtcNow,
            null);
    }

    private sealed class FakeStaffRepository : IStaffUserRepository
    {
        public StaffUserResponse? StaffToReturn { get; init; }

        public string? ResetPasswordHash { get; private set; }

        public string? CurrentPasswordHash { get; init; }

        public string? UpdatedPasswordHash { get; private set; }

        public Task<StaffUserResponse> CreateAsync(Guid tenantId, Guid userId, Guid tenantUserId, CreateStaffUserRequest request, string passwordHash, CancellationToken cancellationToken)
        {
            return Task.FromResult(Staff(request.RoleCode));
        }

        public Task<IReadOnlyCollection<StaffUserResponse>> GetListAsync(Guid tenantId, bool includeInactive, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<StaffUserResponse>>(Array.Empty<StaffUserResponse>());
        }

        public Task<StaffUserResponse> UpdateAsync(Guid tenantId, Guid userId, UpdateStaffUserRequest request, CancellationToken cancellationToken)
        {
            return Task.FromResult(Staff(request.RoleCode));
        }

        public Task<StaffUserResponse?> ResetPasswordAsync(Guid tenantId, Guid userId, string passwordHash, CancellationToken cancellationToken)
        {
            ResetPasswordHash = passwordHash;
            return Task.FromResult(StaffToReturn);
        }

        public Task<string?> GetPasswordHashAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken)
        {
            return Task.FromResult(CurrentPasswordHash);
        }

        public Task<bool> UpdatePasswordAsync(Guid tenantId, Guid userId, string passwordHash, CancellationToken cancellationToken)
        {
            UpdatedPasswordHash = passwordHash;
            return Task.FromResult(true);
        }
    }

    private sealed class FakePasswordHasher : IPasswordHasher
    {
        public string Hash(string password) => $"hashed:{password}";

        public bool Verify(string password, string passwordHash) => passwordHash == Hash(password);
    }
}
