namespace QRApp.Application.Orders;

public interface IAdminOrderRepository
{
    Task<IReadOnlyCollection<AdminOrderResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeCompleted,
        CancellationToken cancellationToken);

    Task<AdminOrderResponse> UpdateStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        string orderStatusCode,
        string? reason,
        Guid changedByUserId,
        CancellationToken cancellationToken);

    Task<AdminOrderResponse> CancelItemAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        Guid orderItemId,
        int quantity,
        string reason,
        Guid changedByUserId,
        CancellationToken cancellationToken);

    Task<AdminOrderResponse> RespondItemCancellationRequestAsync(
        Guid tenantId,
        Guid branchId,
        Guid requestId,
        string decision,
        string? reason,
        Guid changedByUserId,
        CancellationToken cancellationToken);
}
