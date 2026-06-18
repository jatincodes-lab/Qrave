using System.Text.Json;
using QRApp.Application.Auth;
using QRApp.Application.Common;
using QRApp.Application.Tenants;
using QRApp.Shared.Results;

namespace QRApp.Application.SuperAdmin;

public sealed class SuperAdminService(
    ISuperAdminRepository repository,
    IPasswordHasher passwordHasher) : ISuperAdminService
{
    private static readonly Guid PlatformTenantId = Guid.Empty;
    private static readonly HashSet<string> AllowedSubscriptionStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Trialing",
        "Active",
        "ManualActive",
        "PastDue",
        "Suspended",
        "Cancelled",
        "Expired"
    };

    private static readonly HashSet<string> AllowedAccountStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Active",
        "Inactive"
    };

    public async Task<OperationResult<SuperAdminSessionResponse>> BootstrapAsync(
        SuperAdminBootstrapRequest request,
        string? configuredSetupToken,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(configuredSetupToken))
        {
            return OperationResult<SuperAdminSessionResponse>.Failed(
                new ValidationFailure(nameof(request.SetupToken), "Super admin bootstrap is not enabled."));
        }

        if (!string.Equals(request.SetupToken, configuredSetupToken, StringComparison.Ordinal))
        {
            return OperationResult<SuperAdminSessionResponse>.Failed(
                new ValidationFailure(nameof(request.SetupToken), "Setup token is invalid."));
        }

        if (await repository.HasAnySuperAdminAsync(cancellationToken))
        {
            return OperationResult<SuperAdminSessionResponse>.Failed(
                new ValidationFailure(nameof(request.Email), "A super admin already exists."));
        }

        var cleaned = CleanBootstrap(request);
        var errors = ValidateUserInput(cleaned.Email, cleaned.DisplayName, cleaned.Password);
        if (errors.Count > 0)
        {
            return OperationResult<SuperAdminSessionResponse>.Failed(errors.ToArray());
        }

        var user = await repository.CreateUserAsync(Guid.NewGuid(), cleaned, passwordHasher.Hash(cleaned.Password), cancellationToken);
        await repository.AddAuditEntryAsync(null, user.SuperAdminUserId, "super-admin-created", $"Super admin {user.Email} was bootstrapped.", null, cancellationToken);

        return OperationResult<SuperAdminSessionResponse>.Success(ToSession(user));
    }

    public async Task<OperationResult<SuperAdminSessionResponse>> LoginAsync(
        SuperAdminLoginRequest request,
        CancellationToken cancellationToken)
    {
        var email = TextRules.CleanRequired(request.Email).ToLowerInvariant();
        var password = request.Password ?? string.Empty;

        if (email.Length > 256 || !email.Contains('@', StringComparison.Ordinal) || password.Length == 0)
        {
            return InvalidLogin();
        }

        var user = await repository.GetUserByEmailAsync(email, cancellationToken);
        if (user is null || !user.IsActive || !passwordHasher.Verify(password, user.PasswordHash))
        {
            return InvalidLogin();
        }

        return OperationResult<SuperAdminSessionResponse>.Success(ToSession(user));
    }

    public Task<SuperAdminDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken)
    {
        return repository.GetDashboardAsync(cancellationToken);
    }

    public Task<IReadOnlyCollection<SuperAdminRestaurantListItem>> SearchRestaurantsAsync(
        string? search,
        string? status,
        string? plan,
        CancellationToken cancellationToken)
    {
        return repository.SearchRestaurantsAsync(
            TextRules.CleanOptional(search),
            TextRules.CleanOptional(status),
            TextRules.CleanOptional(plan),
            cancellationToken);
    }

    public Task<SuperAdminRestaurantDetailResponse?> GetRestaurantDetailAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        return repository.GetRestaurantDetailAsync(tenantId, cancellationToken);
    }

    public async Task<OperationResult<TenantSubscriptionResponse>> UpdateSubscriptionAsync(
        Guid tenantId,
        SuperAdminUpdateSubscriptionRequest request,
        Guid superAdminUserId,
        CancellationToken cancellationToken)
    {
        var normalized = NormalizeSubscription(request);
        var errors = ValidateSubscription(normalized);
        if (errors.Count > 0)
        {
            return OperationResult<TenantSubscriptionResponse>.Failed(errors.ToArray());
        }

        var updated = await repository.UpdateSubscriptionAsync(tenantId, normalized, cancellationToken);
        await repository.AddAuditEntryAsync(
            tenantId,
            superAdminUserId,
            "subscription-updated",
            $"Subscription changed to {updated.PlanCode}/{updated.SubscriptionStatusCode}.",
            JsonSerializer.Serialize(normalized),
            cancellationToken);

        return OperationResult<TenantSubscriptionResponse>.Success(updated);
    }

    public async Task<OperationResult<TenantSubscriptionResponse>> ExtendTrialAsync(
        Guid tenantId,
        SuperAdminExtendTrialRequest request,
        Guid superAdminUserId,
        CancellationToken cancellationToken)
    {
        if (request.Days is < 1 or > 365)
        {
            return OperationResult<TenantSubscriptionResponse>.Failed(
                new ValidationFailure(nameof(request.Days), "Trial extension must be between 1 and 365 days."));
        }

        var current = await repository.GetSubscriptionAsync(tenantId, cancellationToken);
        if (current is null)
        {
            return OperationResult<TenantSubscriptionResponse>.Failed(new ValidationFailure(nameof(tenantId), "Restaurant was not found."));
        }

        var baseDate = current.TrialEndAtUtc.HasValue && current.TrialEndAtUtc.Value > DateTime.UtcNow
            ? current.TrialEndAtUtc.Value
            : DateTime.UtcNow;

        return await UpdateSubscriptionAsync(
            tenantId,
            new SuperAdminUpdateSubscriptionRequest(
                "trial",
                "Trialing",
                "Active",
                baseDate.AddDays(request.Days),
                CleanNote(request.SubscriptionNotes) ?? $"Trial extended by {request.Days} day(s)."),
            superAdminUserId,
            cancellationToken);
    }

    public Task<OperationResult<TenantSubscriptionResponse>> ReactivateAsync(
        Guid tenantId,
        SuperAdminTenantActionRequest request,
        Guid superAdminUserId,
        CancellationToken cancellationToken)
    {
        return UpdateSubscriptionAsync(
            tenantId,
            new SuperAdminUpdateSubscriptionRequest(
                "manual",
                "ManualActive",
                "Active",
                null,
                CleanNote(request.SubscriptionNotes) ?? "Manually reactivated by super admin."),
            superAdminUserId,
            cancellationToken);
    }

    public async Task<OperationResult<TenantSubscriptionResponse>> SuspendAsync(
        Guid tenantId,
        SuperAdminTenantActionRequest request,
        Guid superAdminUserId,
        CancellationToken cancellationToken)
    {
        var note = CleanNote(request.SubscriptionNotes);
        if (note is null || note.Length < 2)
        {
            return OperationResult<TenantSubscriptionResponse>.Failed(
                new ValidationFailure(nameof(request.SubscriptionNotes), "Suspension reason is required."));
        }

        return await UpdateSubscriptionAsync(
            tenantId,
            new SuperAdminUpdateSubscriptionRequest(
                "manual",
                "Suspended",
                "Inactive",
                null,
                note),
            superAdminUserId,
            cancellationToken);
    }

    public async Task<OperationResult<SuperAdminInternalNoteResponse>> CreateInternalNoteAsync(
        Guid tenantId,
        SuperAdminCreateInternalNoteRequest request,
        Guid superAdminUserId,
        CancellationToken cancellationToken)
    {
        var note = TextRules.CleanRequired(request.Note);
        if (note.Length is < 2 or > 1000)
        {
            return OperationResult<SuperAdminInternalNoteResponse>.Failed(
                new ValidationFailure(nameof(request.Note), "Internal note must be between 2 and 1000 characters."));
        }

        var created = await repository.CreateInternalNoteAsync(tenantId, superAdminUserId, note, cancellationToken);
        await repository.AddAuditEntryAsync(tenantId, superAdminUserId, "internal-note-created", "Internal note added.", null, cancellationToken);
        return OperationResult<SuperAdminInternalNoteResponse>.Success(created);
    }

    private static SuperAdminBootstrapRequest CleanBootstrap(SuperAdminBootstrapRequest request)
    {
        return new SuperAdminBootstrapRequest(
            TextRules.CleanRequired(request.Email).ToLowerInvariant(),
            TextRules.CleanRequired(request.DisplayName),
            request.Password ?? string.Empty,
            request.SetupToken ?? string.Empty);
    }

    private static List<ValidationFailure> ValidateUserInput(string email, string displayName, string password)
    {
        var errors = new List<ValidationFailure>();

        if (email.Length > 256 || !email.Contains('@', StringComparison.Ordinal))
        {
            errors.Add(new ValidationFailure(nameof(SuperAdminBootstrapRequest.Email), "Email is invalid."));
        }

        if (displayName.Length is < 2 or > 160)
        {
            errors.Add(new ValidationFailure(nameof(SuperAdminBootstrapRequest.DisplayName), "Display name must be between 2 and 160 characters."));
        }

        if (password.Length is < 12 or > 128)
        {
            errors.Add(new ValidationFailure(nameof(SuperAdminBootstrapRequest.Password), "Password must be between 12 and 128 characters."));
        }

        return errors;
    }

    private static SuperAdminUpdateSubscriptionRequest NormalizeSubscription(SuperAdminUpdateSubscriptionRequest request)
    {
        return new SuperAdminUpdateSubscriptionRequest(
            TextRules.CleanRequired(request.PlanCode).ToLowerInvariant(),
            TextRules.CleanRequired(request.SubscriptionStatusCode),
            TextRules.CleanRequired(request.AccountStatusCode),
            request.TrialEndAtUtc,
            CleanNote(request.SubscriptionNotes));
    }

    private static List<ValidationFailure> ValidateSubscription(SuperAdminUpdateSubscriptionRequest request)
    {
        var errors = new List<ValidationFailure>();

        if (request.PlanCode.Length is < 2 or > 40 || !request.PlanCode.All(c => char.IsLetterOrDigit(c) || c == '-' || c == '_'))
        {
            errors.Add(new ValidationFailure(nameof(request.PlanCode), "Plan code must be 2-40 characters and contain only letters, numbers, hyphens, or underscores."));
        }

        if (!AllowedSubscriptionStatuses.Contains(request.SubscriptionStatusCode))
        {
            errors.Add(new ValidationFailure(nameof(request.SubscriptionStatusCode), "Subscription status is invalid."));
        }

        if (!AllowedAccountStatuses.Contains(request.AccountStatusCode))
        {
            errors.Add(new ValidationFailure(nameof(request.AccountStatusCode), "Account status is invalid."));
        }

        if (string.Equals(request.SubscriptionStatusCode, "Trialing", StringComparison.OrdinalIgnoreCase) && !request.TrialEndAtUtc.HasValue)
        {
            errors.Add(new ValidationFailure(nameof(request.TrialEndAtUtc), "Trial end date is required for trialing restaurants."));
        }

        if (request.SubscriptionNotes is { Length: > 500 })
        {
            errors.Add(new ValidationFailure(nameof(request.SubscriptionNotes), "Subscription note must be 500 characters or fewer."));
        }

        return errors;
    }

    private static string? CleanNote(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static OperationResult<SuperAdminSessionResponse> InvalidLogin()
    {
        return OperationResult<SuperAdminSessionResponse>.Failed(
            new ValidationFailure(nameof(SuperAdminLoginRequest.Email), "Email or password is invalid."));
    }

    private static SuperAdminSessionResponse ToSession(SuperAdminLoginRecord user)
    {
        var accessStatus = new TenantAccessStatusResponse(
            PlatformTenantId,
            "platform",
            null,
            null,
            "Active",
            "Active",
            true,
            true,
            false,
            true,
            null,
            "Super admin access allowed.");

        var session = new AuthenticatedSessionResponse(
            new AuthenticatedUserResponse(user.SuperAdminUserId, user.Email, user.DisplayName, PlatformTenantId, user.RoleCode, null),
            new AuthenticatedTenantResponse(PlatformTenantId, "Qrave Platform", "platform", accessStatus));

        return new SuperAdminSessionResponse(session, user.RoleCode);
    }
}
