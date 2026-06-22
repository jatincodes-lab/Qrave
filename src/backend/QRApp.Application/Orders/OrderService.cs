using QRApp.Application.Common;
using QRApp.Shared.Results;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace QRApp.Application.Orders;

public sealed class OrderService(IOrderRepository repository) : IOrderService
{
    private const int MinQrTokenLength = 8;
    private const int MaxQrTokenLength = 80;
    private const int DeviceTokenLength = 43;
    private const int MaxCancellationReasonLength = 300;
    private static readonly Regex AllowedPhoneCharacters = new(@"^[0-9+\-().\s]+$", RegexOptions.Compiled);

    public async Task<OperationResult<PublicOrderResponse>> CreateFromQrTokenAsync(
        string qrToken,
        Guid qrSessionId,
        CreatePublicQrOrderRequest request,
        CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        var errors = Validate(cleanToken, qrSessionId, request);
        if (errors.Count > 0)
        {
            return OperationResult<PublicOrderResponse>.Failed(errors.ToArray());
        }

        var cleaned = new CreatePublicQrOrderRequest(
            CleanOptional(request.CustomerName),
            CleanOptional(request.CustomerWhatsApp),
            CleanOptional(request.Notes),
            request.Items
                .Select(item => item with { ItemNote = CleanOptional(item.ItemNote) })
                .GroupBy(item => new { item.MenuItemId, item.MenuItemVariantId, item.ItemNote })
                .Select(group => new CreatePublicQrOrderItemRequest(group.Key.MenuItemId, group.Sum(item => item.Quantity), group.Key.MenuItemVariantId, group.Key.ItemNote))
                .ToArray(),
            request.MarketingConsent,
            CleanPromoCode(request.PromoCode));

        var order = await repository.CreateFromQrTokenAsync(cleanToken, qrSessionId, Guid.NewGuid(), cleaned, cancellationToken);
        return OperationResult<PublicOrderResponse>.Success(order);
    }

    public async Task<OperationResult<PublicOrderResponse>> GetByQrTokenAsync(
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
            return OperationResult<PublicOrderResponse>.Failed(errors.ToArray());
        }

