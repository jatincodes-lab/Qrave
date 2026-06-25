namespace QRApp.Application.Orders;

public interface IOrderRepository
{
    Task<PublicOrderResponse> CreateFromQrTokenAsync(
        string qrToken,
        Guid qrSessionId,
        Guid orderId,
        CreatePublicQrOrderRequest request,
        CancellationToken cancellationToken);

    Task<bool> CreateOrderTrackingAccessAsync(
        string qrToken,
        Guid orderId,
        string tokenHash,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken);

    Task<PublicOrderLookupResult> GetByQrTokenAsync(
        string qrToken,
        Guid orderId,
        string? trackingTokenHash,
        string? customerDeviceTokenHash,
        CancellationToken cancellationToken);

    Task<PublicOrderCancelResult> CancelFromQrTokenAsync(
        string qrToken,
        Guid orderId,
        string tokenHash,
        string reason,
        CancellationToken cancellationToken);

    Task<PublicOrderResponse> RequestItemCancellationAsync(
        string qrToken,
        Guid orderId,
        Guid orderItemId,
        string tokenHash,
        int quantity,
        string reason,
        CancellationToken cancellationToken);

    Task<PublicQrPromoCodeValidationResponse> ValidatePromoCodeAsync(
        string qrToken,
        Guid qrSessionId,
        ValidatePublicQrPromoCodeRequest request,
        CancellationToken cancellationToken);
}
