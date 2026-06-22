namespace QRApp.Application.Orders;

public sealed record AdminOrderItemResponse(
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
    int CancelledQuantity,
    int ActiveQuantity,
    decimal ActiveLineTotal,
    string? CancelledReason,
    DateTime? CancelledAtUtc);

public sealed record AdminOrderResponse(
    Guid OrderId,
    Guid TenantId,
    Guid BranchId,
    Guid TableId,
    string TableName,
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
    DateTime? ClosedAtUtc,
    string? LatestReason,
    IReadOnlyCollection<AdminOrderItemResponse> Items);

public sealed record UpdateAdminOrderStatusRequest(string OrderStatusCode, string? Reason = null);

public sealed record CancelAdminOrderItemRequest(int Quantity, string? Reason);
