"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Loader2, RefreshCw, ReceiptText, Send, Star, Utensils, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../../components/ui/toast";
import { ApiError, cancelPublicQrOrder, createPublicOrderFeedback, getPublicOrderFeedback, getPublicQrOrder, requestPublicOrderItemCancellation, type DietTypeCode, type OrderFeedback, type PublicQrMenu, type PublicQrOrder, type PublicQrOrderItem } from "../../../../../lib/api";

const StatusSteps = ["Placed", "Accepted", "Preparing", "Ready", "Served"] as const;

export function OrderTrackingClient({
  initialMenu,
  initialOrder,
  orderId,
  qrToken
}: {
  initialMenu: PublicQrMenu;
  initialOrder: PublicQrOrder;
  orderId: string;
  qrToken: string;
}) {
  const { toastError, toastSuccess } = useToast();
  const [order, setOrder] = useState(initialOrder);
  const [returnTarget, setReturnTarget] = useState<"menu" | "previous-orders">("menu");
  const [feedback, setFeedback] = useState<OrderFeedback | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isFeedbackRequested, setIsFeedbackRequested] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customerDeviceToken, setCustomerDeviceToken] = useState<string | null>(null);
  const [isCancelPanelOpen, setIsCancelPanelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [itemCancelRequest, setItemCancelRequest] = useState<{ item: PublicQrOrderItem; quantity: string; reason: string } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [savingItemRequestId, setSavingItemRequestId] = useState<string | null>(null);
  const currentStepIndex = useMemo(() => StatusSteps.findIndex((status) => status === order.orderStatusCode), [order.orderStatusCode]);
  const isCancelled = order.orderStatusCode === "Cancelled";
  const isCompleted = order.orderStatusCode === "Completed";
  const canCancelOrder = order.orderStatusCode === "Placed";
  const canRequestItemCancellation = ["Placed", "Accepted", "Preparing"].includes(order.orderStatusCode);
  const shouldReturnToPreviousOrders = returnTarget === "previous-orders";
  const shouldShowFeedback = isCompleted || isFeedbackRequested;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setReturnTarget(params.get("from") === "previous-orders" ? "previous-orders" : "menu");
    setIsFeedbackRequested(window.location.hash === "#feedback");
  }, []);

  useEffect(() => {
    setCustomerDeviceToken(readCustomerDeviceToken(initialMenu.branchId));
  }, [initialMenu.branchId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        void refreshOrder();
      }
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [orderId, qrToken]);

  useEffect(() => {
    if (!shouldShowFeedback) {
      setFeedback(null);
      return;
    }

    void loadFeedback();
  }, [shouldShowFeedback, orderId, qrToken]);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#feedback") {
      return;
    }

    const timer = window.setTimeout(() => {
      document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [shouldShowFeedback, feedback]);

  async function refreshOrder() {
    setIsRefreshing(true);

    try {
      setOrder(await getPublicQrOrder(qrToken, orderId));
    } catch (caught) {
      toastError(caught instanceof ApiError ? caught.message : "Could not refresh order status.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function loadFeedback() {
    try {
      setFeedback(await getPublicOrderFeedback(qrToken, orderId));
    } catch (caught) {
      toastError(caught instanceof ApiError ? caught.message : "Could not load feedback.");
    }
  }

  async function submitFeedback() {
    setIsSavingFeedback(true);

    try {
      const saved = await createPublicOrderFeedback(qrToken, orderId, {
        rating: feedbackRating,
        comment: feedbackComment.trim() || null
      });
      setFeedback(saved);
      setFeedbackComment("");
      toastSuccess("Thanks for your feedback.");
    } catch (caught) {
      toastError(caught instanceof ApiError ? caught.message : "Could not save feedback.");
    } finally {
      setIsSavingFeedback(false);
    }
  }

  async function cancelOrder() {
    if (!customerDeviceToken) {
      toastError("This order can only be cancelled from the device used to place it.");
      return;
    }

    setIsCancelling(true);

    try {
      const cancelledOrder = await cancelPublicQrOrder(qrToken, orderId, customerDeviceToken, {
        reason: cancelReason.trim() || null
      });
      setOrder(cancelledOrder);
      setCancelReason("");
      setIsCancelPanelOpen(false);
      toastSuccess("Order cancelled.");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        toastError("This order can only be cancelled from the device used to place it.");
      } else if (caught instanceof ApiError && caught.status === 409) {
        toastError(caught.message || "This order can no longer be cancelled.");
        await refreshOrder();
      } else {
        toastError(caught instanceof ApiError ? caught.message : "Could not cancel order.");
      }
    } finally {
      setIsCancelling(false);
    }
  }

  async function submitItemCancellationRequest() {
    if (!itemCancelRequest) {
      return;
    }

    if (!customerDeviceToken) {
      toastError("This order can only be changed from the device used to place it.");
      return;
    }

    const quantity = Number(itemCancelRequest.quantity);
    const reason = itemCancelRequest.reason.trim();

    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > itemCancelRequest.item.quantity) {
      toastError("Cancellation quantity is invalid.");
      return;
    }

    if (!reason) {
      toastError("Cancellation reason is required.");
      return;
    }

    setSavingItemRequestId(itemCancelRequest.item.orderItemId);
    try {
      const updated = await requestPublicOrderItemCancellation(qrToken, orderId, itemCancelRequest.item.orderItemId, customerDeviceToken, {
        quantity,
        reason
      });
      setOrder(updated);
      setItemCancelRequest(null);
      toastSuccess("Cancellation request sent to staff.");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        toastError("This order can only be changed from the device used to place it.");
      } else if (caught instanceof ApiError && caught.status === 409) {
        toastError(caught.message || "This item can no longer be cancelled.");
        await refreshOrder();
      } else {
        toastError(caught instanceof ApiError ? caught.message : "Could not request item cancellation.");
      }
    } finally {
      setSavingItemRequestId(null);
    }
  }

  function handleBack() {
    const menuUrl = `/qr/${encodeURIComponent(qrToken)}`;
    window.location.assign(shouldReturnToPreviousOrders ? `${menuUrl}?view=previous-orders` : menuUrl);
  }

  return (
    <section className="min-h-dvh flex-1 bg-[#f8f9fa] px-4 py-5 pb-8">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 text-sm font-black text-[#006d36]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {shouldReturnToPreviousOrders ? "Previous orders" : "Menu"}
          </button>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#006d36]">Order tracking</p>
          <h1 className="mt-1 truncate text-2xl font-black leading-8 text-[#001c11]">#{shortOrderCode(order.orderId)}</h1>
          <p className="mt-1 text-sm font-semibold text-[#5a625e]">
            {initialMenu.branchName} - {initialMenu.tableName}
          </p>
        </div>
        <button
          type="button"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d9e4df] bg-white text-[#001c11] shadow-sm disabled:opacity-60"
          disabled={isRefreshing}
          onClick={() => void refreshOrder()}
          aria-label="Refresh order status"
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </header>

      <div className="rounded-2xl border border-[#d9e4df] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Current status</p>
            <h2 className="mt-1 text-3xl font-black text-[#001c11]">{order.orderStatusCode}</h2>
          </div>
          <div className={`grid h-14 w-14 place-items-center rounded-full ${isCancelled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {isCancelled ? <AlertCircle className="h-8 w-8" aria-hidden="true" /> : <CheckCircle2 className="h-8 w-8" aria-hidden="true" />}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {StatusSteps.map((status, index) => {
            const isDone = currentStepIndex >= index || isCompleted;
            const isCurrent = order.orderStatusCode === status;

            return (
              <div key={status} className="grid grid-cols-[2.5rem_1fr] gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-full ${isDone ? "bg-[#006d36] text-white" : "bg-[#eef3f0] text-[#5a625e]"}`}>
                  {isDone ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <Clock3 className="h-5 w-5" aria-hidden="true" />}
                </div>
                <div className={`rounded-xl border p-3 ${isCurrent ? "border-[#006d36] bg-[#f1fbf5]" : "border-[#d9e4df] bg-[#f8f9fa]"}`}>
                  <p className="text-sm font-black text-[#001c11]">{status}</p>
                  <p className="mt-1 text-xs font-semibold text-[#5a625e]">{statusHelp(status)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {isCancelled ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">This order was cancelled. If this was unexpected, please contact staff.</p>
        ) : null}
      </div>

      {canCancelOrder ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-red-50 via-white to-[#f1fbf5] p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-red-100 bg-white text-red-600 shadow-sm">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-[#001c11]">Need to cancel?</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#5a625e]">
                  You can cancel the whole order before the restaurant accepts it.
                </p>
              </div>
            </div>

            {!customerDeviceToken ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                Cancellation is available only on the device used to place this order. Please contact staff if you need help.
              </div>
            ) : isCancelPanelOpen ? (
              <div className="mt-4 grid gap-3">
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  maxLength={300}
                  placeholder="Reason is optional"
                  className="min-h-24 w-full resize-none rounded-xl border border-red-100 bg-white px-3 py-3 text-sm font-semibold text-[#001c11] outline-none placeholder:text-[#8a948f] focus:border-red-400 focus:ring-2 focus:ring-red-500/10"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCancelPanelOpen(false);
                      setCancelReason("");
                    }}
                    disabled={isCancelling}
                    className="h-12 rounded-xl border border-[#d9e4df] bg-white px-4 text-sm font-black text-[#001c11] disabled:opacity-60"
                  >
                    Keep order
                  </button>
                  <button
                    type="button"
                    onClick={() => void cancelOrder()}
                    disabled={isCancelling}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black text-white shadow-sm disabled:opacity-60"
                  >
                    {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Cancel order
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCancelPanelOpen(true)}
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-black text-red-700 shadow-sm"
              >
                Cancel whole order
              </button>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e6eeea] pb-3">
          <h3 className="text-sm font-black uppercase text-[#001c11]">Items</h3>
          <p className="text-sm font-bold text-on-surface-variant">{order.items.length} item{order.items.length === 1 ? "" : "s"}</p>
        </div>

        <div className="divide-y divide-[#e6eeea]">
          {order.items.map((item) => (
            <div key={item.orderItemId} className="grid grid-cols-[2rem_1fr_auto] gap-3 py-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f8f9fa] text-[#006d36]">
                <Utensils className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-[#001c11]">{formatOrderItemName(item.menuItemName, item.variantName)}</p>
                <DietTypePill dietTypeCode={item.dietTypeCode} />
                <p className="mt-1 text-xs text-on-surface-variant">
                  {item.quantity} x {formatPrice(item.unitPrice)}
                </p>
                {item.itemNote ? <p className="mt-1 rounded-lg bg-[#f8f9fa] px-2 py-1 text-xs font-semibold text-[#5a625e]">{item.itemNote}</p> : null}
                {item.pendingCancellationRequestId ? (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-black text-amber-900">
                    Cancellation requested for {item.pendingCancellationQuantity} item{item.pendingCancellationQuantity === 1 ? "" : "s"}
                  </p>
                ) : canRequestItemCancellation ? (
                  <button
                    type="button"
                    onClick={() => setItemCancelRequest({ item, quantity: "1", reason: "" })}
                    disabled={!customerDeviceToken}
                    className="mt-2 inline-flex h-8 items-center gap-1 rounded-lg border border-red-100 bg-white px-2 text-xs font-black text-red-700 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Request cancel
                  </button>
                ) : null}
              </div>
              <p className="text-sm font-black text-[#001c11]">{formatPrice(item.lineTotal)}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-[#e6eeea] pt-3">
          <span className="text-base font-black text-[#001c11]">Total amount</span>
          <span className="text-xl font-black text-[#006d36]">{formatPrice(order.totalAmount)}</span>
        </div>
        {order.appliedOfferDiscountAmount > 0 ? (
          <div className="mt-3 rounded-xl border border-[#bfe6cf] bg-[#f1fbf5] px-3 py-2 text-sm font-bold text-[#006d36]">
            {order.appliedOfferTitle ?? "Offer applied"} saved {formatPrice(order.appliedOfferDiscountAmount)}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
        <ReceiptText className="h-5 w-5 text-[#006d36]" aria-hidden="true" />
        <p className="mt-2 text-xs font-bold uppercase text-on-surface-variant">Placed at</p>
        <p className="mt-1 text-sm font-black text-[#001c11]">{formatOrderDate(order.createdAtUtc)}</p>
      </div>

      {shouldShowFeedback ? (
        <div id="feedback" className="mt-4 scroll-mt-6 rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f1fbf5] text-[#006d36]">
              <Star className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-[#001c11]">Rate your experience</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#5a625e]">Your feedback goes directly to the restaurant owner.</p>
            </div>
          </div>

          {feedback ? (
            <div className="mt-4 rounded-xl border border-[#bfe6cf] bg-[#f1fbf5] p-3">
              <div className="flex items-center gap-1 text-[#006d36]">
                {Array.from({ length: feedback.rating }, (_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" aria-hidden="true" />
                ))}
              </div>
              <p className="mt-2 text-sm font-black text-[#001c11]">Thanks for your feedback.</p>
              {feedback.comment ? <p className="mt-1 text-sm font-semibold leading-6 text-[#5a625e]">{feedback.comment}</p> : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-2" aria-label={`${feedbackRating} star rating`}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFeedbackRating(rating)}
                    className={`grid h-11 w-11 place-items-center rounded-full border ${
                      rating <= feedbackRating ? "border-[#006d36] bg-[#f1fbf5] text-[#006d36]" : "border-[#d9e4df] bg-white text-[#9aa39f]"
                    }`}
                    aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                  >
                    <Star className={`h-5 w-5 ${rating <= feedbackRating ? "fill-current" : ""}`} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <textarea
                value={feedbackComment}
                onChange={(event) => setFeedbackComment(event.target.value)}
                maxLength={500}
                placeholder="Optional comment"
                className="min-h-24 w-full resize-none rounded-xl border border-[#d9e4df] bg-[#f8f9fa] px-3 py-3 text-sm font-semibold text-[#001c11] outline-none placeholder:text-[#8a948f] focus:border-[#006d36] focus:ring-2 focus:ring-[#006d36]/15"
              />
              <button
                type="button"
                onClick={() => void submitFeedback()}
                disabled={isSavingFeedback}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#006d36] px-4 text-sm font-black text-white shadow-sm disabled:opacity-60"
              >
                {isSavingFeedback ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                Submit feedback
              </button>
            </div>
          )}
        </div>
      ) : null}

      {itemCancelRequest ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 px-4 py-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-base font-black text-[#001c11]">Request item cancellation</p>
            <p className="mt-1 text-sm font-semibold text-[#5a625e]">{formatOrderItemName(itemCancelRequest.item.menuItemName, itemCancelRequest.item.variantName)}</p>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-xs font-black uppercase text-[#5a625e]">
                Quantity
                <input
                  type="number"
                  min={1}
                  max={itemCancelRequest.item.quantity}
                  value={itemCancelRequest.quantity}
                  onChange={(event) => setItemCancelRequest({ ...itemCancelRequest, quantity: event.target.value })}
                  className="h-11 rounded-xl border border-[#d9e4df] px-3 text-sm font-black text-[#001c11] outline-none focus:border-[#006d36]"
                />
              </label>
              <label className="grid gap-1 text-xs font-black uppercase text-[#5a625e]">
                Reason
                <textarea
                  value={itemCancelRequest.reason}
                  onChange={(event) => setItemCancelRequest({ ...itemCancelRequest, reason: event.target.value })}
                  maxLength={300}
                  placeholder="Required, for example: ordered by mistake"
                  className="min-h-24 resize-none rounded-xl border border-[#d9e4df] px-3 py-3 text-sm font-semibold text-[#001c11] outline-none focus:border-[#006d36]"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setItemCancelRequest(null)} disabled={savingItemRequestId === itemCancelRequest.item.orderItemId} className="h-11 rounded-xl border border-[#d9e4df] text-sm font-black text-[#001c11]">
                  Keep item
                </button>
                <button type="button" onClick={() => void submitItemCancellationRequest()} disabled={savingItemRequestId === itemCancelRequest.item.orderItemId} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-black text-white disabled:opacity-60">
                  {savingItemRequestId === itemCancelRequest.item.orderItemId ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Send request
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function statusHelp(status: (typeof StatusSteps)[number]): string {
  switch (status) {
    case "Placed":
      return "Your order has reached the restaurant.";
    case "Accepted":
      return "Staff accepted your order.";
    case "Preparing":
      return "Kitchen is preparing your items.";
    case "Ready":
      return "Your order is ready.";
    case "Served":
      return "Staff marked this order as served.";
  }
}

function formatOrderItemName(name: string, variantName: string | null): string {
  return variantName ? `${name} - ${variantName}` : name;
}

function DietTypePill({ dietTypeCode }: { dietTypeCode: DietTypeCode }) {
  if (dietTypeCode === "Unspecified") {
    return null;
  }

  const tone =
    dietTypeCode === "Veg" || dietTypeCode === "Vegan" || dietTypeCode === "Jain"
      ? "border-[#bfe6cf] bg-[#f1fbf5] text-[#006d36]"
      : "border-[#ffd9b5] bg-[#fff5ec] text-[#9a4b00]";

  return (
    <span className={`mt-1 inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-normal ${tone}`}>
      {dietTypeCode === "NonVeg" ? "Non-veg" : dietTypeCode}
    </span>
  );
}

function shortOrderCode(orderId: string): string {
  return orderId.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

type StoredCustomerProfile = {
  version: 1;
  branchId: string;
  customerName: string;
  customerWhatsApp: string;
  customerPhoneCountryCode: string;
  deviceToken: string;
  expiresAtUtc: string;
};

function readCustomerDeviceToken(branchId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = `qrave:customer-profile:${branchId}`;
  try {
    const rawProfile = window.localStorage.getItem(storageKey);
    if (!rawProfile) {
      return null;
    }

    const parsed: unknown = JSON.parse(rawProfile);
    if (!isStoredCustomerProfile(parsed) || parsed.branchId !== branchId || Date.parse(parsed.expiresAtUtc) <= Date.now()) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    return parsed.deviceToken;
  } catch {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage failures in restricted browsers.
    }
    return null;
  }
}

function isStoredCustomerProfile(value: unknown): value is StoredCustomerProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<StoredCustomerProfile>;
  return (
    profile.version === 1 &&
    typeof profile.branchId === "string" &&
    typeof profile.customerName === "string" &&
    typeof profile.customerWhatsApp === "string" &&
    typeof profile.customerPhoneCountryCode === "string" &&
    typeof profile.deviceToken === "string" &&
    profile.deviceToken.length === 43 &&
    typeof profile.expiresAtUtc === "string" &&
    Number.isFinite(Date.parse(profile.expiresAtUtc))
  );
}
