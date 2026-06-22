using QRApp.Application.Common;
using QRApp.Shared.Results;

namespace QRApp.Application.Orders;

public sealed class AdminOrderService(IAdminOrderRepository repository) : IAdminOrderService
{
    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Placed",
        "Accepted",
        "Preparing",
        "Ready",
        "Served",
        "Completed",
        "Cancelled"
    };

    public Task<IReadOnlyCollection<AdminOrderResponse>> GetListByBranchAsync(
        Guid tenantId,
        Guid branchId,
        bool includeCompleted,
        CancellationToken cancellationToken)
    {
        return repository.GetListByBranchAsync(tenantId, branchId, includeCompleted, cancellationToken);
    }

    public async Task<OperationResult<AdminOrderResponse>> UpdateStatusAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        UpdateAdminOrderStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken)
    {
        var status = TextRules.CleanRequired(request.OrderStatusCode);
        if (!AllowedStatuses.Contains(status))
        {
            return OperationResult<AdminOrderResponse>.Failed(
                new ValidationFailure(nameof(UpdateAdminOrderStatusRequest.OrderStatusCode), "Order status is invalid."));
        }

        var reason = TextRules.CleanOptional(request.Reason);
        if (reason?.Length > 300)
        {
            return OperationResult<AdminOrderResponse>.Failed(
                new ValidationFailure(nameof(UpdateAdminOrderStatusRequest.Reason), "Status reason cannot exceed 300 characters."));
        }

        if (string.Equals(status, "Cancelled", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(reason))
        {
            return OperationResult<AdminOrderResponse>.Failed(
                new ValidationFailure(nameof(UpdateAdminOrderStatusRequest.Reason), "Cancellation reason is required."));
        }

        var normalized = AllowedStatuses.First(item => string.Equals(item, status, StringComparison.OrdinalIgnoreCase));
        var order = await repository.UpdateStatusAsync(tenantId, branchId, orderId, normalized, reason, changedByUserId, cancellationToken);
        return OperationResult<AdminOrderResponse>.Success(order);
    }

    public async Task<OperationResult<AdminOrderResponse>> CancelItemAsync(
        Guid tenantId,
        Guid branchId,
        Guid orderId,
        Guid orderItemId,
        CancelAdminOrderItemRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken)
    {
        if (request.Quantity <= 0)
        {
            return OperationResult<AdminOrderResponse>.Failed(
                new ValidationFailure(nameof(CancelAdminOrderItemRequest.Quantity), "Cancellation quantity must be greater than zero."));
        }

        var reason = TextRules.CleanOptional(request.Reason);
        if (string.IsNullOrWhiteSpace(reason))
        {
            return OperationResult<AdminOrderResponse>.Failed(
                new ValidationFailure(nameof(CancelAdminOrderItemRequest.Reason), "Cancellation reason is required."));
        }

        if (reason.Length > 300)
        {
            return OperationResult<AdminOrderResponse>.Failed(
                new ValidationFailure(nameof(CancelAdminOrderItemRequest.Reason), "Cancellation reason cannot exceed 300 characters."));
        }

        var order = await repository.CancelItemAsync(tenantId, branchId, orderId, orderItemId, request.Quantity, reason, changedByUserId, cancellationToken);
        return OperationResult<AdminOrderResponse>.Success(order);
    }
}
