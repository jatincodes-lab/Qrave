namespace QRApp.Application.Customers;

public interface ICustomerRepository
{
    Task<bool> CreateDeviceAccessAsync(
        string qrToken,
        string customerWhatsApp,
        string tokenHash,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken);

    Task<PublicCustomerLookupResponse?> GetByDeviceAccessAsync(
        string qrToken,
        string tokenHash,
        CancellationToken cancellationToken);
}
