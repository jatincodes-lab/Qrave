using QRApp.Application.Common;
using QRApp.Shared.Results;
using System.Security.Cryptography;
using System.Text;

namespace QRApp.Application.Customers;

public sealed class CustomerService(ICustomerRepository repository) : ICustomerService
{
    private const int MinQrTokenLength = 8;
    private const int MaxQrTokenLength = 80;
    private const int DeviceTokenLength = 43;
    private static readonly TimeSpan DeviceAccessLifetime = TimeSpan.FromDays(90);

    public async Task<OperationResult<CustomerDeviceAccessResponse?>> CreateDeviceAccessAsync(
        string qrToken,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        var errors = new List<ValidationFailure>();

        if (cleanToken.Length is < MinQrTokenLength or > MaxQrTokenLength)
        {
            errors.Add(new ValidationFailure("QrToken", "QR token is invalid."));
        }

        if (orderId == Guid.Empty)
        {
            errors.Add(new ValidationFailure(nameof(orderId), "Order is required."));
        }

        if (errors.Count > 0)
        {
            return OperationResult<CustomerDeviceAccessResponse?>.Failed(errors.ToArray());
        }

        var deviceToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
        var expiresAtUtc = DateTime.UtcNow.Add(DeviceAccessLifetime);
        var created = await repository.CreateDeviceAccessAsync(
            cleanToken,
            orderId,
            HashToken(deviceToken),
            expiresAtUtc,
            cancellationToken);

        return OperationResult<CustomerDeviceAccessResponse?>.Success(
            created ? new CustomerDeviceAccessResponse(deviceToken, expiresAtUtc) : null);
    }

    public async Task<OperationResult<PublicCustomerLookupResponse?>> GetByDeviceAccessAsync(
        string qrToken,
        string deviceToken,
        CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        var cleanDeviceToken = TextRules.CleanRequired(deviceToken);
        var errors = new List<ValidationFailure>();

        if (cleanToken.Length is < MinQrTokenLength or > MaxQrTokenLength)
        {
            errors.Add(new ValidationFailure("QrToken", "QR token is invalid."));
        }

        if (cleanDeviceToken.Length != DeviceTokenLength)
        {
            errors.Add(new ValidationFailure(nameof(deviceToken), "Customer access token is invalid."));
        }

        if (errors.Count > 0)
        {
            return OperationResult<PublicCustomerLookupResponse?>.Failed(errors.ToArray());
        }

        var customer = await repository.GetByDeviceAccessAsync(cleanToken, HashToken(cleanDeviceToken), cancellationToken);
        return OperationResult<PublicCustomerLookupResponse?>.Success(customer);
    }

    private static string HashToken(string token)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();
    }
}