        var order = await repository.GetByQrTokenAsync(cleanToken, orderId, cancellationToken);
        return OperationResult<PublicOrderResponse>.Success(order);
    }

    public async Task<OperationResult<PublicOrderCancelResult>> CancelFromQrTokenAsync(
        string qrToken,
        Guid orderId,
        string deviceToken,
        CancelPublicQrOrderRequest request,
        CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        var cleanDeviceToken = TextRules.CleanRequired(deviceToken);
        var cleanReason = CleanOptional(request.Reason);
        var errors = new List<ValidationFailure>();

        if (cleanToken.Length is < MinQrTokenLength or > MaxQrTokenLength)
        {
            errors.Add(new ValidationFailure("QrToken", "QR token is invalid."));
        }

        if (orderId == Guid.Empty)
        {
            errors.Add(new ValidationFailure(nameof(orderId), "Order is required."));
        }

        if (cleanDeviceToken.Length != DeviceTokenLength)
        {
            errors.Add(new ValidationFailure(nameof(deviceToken), "Customer access token is invalid."));
        }

        if (cleanReason?.Length > MaxCancellationReasonLength)
        {
            errors.Add(new ValidationFailure(nameof(CancelPublicQrOrderRequest.Reason), "Cancellation reason cannot exceed 300 characters."));
        }

        if (errors.Count > 0)
        {
            return OperationResult<PublicOrderCancelResult>.Failed(errors.ToArray());
        }

        var result = await repository.CancelFromQrTokenAsync(
            cleanToken,
            orderId,
            HashToken(cleanDeviceToken),
            cleanReason ?? "Cancelled by customer",
            cancellationToken);

        return OperationResult<PublicOrderCancelResult>.Success(result);
    }

    public async Task<OperationResult<PublicOrderResponse>> RequestItemCancellationAsync(
        string qrToken,
        Guid orderId,
        Guid orderItemId,
        string deviceToken,
        RequestPublicOrderItemCancellationRequest request,
        CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        var cleanDeviceToken = TextRules.CleanRequired(deviceToken);
        var cleanReason = CleanOptional(request.Reason);
        var errors = new List<ValidationFailure>();

        if (cleanToken.Length is < MinQrTokenLength or > MaxQrTokenLength)
        {
            errors.Add(new ValidationFailure("QrToken", "QR token is invalid."));
        }

        if (orderId == Guid.Empty)
        {
            errors.Add(new ValidationFailure(nameof(orderId), "Order is required."));
        }

        if (orderItemId == Guid.Empty)
        {
            errors.Add(new ValidationFailure(nameof(orderItemId), "Order item is required."));
        }

        if (cleanDeviceToken.Length != DeviceTokenLength)
        {
            errors.Add(new ValidationFailure(nameof(deviceToken), "Customer access token is invalid."));
        }

        if (request.Quantity <= 0)
        {
            errors.Add(new ValidationFailure(nameof(RequestPublicOrderItemCancellationRequest.Quantity), "Cancellation quantity must be greater than zero."));
        }

        if (string.IsNullOrWhiteSpace(cleanReason))
        {
            errors.Add(new ValidationFailure(nameof(RequestPublicOrderItemCancellationRequest.Reason), "Cancellation reason is required."));
        }
        else if (cleanReason.Length > MaxCancellationReasonLength)
        {
            errors.Add(new ValidationFailure(nameof(RequestPublicOrderItemCancellationRequest.Reason), "Cancellation reason cannot exceed 300 characters."));
        }

        if (errors.Count > 0)
        {
            return OperationResult<PublicOrderResponse>.Failed(errors.ToArray());
        }

        var order = await repository.RequestItemCancellationAsync(cleanToken, orderId, orderItemId, HashToken(cleanDeviceToken), request.Quantity, cleanReason!, cancellationToken);
        return OperationResult<PublicOrderResponse>.Success(order);
    }

    public async Task<OperationResult<PublicQrPromoCodeValidationResponse>> ValidatePromoCodeAsync(
        string qrToken,
        Guid qrSessionId,
        ValidatePublicQrPromoCodeRequest request,
        CancellationToken cancellationToken)
    {
        var cleanToken = TextRules.CleanRequired(qrToken);
        var orderRequest = new CreatePublicQrOrderRequest(
            null,
            CleanOptional(request.CustomerWhatsApp),
            null,
            request.Items,
            false,
            CleanPromoCode(request.PromoCode));
        var errors = Validate(cleanToken, qrSessionId, orderRequest);
        if (errors.Count > 0)
        {
            return OperationResult<PublicQrPromoCodeValidationResponse>.Failed(errors.ToArray());
        }

        var cleaned = new ValidatePublicQrPromoCodeRequest(
            CleanOptional(request.CustomerWhatsApp),
            CleanPromoCode(request.PromoCode)!,
            request.Items
                .Select(item => item with { ItemNote = CleanOptional(item.ItemNote) })
                .GroupBy(item => new { item.MenuItemId, item.MenuItemVariantId, item.ItemNote })
                .Select(group => new CreatePublicQrOrderItemRequest(group.Key.MenuItemId, group.Sum(item => item.Quantity), group.Key.MenuItemVariantId, group.Key.ItemNote))
                .ToArray());

        var validation = await repository.ValidatePromoCodeAsync(cleanToken, qrSessionId, cleaned, cancellationToken);
        return OperationResult<PublicQrPromoCodeValidationResponse>.Success(validation);
    }

    private static List<ValidationFailure> Validate(string qrToken, Guid qrSessionId, CreatePublicQrOrderRequest request)
    {
        var errors = new List<ValidationFailure>();

        if (qrToken.Length is < MinQrTokenLength or > MaxQrTokenLength)
        {
            errors.Add(new ValidationFailure("QrToken", "QR token is invalid."));
        }

        if (qrSessionId == Guid.Empty)
        {
            errors.Add(new ValidationFailure("QrSessionId", "Scan the table QR code again before placing an order."));
        }

        if (CleanOptional(request.CustomerName)?.Length > 120)
        {
            errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderRequest.CustomerName), "Customer name cannot exceed 120 characters."));
        }

        var cleanWhatsApp = CleanOptional(request.CustomerWhatsApp);
        if (cleanWhatsApp?.Length > 32)
        {
            errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderRequest.CustomerWhatsApp), "Customer WhatsApp cannot exceed 32 characters."));
        }

        if (cleanWhatsApp is not null)
        {
            var phoneDigits = PhoneDigits(cleanWhatsApp);
            if (!AllowedPhoneCharacters.IsMatch(cleanWhatsApp) || phoneDigits.Length is < 10 or > 15)
            {
                errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderRequest.CustomerWhatsApp), "Customer WhatsApp must be a valid phone number."));
            }
        }

        if (request.MarketingConsent && cleanWhatsApp is null)
        {
            errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderRequest.MarketingConsent), "WhatsApp number is required for marketing consent."));
        }

        if (CleanOptional(request.Notes)?.Length > 500)
        {
            errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderRequest.Notes), "Notes cannot exceed 500 characters."));
        }

        var cleanPromoCode = CleanPromoCode(request.PromoCode);
        if (cleanPromoCode is { Length: < 3 or > 40 } || cleanPromoCode?.All(c => char.IsLetterOrDigit(c) || c is '-' or '_') == false)
        {
            errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderRequest.PromoCode), "Promo code is invalid."));
        }

        if (request.Items.Count is < 1 or > 100)
        {
            errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderRequest.Items), "Order must contain between 1 and 100 items."));
        }

        foreach (var item in request.Items)
        {
            if (item.MenuItemId == Guid.Empty)
            {
                errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderItemRequest.MenuItemId), "Menu item is required."));
            }

            if (item.Quantity is < 1 or > 99)
            {
                errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderItemRequest.Quantity), "Quantity must be between 1 and 99."));
            }

            if (CleanOptional(item.ItemNote)?.Length > 200)
            {
                errors.Add(new ValidationFailure(nameof(CreatePublicQrOrderItemRequest.ItemNote), "Item note cannot exceed 200 characters."));
            }
        }

        return errors;
    }

    private static string? CleanOptional(string? value)
    {
        var clean = TextRules.CleanOptional(value);
        return string.IsNullOrWhiteSpace(clean) ? null : clean;
    }

    private static string PhoneDigits(string value)
    {
        return new string(value.Where(char.IsDigit).ToArray());
    }

    private static string? CleanPromoCode(string? value)
    {
        var clean = CleanOptional(value);
        return clean is null ? null : clean.ToUpperInvariant();
    }

    private static string HashToken(string token)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();
    }
}
