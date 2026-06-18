namespace QRApp.Application.Orders;

public interface IOrderRepository
{
    Task<PublicOrderResponse> CreateFromQrTokenAsync(
        string qrToken,
        Guid qrSessionId,
        Guid orderId,
        CreatePublicQrOrderRequest request,
        CancellationToken cancellationToken);

    Task<PublicOrderResponse> GetByQrTokenAsync(
        string qrToken,
        Guid orderId,
        CancellationToken cancellationToken);

    Task<PublicQrPromoCodeValidationResponse> ValidatePromoCodeAsync(
        string qrToken,
        Guid qrSessionId,
        ValidatePublicQrPromoCodeRequest request,
        CancellationToken cancellationToken);
}
