using QRApp.Application.Auth;
using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Staff;

public sealed class StaffUserService(IStaffUserRepository repository, IPasswordHasher passwordHasher) : IStaffUserService
{
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin",
        "manager",
        "kitchen",
        "waiter",
        "staff"
    };

    public async Task<OperationResult<StaffUserResponse>> CreateAsync(Guid tenantId, CreateStaffUserRequest request, CancellationToken cancellationToken)
    {
        var cleaned = new CreateStaffUserRequest(
            request.BranchId,
            TextRules.CleanRequired(request.Email).ToLowerInvariant(),
            TextRules.CleanRequired(request.DisplayName),
            request.Password ?? string.Empty,
            TextRules.CleanRequired(request.RoleCode).ToLowerInvariant());

        var errors = ValidateCreate(cleaned);
        if (errors.Count > 0)
        {
            return OperationResult<StaffUserResponse>.Failed(errors.ToArray());
        }

        var staff = await repository.CreateAsync(
            tenantId,
            Guid.NewGuid(),
            Guid.NewGuid(),
            cleaned,
            passwordHasher.Hash(cleaned.Password),
            cancellationToken);

        return OperationResult<StaffUserResponse>.Success(staff);
    }

    public Task<IReadOnlyCollection<StaffUserResponse>> GetListAsync(Guid tenantId, bool includeInactive, CancellationToken cancellationToken)
    {
        return repository.GetListAsync(tenantId, includeInactive, cancellationToken);
    }

    public async Task<OperationResult<StaffUserResponse>> UpdateAsync(Guid tenantId, Guid userId, UpdateStaffUserRequest request, CancellationToken cancellationToken)
    {
        var cleaned = new UpdateStaffUserRequest(
            request.BranchId,
            TextRules.CleanRequired(request.DisplayName),
            TextRules.CleanRequired(request.RoleCode).ToLowerInvariant(),
            request.IsActive);

        var errors = ValidateUpdate(cleaned);
        if (errors.Count > 0)
        {
            return OperationResult<StaffUserResponse>.Failed(errors.ToArray());
        }

        var staff = await repository.UpdateAsync(tenantId, userId, cleaned, cancellationToken);
        return OperationResult<StaffUserResponse>.Success(staff);
    }

    public async Task<OperationResult<StaffUserResponse>> ResetPasswordAsync(Guid tenantId, Guid userId, ResetStaffPasswordRequest request, CancellationToken cancellationToken)
    {
        var password = request.Password ?? string.Empty;
        var errors = ValidatePassword(password, nameof(ResetStaffPasswordRequest.Password));
        if (errors.Count > 0)
        {
            return OperationResult<StaffUserResponse>.Failed(errors.ToArray());
        }

        var staff = await repository.ResetPasswordAsync(tenantId, userId, passwordHasher.Hash(password), cancellationToken);
        return staff is null
            ? OperationResult<StaffUserResponse>.Failed(new ValidationFailure(nameof(userId), "Staff user was not found."))
            : OperationResult<StaffUserResponse>.Success(staff);
    }

    public async Task<OperationResult<bool>> ChangeOwnPasswordAsync(Guid tenantId, Guid userId, ChangeOwnPasswordRequest request, CancellationToken cancellationToken)
    {
        var currentPassword = request.CurrentPassword ?? string.Empty;
        var newPassword = request.NewPassword ?? string.Empty;
        var errors = ValidatePassword(newPassword, nameof(ChangeOwnPasswordRequest.NewPassword));

        if (string.IsNullOrWhiteSpace(currentPassword))
        {
            errors.Add(new ValidationFailure(nameof(ChangeOwnPasswordRequest.CurrentPassword), "Current password is required."));
        }

        if (currentPassword == newPassword)
        {
            errors.Add(new ValidationFailure(nameof(ChangeOwnPasswordRequest.NewPassword), "New password must be different from current password."));
        }

        if (errors.Count > 0)
        {
            return OperationResult<bool>.Failed(errors.ToArray());
        }

        var passwordHash = await repository.GetPasswordHashAsync(tenantId, userId, cancellationToken);
        if (passwordHash is null || !passwordHasher.Verify(currentPassword, passwordHash))
        {
            return OperationResult<bool>.Failed(new ValidationFailure(nameof(ChangeOwnPasswordRequest.CurrentPassword), "Current password is incorrect."));
        }

        var updated = await repository.UpdatePasswordAsync(tenantId, userId, passwordHasher.Hash(newPassword), cancellationToken);
        return updated
            ? OperationResult<bool>.Success(true)
            : OperationResult<bool>.Failed(new ValidationFailure(nameof(userId), "User was not found."));
    }

    private static List<ValidationFailure> ValidateCreate(CreateStaffUserRequest request)
    {
        var errors = ValidateShared(request.DisplayName, request.RoleCode);

        if (request.Email.Length > 256 || !request.Email.Contains('@', StringComparison.Ordinal))
        {
            errors.Add(new ValidationFailure(nameof(CreateStaffUserRequest.Email), "Email is invalid."));
        }

        errors.AddRange(ValidatePassword(request.Password, nameof(CreateStaffUserRequest.Password)));

        return errors;
    }

    private static List<ValidationFailure> ValidateUpdate(UpdateStaffUserRequest request)
    {
        return ValidateShared(request.DisplayName, request.RoleCode);
    }

    private static List<ValidationFailure> ValidateShared(string displayName, string roleCode)
    {
        var errors = new List<ValidationFailure>();

        if (displayName.Length is < 2 or > 160)
        {
            errors.Add(new ValidationFailure("DisplayName", "Display name must be between 2 and 160 characters."));
        }

        if (!AllowedRoles.Contains(roleCode))
        {
            errors.Add(new ValidationFailure("RoleCode", "Staff role is invalid."));
        }

        return errors;
    }

    private static List<ValidationFailure> ValidatePassword(string password, string field)
    {
        var errors = new List<ValidationFailure>();
        if (password.Length is < 8 or > 128)
        {
            errors.Add(new ValidationFailure(field, "Password must be between 8 and 128 characters."));
        }

        return errors;
    }
}
