using QRApp.Shared.Results;

namespace QRApp.Application.Orders;

public interface IOrderService
{
    Task<OperationResult<PublicOrderCreationResult>> CreateFromQrTokenAsync(
        string qrToken,
        Guid qrSessionId,
        CreatePublicQrOrderRequest request,
        CancellationToken cancellationToken);

    Task<OperationResult<PublicOrderLookupResult>> GetByQrTokenAsync(
        string qrToken,
        Guid orderId,
        string? orderTrackingToken,
        string? customerDeviceToken,
        CancellationToken cancellationToken);

    Task<OperationResult<PublicOrderCancelResult>> CancelFromQrTokenAsync(
        string qrToken,
        Guid orderId,
        string deviceToken,
        CancelPublicQrOrderRequest request,
        CancellationToken cancellationToken);

    Task<OperationResult<PublicOrderResponse>> RequestItemCancellationAsync(
        string qrToken,
        Guid orderId,
        Guid orderItemId,
        string deviceToken,
        RequestPublicOrderItemCancellationRequest request,
        CancellationToken cancellationToken);

    Task<OperationResult<PublicQrPromoCodeValidationResponse>> ValidatePromoCodeAsync(
        string qrToken,
        Guid qrSessionId,
        ValidatePublicQrPromoCodeRequest request,
        CancellationToken cancellationToken);
}
