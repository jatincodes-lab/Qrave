using QRApp.Shared.Results;

namespace QRApp.Application.Customers;

public interface ICustomerService
{
    Task<OperationResult<CustomerDeviceAccessResponse?>> CreateDeviceAccessAsync(
        string qrToken,
        string customerWhatsApp,
        CancellationToken cancellationToken);

    Task<OperationResult<PublicCustomerLookupResponse?>> GetByDeviceAccessAsync(
        string qrToken,
        string deviceToken,
        CancellationToken cancellationToken);
}
