namespace QRApp.Application.Orders;

public sealed record CreatePublicQrOrderItemRequest(Guid MenuItemId, int Quantity, Guid? MenuItemVariantId = null, string? ItemNote = null);

public sealed record CreatePublicQrOrderRequest(
    string? CustomerName,
    string? CustomerWhatsApp,
    string? Notes,
    IReadOnlyCollection<CreatePublicQrOrderItemRequest> Items,
    bool MarketingConsent = false,
    string? PromoCode = null);

public sealed record ValidatePublicQrPromoCodeRequest(
    string? CustomerWhatsApp,
    string PromoCode,
    IReadOnlyCollection<CreatePublicQrOrderItemRequest> Items);

public sealed record CancelPublicQrOrderRequest(string? Reason = null);

public sealed record RequestPublicOrderItemCancellationRequest(int Quantity, string? Reason);

public enum PublicOrderCancelResultCode
{
    Cancelled,
    AlreadyCancelled,
    NotFound,
    Forbidden,
    NotCancellable
}

public sealed record PublicOrderCancelResult(
    PublicOrderCancelResultCode Code,
    PublicOrderResponse? Order,
    string? CurrentStatusCode);

public sealed record PublicQrPromoCodeValidationResponse(
    string PromoCode,
    Guid BranchOfferId,
    string Title,
    string? DiscountText,
    decimal DiscountAmount);

public sealed record PublicOrderItemResponse(
    Guid OrderItemId,
    Guid OrderId,
    Guid MenuItemId,
    Guid? MenuItemVariantId,
    string MenuItemName,
    string? VariantName,
    string? ItemNote,
    string DietTypeCode,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal,
    Guid? PendingCancellationRequestId,
    int? PendingCancellationQuantity,
    string? PendingCancellationReason,
    DateTime? PendingCancellationRequestedAtUtc);

public sealed record PublicOrderResponse(
    Guid OrderId,
    Guid TenantId,
    Guid BranchId,
    Guid TableId,
    string OrderStatusCode,
    string? CustomerName,
    string? CustomerWhatsApp,
    string? Notes,
    decimal SubtotalAmount,
    decimal TotalAmount,
    Guid? AppliedBranchOfferId,
    string? AppliedOfferTitle,
    decimal AppliedOfferDiscountAmount,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    IReadOnlyCollection<PublicOrderItemResponse> Items);

public sealed record PublicOrderCreatedResponse(
    PublicOrderResponse Order,
    QRApp.Application.Customers.CustomerDeviceAccessResponse? CustomerAccess);
