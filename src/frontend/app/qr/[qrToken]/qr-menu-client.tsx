"use client";

import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Compass,
  Flame,
  Home,
  Leaf,
  Loader2,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  TicketPercent,
  Trash2,
  Utensils,
  UserRound,
  X
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CountryPhoneInput } from "../../../components/country-phone-input";
import { useToast } from "../../../components/ui/toast";
import {
  ApiError,
  createWaiterCall,
  createPublicQrSession,
  createPublicQrOrder,
  getPublicCustomerByDevice,
  getPublicQrMenu,
  validatePublicQrPromoCode,
  type CreatePublicQrOrderInput,
  type DietTypeCode,
  type PublicCustomerLookup,
  type PublicCustomerRecentOrder,
  type PublicQrMenu,
  type PublicQrMenuCategory,
  type PublicQrMenuItem,
  type PublicQrMenuOffer,
  type PublicQrOrder,
  type PublicQrSession
} from "../../../lib/api";
import { firstInvalid, validateOptionalText, validatePhone, validateRequired } from "../../../lib/validation";

type CartLine = {
  cartLineId: string;
  item: PublicQrMenuItem;
  categoryName: string;
  variant: PublicQrMenuItem["variants"][number] | null;
  itemNote: string;
  quantity: number;
};

type StoredCustomerProfile = {
  version: 1;
  branchId: string;
  customerName: string;
  customerWhatsApp: string;
  customerPhoneCountryCode: string;
  deviceToken: string;
  expiresAtUtc: string;
};

type StoredQrMenuDraft = {
  version: 1;
  customerName: string;
  customerWhatsApp: string;
  customerPhoneCountryCode: string;
  marketingConsent: boolean;
  notes: string;
  cartLines: StoredCartLine[];
};

type StoredCartLine = {
  menuItemId: string;
  menuItemVariantId: string | null;
  itemNote: string;
  quantity: number;
};

type QrSessionState =
  | {
      kind: "loading";
    }
  | {
      kind: "active";
      session: PublicQrSession;
    }
  | {
      kind: "expired";
      expiresAtUtc: string | null;
    }
  | {
      kind: "unavailable";
      message: string;
    };

type CartEstimate = {
  subtotalAmount: number;
  discountAmount: number;
  appliedOffer: PublicQrMenuOffer | null;
  taxableAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  roundingAmount: number;
  totalAmount: number;
};

type ActiveView = "menu" | "cart" | "customerOrders";
type DietQuickFilter = "all" | "veg" | "nonveg";
type MenuSortCode = "recommended" | "priceAsc" | "priceDesc" | "nameAsc";

const AllPublicCategoryId = "all";

type SubmitState =
  | {
      kind: "idle";
    }
  | {
      kind: "submitting";
    }
  | {
      kind: "success";
      order: PublicQrOrder;
      promoCode: string | null;
    }
  | {
      kind: "error";
      message: string;
    };

type WaiterCallState =
  | {
      kind: "idle";
    }
  | {
      kind: "submitting";
    }
  | {
      kind: "success";
    }
  | {
      kind: "error";
      message: string;
    };

export function QrMenuClient({ menu }: { menu: PublicQrMenu }) {
  const { toastError, toastSuccess } = useToast();
  const [currentMenu, setCurrentMenu] = useState(menu);
  const [search, setSearch] = useState("");
  const [dietFilter, setDietFilter] = useState<DietQuickFilter>("all");
  const [sortBy, setSortBy] = useState<MenuSortCode>("recommended");
  const categories = useMemo(
    () => filterCategories(currentMenu.categories, search, dietFilter, sortBy),
    [currentMenu.categories, dietFilter, search, sortBy]
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(AllPublicCategoryId);
  const visibleCategories = useMemo(
    () => (selectedCategoryId === AllPublicCategoryId ? categories : categories.filter((category) => category.menuCategoryId === selectedCategoryId)),
    [categories, selectedCategoryId]
  );
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsApp, setCustomerWhatsApp] = useState("");
  const [customerPhoneCountryCode, setCustomerPhoneCountryCode] = useState("IN");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [recognizedCustomer, setRecognizedCustomer] = useState<PublicCustomerLookup | null>(null);
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [qrSessionState, setQrSessionState] = useState<QrSessionState>({ kind: "loading" });
  const [sessionTick, setSessionTick] = useState(0);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("menu");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isOffersSheetOpen, setIsOffersSheetOpen] = useState(false);
  const [isWaiterCallSheetOpen, setIsWaiterCallSheetOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [waiterCallNote, setWaiterCallNote] = useState("");
  const [waiterCallState, setWaiterCallState] = useState<WaiterCallState>({ kind: "idle" });
  const [flyingItem, setFlyingItem] = useState<{ key: number; item: PublicQrMenuItem } | null>(null);
  const [recentItem, setRecentItem] = useState<PublicQrMenuItem | null>(null);
  const [variantPicker, setVariantPicker] = useState<{ item: PublicQrMenuItem; categoryName: string } | null>(null);
  const [barPulseKey, setBarPulseKey] = useState(0);

  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = cartLines.reduce((total, line) => total + getCartLinePrice(line) * line.quantity, 0);
  const cartEstimate = useMemo(() => calculateCartEstimate(cartTotal, currentMenu.billingSettings, currentMenu.offers ?? [], promoCode), [cartTotal, currentMenu.billingSettings, currentMenu.offers, promoCode]);
  const activeQrSession = qrSessionState.kind === "active" && isQrSessionActive(qrSessionState.session, sessionTick) ? qrSessionState.session : null;
  const hasExpiredQrSession = qrSessionState.kind === "expired" || (qrSessionState.kind === "active" && !activeQrSession);
  const canOrder = currentMenu.orderSettings.enableDirectQrOrdering && Boolean(activeQrSession);
  const canCallWaiter = currentMenu.orderSettings.waiterCallEnabled && Boolean(activeQrSession);
  const itemCount = visibleCategories.reduce((total, category) => total + category.items.length, 0);
  const menuItemById = useMemo(() => {
    const lookup = new Map<string, PublicQrMenuItem>();
    currentMenu.categories.forEach((category) => {
      category.items.forEach((item) => lookup.set(item.menuItemId, item));
    });
    return lookup;
  }, [currentMenu.categories]);
  const categoryNameByMenuItemId = useMemo(() => {
    const lookup = new Map<string, string>();
    currentMenu.categories.forEach((category) => {
      category.items.forEach((item) => lookup.set(item.menuItemId, category.name));
    });
    return lookup;
  }, [currentMenu.categories]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (document.hidden) {
        return;
      }

      try {
        const refreshed = await getPublicQrMenu(currentMenu.qrToken);
        setCurrentMenu(refreshed);
      } catch {
        // Keep the last known menu visible if the API is temporarily unavailable.
      }
    }, 6_000);

    return () => window.clearInterval(timer);
  }, [currentMenu.qrToken]);

  useEffect(() => {
    if (!recognizedCustomer) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "previous-orders") {
      setActiveView("customerOrders");
    }
  }, [recognizedCustomer]);

  useEffect(() => {
    if (selectedCategoryId !== AllPublicCategoryId && !categories.some((category) => category.menuCategoryId === selectedCategoryId)) {
      setSelectedCategoryId(AllPublicCategoryId);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    const storedSession = readQrVisitSession(currentMenu.qrToken);
    if (storedSession) {
      if (isQrSessionActive(storedSession, 0)) {
        setQrSessionState({ kind: "active", session: storedSession });
        return;
      }

      setQrSessionState({ kind: "expired", expiresAtUtc: storedSession.expiresAtUtc });
      return;
    }

    let isActive = true;
    setQrSessionState({ kind: "loading" });

    createPublicQrSession(currentMenu.qrToken)
      .then((session) => {
        if (!isActive) {
          return;
        }

        writeQrVisitSession(currentMenu.qrToken, session);
        setQrSessionState(isQrSessionActive(session, 0) ? { kind: "active", session } : { kind: "expired", expiresAtUtc: session.expiresAtUtc });
      })
      .catch((caught) => {
        if (!isActive) {
          return;
        }

        setQrSessionState({
          kind: "unavailable",
          message: caught instanceof ApiError ? caught.message : "Table session could not be started. Please scan the QR code again."
        });
      });

    return () => {
      isActive = false;
    };
  }, [currentMenu.qrToken]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSessionTick((current) => current + 1);
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (qrSessionState.kind === "active" && !isQrSessionActive(qrSessionState.session, sessionTick)) {
      setQrSessionState({ kind: "expired", expiresAtUtc: qrSessionState.session.expiresAtUtc });
    }
  }, [qrSessionState, sessionTick]);

  useEffect(() => {
    const profile = readCustomerProfile(currentMenu.branchId);
    if (!profile) {
      return;
    }

    setCustomerName(normalizeStoredText(profile.customerName, 120));
    setCustomerWhatsApp(normalizeStoredText(profile.customerWhatsApp, 40));
    setCustomerPhoneCountryCode(normalizeStoredCountryCode(profile.customerPhoneCountryCode));

    let isActive = true;
    getPublicCustomerByDevice(currentMenu.qrToken, profile.deviceToken)
      .then((customer) => {
        if (!isActive) {
          return;
        }

        setRecognizedCustomer(customer);
        if (!customer) {
          clearCustomerProfile(currentMenu.branchId);
        }
      })
      .catch(() => {
        // Keep the remembered profile during temporary API or network failures.
      });

    return () => {
      isActive = false;
    };
  }, [currentMenu.branchId, currentMenu.qrToken]);

  useEffect(() => {
    if (isDraftRestored) {
      return;
    }

    const draft = readQrMenuDraft(currentMenu.qrToken);
    if (draft) {
      setCart(sanitizeStoredCartLines(draft.cartLines, menuItemById, categoryNameByMenuItemId));
      setCustomerName(normalizeStoredText(draft.customerName, 120));
      setCustomerWhatsApp(normalizeStoredText(draft.customerWhatsApp, 40));
      setCustomerPhoneCountryCode(normalizeStoredCountryCode(draft.customerPhoneCountryCode));
      setMarketingConsent(Boolean(draft.marketingConsent && draft.customerWhatsApp.trim()));
      setNotes(normalizeStoredText(draft.notes, 500));
    }

    setIsDraftRestored(true);
  }, [categoryNameByMenuItemId, currentMenu.qrToken, isDraftRestored, menuItemById]);

  useEffect(() => {
    if (!isDraftRestored) {
      return;
    }

    setCart((current) => sanitizeLiveCartLines(current, menuItemById, categoryNameByMenuItemId));
  }, [categoryNameByMenuItemId, isDraftRestored, menuItemById]);

  useEffect(() => {
    if (!isDraftRestored) {
      return;
    }

    writeQrMenuDraft(currentMenu.qrToken, {
      version: 1,
      customerName: normalizeStoredText(customerName, 120),
      customerWhatsApp: normalizeStoredText(customerWhatsApp, 40),
      customerPhoneCountryCode: normalizeStoredCountryCode(customerPhoneCountryCode),
      marketingConsent: Boolean(marketingConsent && customerWhatsApp.trim()),
      notes: normalizeStoredText(notes, 500),
      cartLines: toStoredCartLines(cart)
    });
  }, [cart, currentMenu.qrToken, customerName, customerPhoneCountryCode, customerWhatsApp, isDraftRestored, marketingConsent, notes]);

  function addItem(item: PublicQrMenuItem, categoryName: string, variant: PublicQrMenuItem["variants"][number] | null = null) {
    if (!canOrder) {
      return;
    }

    setSubmitState({ kind: "idle" });
    setFlyingItem({ key: Date.now(), item });
    setRecentItem(item);
    setVariantPicker(null);
    setCart((current) => {
      const cartLineId = getCartLineId(item.menuItemId, variant?.menuItemVariantId ?? null);
      const existing = current[cartLineId];
      return {
        ...current,
        [cartLineId]: {
          cartLineId,
          item,
          categoryName,
          variant,
          itemNote: existing?.itemNote ?? "",
          quantity: existing ? existing.quantity + 1 : 1
        }
      };
    });
    window.setTimeout(() => {
      setFlyingItem(null);
      setBarPulseKey((current) => current + 1);
    }, 1120);
  }

  function decrementItem(cartLineId: string) {
    setSubmitState({ kind: "idle" });
    setCart((current) => {
      const existing = current[cartLineId];
      if (!existing) {
        return current;
      }

      if (existing.quantity <= 1) {
        const next = { ...current };
        delete next[cartLineId];
        setRecentItem((currentRecent) => {
          if (currentRecent?.menuItemId !== existing.item.menuItemId) {
            return currentRecent;
          }

          const remaining = Object.values(next);
          return remaining[remaining.length - 1]?.item ?? null;
        });
        return next;
      }

      return {
        ...current,
        [cartLineId]: {
          ...existing,
          quantity: existing.quantity - 1
        }
      };
    });
  }

  function updateCartLineNote(cartLineId: string, itemNote: string) {
    setSubmitState({ kind: "idle" });
    setCart((current) => {
      const existing = current[cartLineId];
      if (!existing) {
        return current;
      }

      return {
        ...current,
        [cartLineId]: {
          ...existing,
          itemNote
        }
      };
    });
  }

  function addRecentOrderToCart(order: PublicCustomerRecentOrder) {
    const reorderLines = order.items
      .map((recentItem) => {
        const item = menuItemById.get(recentItem.menuItemId);
        if (!item) {
          return null;
        }

        const variant = recentItem.menuItemVariantId
          ? item.variants.find((candidate) => candidate.menuItemVariantId === recentItem.menuItemVariantId) ?? null
          : null;

        if (recentItem.menuItemVariantId && !variant) {
          return null;
        }

        return {
          cartLineId: getCartLineId(item.menuItemId, variant?.menuItemVariantId ?? null),
          item,
          categoryName: categoryNameByMenuItemId.get(item.menuItemId) ?? "Menu",
          variant,
          itemNote: recentItem.itemNote ?? "",
          quantity: recentItem.quantity
        };
      })
      .filter((line): line is CartLine => line !== null);

    setSubmitState({ kind: "idle" });
    if (reorderLines.length === 0) {
      setSubmitState({ kind: "error", message: "Items from this order are not available right now." });
      return;
    }

    setCart((current) => {
      const next = { ...current };

      reorderLines.forEach((line) => {
        const existing = next[line.cartLineId];
        next[line.cartLineId] = {
          ...line,
          itemNote: existing?.itemNote ?? line.itemNote,
          quantity: (existing?.quantity ?? 0) + line.quantity
        };
      });

      return next;
    });

    setBarPulseKey((current) => current + 1);
  }

  async function submitOrder() {
    const qrSession = activeQrSession;
    if (!canOrder || !qrSession || cartLines.length === 0 || submitState.kind === "submitting") {
      if (!activeQrSession && currentMenu.orderSettings.enableDirectQrOrdering) {
        toastError("This table session has expired. Please scan the QR code at your table again to order.");
      }
      return;
    }

    const validation = firstInvalid(
      currentMenu.orderSettings.requireCustomerName ? validateRequired(customerName, "Name") : validateOptionalText(customerName, "Name", 120),
      validatePhone(customerWhatsApp, "WhatsApp number", currentMenu.orderSettings.requireCustomerWhatsApp),
      marketingConsent && !customerWhatsApp.trim()
        ? { isValid: false, message: "Enter WhatsApp number to receive updates." }
        : { isValid: true, message: null },
      validateOptionalText(notes, "Notes", 500),
      ...cartLines.map((line) => validateOptionalText(line.itemNote, `${line.item.name} note`, 200))
    );
    if (!validation.isValid) {
      toastError(validation.message ?? "Order details are invalid.");
      return;
    }

    const appliedPromoCode = valueOrNull(promoCode.toUpperCase());
    const input: CreatePublicQrOrderInput = {
      customerName: valueOrNull(customerName),
      customerWhatsApp: valueOrNull(customerWhatsApp),
      notes: valueOrNull(notes),
      promoCode: appliedPromoCode,
      marketingConsent,
      items: cartLines.map((line) => ({
        menuItemId: line.item.menuItemId,
        menuItemVariantId: line.variant?.menuItemVariantId ?? null,
        itemNote: valueOrNull(line.itemNote),
        quantity: line.quantity
      }))
    };

    setSubmitState({ kind: "submitting" });

    try {
      const created = await createPublicQrOrder(currentMenu.qrToken, qrSession.qrSessionId, input);
      const order = created.order;
      if (created.customerAccess && order.customerWhatsApp) {
        writeCustomerProfile(currentMenu.branchId, {
          version: 1,
          branchId: currentMenu.branchId,
          customerName: order.customerName ?? "",
          customerWhatsApp: order.customerWhatsApp,
          customerPhoneCountryCode: normalizeStoredCountryCode(customerPhoneCountryCode),
          deviceToken: created.customerAccess.token,
          expiresAtUtc: created.customerAccess.expiresAtUtc
        });

        try {
          setRecognizedCustomer(await getPublicCustomerByDevice(currentMenu.qrToken, created.customerAccess.token));
        } catch {
          // The order succeeded; history can be loaded on the next visit.
        }
      }
      clearQrMenuDraft(currentMenu.qrToken);
      setCart({});
      setNotes("");
      setPromoCode("");
      setMarketingConsent(false);
      setActiveView("cart");
      setSubmitState({ kind: "success", order, promoCode: appliedPromoCode });
    } catch (caught) {
      setSubmitState({ kind: "idle" });
      toastError(caught instanceof ApiError ? caught.message : "Order could not be submitted. Please try again.");
    }
  }

  function returnToMenu() {
    if (submitState.kind === "success") {
      setSubmitState({ kind: "idle" });
    }

    setActiveView("menu");
  }

  function openCustomerOrders() {
    setActiveView("customerOrders");
  }

  function handleHeaderBack() {
    if (activeView === "menu") {
      window.history.back();
      return;
    }

    if (activeView === "customerOrders") {
      returnToMenu();
      return;
    }

    returnToMenu();
  }

  function forgetRememberedCustomer() {
    clearCustomerProfile(currentMenu.branchId);
    setRecognizedCustomer(null);
    setCustomerName("");
    setCustomerWhatsApp("");
    setCustomerPhoneCountryCode("IN");
    setActiveView("menu");
    toastSuccess("Remembered customer details were removed from this device.");
  }

  async function submitWaiterCall() {
    const qrSession = activeQrSession;
    if (!canCallWaiter || !qrSession || waiterCallState.kind === "submitting") {
      if (!activeQrSession && currentMenu.orderSettings.waiterCallEnabled) {
        toastError("This table session has expired. Please scan the QR code at your table again to call waiter.");
      }
      return;
    }

    const validation = validateOptionalText(waiterCallNote, "Waiter-call note", 500);
    if (!validation.isValid) {
      toastError(validation.message ?? "Waiter-call note is invalid.");
      return;
    }

    setWaiterCallState({ kind: "submitting" });

    try {
      await createWaiterCall(currentMenu.qrToken, qrSession.qrSessionId, {
        customerName: valueOrNull(customerName),
        note: valueOrNull(waiterCallNote)
      });
      setWaiterCallNote("");
      setWaiterCallState({ kind: "idle" });
      toastSuccess("Staff has been notified.");
    } catch (caught) {
      setWaiterCallState({ kind: "idle" });
      toastError(caught instanceof ApiError ? caught.message : "Waiter could not be called. Please try again.");
    }
  }

  return (
    <>
      {activeView === "customerOrders" ? (
        <CustomerPreviousOrdersPage
          customer={recognizedCustomer}
          menuItemById={menuItemById}
          qrToken={currentMenu.qrToken}
          onBack={returnToMenu}
          onForgetCustomer={forgetRememberedCustomer}
          onReorder={(order) => {
            addRecentOrderToCart(order);
            setActiveView("cart");
          }}
        />
      ) : activeView === "cart" ? (
        <CartPage
          menuItemById={menuItemById}
          cartCount={cartCount}
          cartLines={cartLines}
          cartEstimate={cartEstimate}
          cartTotal={cartTotal}
          currentOffers={currentMenu.offers ?? []}
          customerName={customerName}
          customerPhoneCountryCode={customerPhoneCountryCode}
          customerWhatsApp={customerWhatsApp}
          marketingConsent={marketingConsent}
          notes={notes}
          promoCode={promoCode}
          orderSettings={currentMenu.orderSettings}
          qrSession={activeQrSession}
          qrToken={currentMenu.qrToken}
          submitState={submitState}
          onCustomerNameChange={setCustomerName}
          onCustomerPhoneCountryChange={setCustomerPhoneCountryCode}
          onCustomerWhatsAppChange={setCustomerWhatsApp}
          onDecrement={decrementItem}
          onItemNoteChange={updateCartLineNote}
          onMarketingConsentChange={setMarketingConsent}
          onBackToMenu={returnToMenu}
          onNotesChange={setNotes}
          onPromoCodeChange={setPromoCode}
          onSubmit={submitOrder}
        />
      ) : (
        <div className="flex min-h-dvh flex-col bg-[#fbfcfa]">
          <QrPageHeader
            branchName={currentMenu.branchName}
            cartCount={cartCount}
            recognizedCustomer={recognizedCustomer}
            tableName={currentMenu.tableName}
            onBack={handleHeaderBack}
            onCartOpen={() => setActiveView("cart")}
            onCustomerOrdersOpen={openCustomerOrders}
          />
          {flyingItem ? <FlyingCartItem key={flyingItem.key} item={flyingItem.item} /> : null}
          {hasExpiredQrSession ? <QrSessionExpiredNotice /> : null}
          {qrSessionState.kind === "unavailable" ? <QrSessionUnavailableNotice message={qrSessionState.message} /> : null}
          {!currentMenu.orderSettings.enableDirectQrOrdering ? <OrderingUnavailableNotice /> : null}

          <MenuHero
            categories={categories}
            dietFilter={dietFilter}
            menu={currentMenu}
            recognizedCustomer={recognizedCustomer}
            search={search}
            selectedCategoryId={selectedCategoryId}
            sortBy={sortBy}
            onCategoryOpen={() => setIsCategoryOpen(true)}
            onCategorySelect={setSelectedCategoryId}
            onCustomerOrdersOpen={openCustomerOrders}
            onOffersOpen={() => setIsOffersSheetOpen(true)}
            onDietFilterChange={setDietFilter}
            onSearchChange={setSearch}
            onSortChange={setSortBy}
          />

          <div className={`flex-1 space-y-7 bg-[#fbfcfa] px-4 ${canOrder && cartCount > 0 ? "pb-52" : "pb-28"}`}>
            {itemCount > 0 ? (
              visibleCategories.map((category) => (
                <MenuCategorySection
                  key={category.menuCategoryId}
                  canOrder={canOrder}
                  cart={cart}
                  category={category}
                  onAdd={addItem}
                  onChooseVariant={(item, categoryName) => setVariantPicker({ item, categoryName })}
                  onDecrement={decrementItem}
                />
              ))
            ) : (
              <MenuEmptyState canOrder={canOrder} search={search} />
            )}
          </div>

          {canOrder && cartCount > 0 ? (
            <CheckoutBar
              cartCount={cartCount}
              totalAmount={cartEstimate.totalAmount}
              pulseKey={barPulseKey}
              recentItem={recentItem ?? cartLines[cartLines.length - 1]?.item ?? null}
              onOpen={() => setActiveView("cart")}
            />
          ) : null}

          <QrBottomNav
            canCallWaiter={canCallWaiter}
            hasOffers={(currentMenu.offers ?? []).length > 0}
            onMenuOpen={() => setIsCategoryOpen(true)}
            onOffersOpen={() => setIsOffersSheetOpen(true)}
            onWaiterCallOpen={() => setIsWaiterCallSheetOpen(true)}
          />
          {variantPicker ? (
            <VariantPickerSheet
              categoryName={variantPicker.categoryName}
              item={variantPicker.item}
              onAdd={(variant) => addItem(variantPicker.item, variantPicker.categoryName, variant)}
              onClose={() => setVariantPicker(null)}
            />
          ) : null}
          {isOffersSheetOpen ? (
            <OffersSheet
              offers={currentMenu.offers ?? []}
              onClose={() => setIsOffersSheetOpen(false)}
            />
          ) : null}
          {isWaiterCallSheetOpen ? (
            <WaiterCallSheet
              canCallWaiter={canCallWaiter}
              note={waiterCallNote}
              state={waiterCallState}
              tableName={currentMenu.tableName}
              onClose={() => setIsWaiterCallSheetOpen(false)}
              onNoteChange={(value) => {
                setWaiterCallNote(value);
                if (waiterCallState.kind !== "submitting") {
                  setWaiterCallState({ kind: "idle" });
                }
              }}
              onSubmit={() => void submitWaiterCall()}
            />
          ) : null}
        </div>
      )}

      {isCategoryOpen ? (
        <CategorySheet
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onClose={() => setIsCategoryOpen(false)}
          onSelect={(categoryId) => {
            setSelectedCategoryId(categoryId);
            setIsCategoryOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function OrderingUnavailableNotice() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-5 text-amber-950">
      Ordering is paused for this table. You can still browse the menu.
    </div>
  );
}

function QrSessionExpiredNotice() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-5 text-amber-950">
      This table session has expired. Please scan the QR code at your table again before ordering or calling waiter.
    </div>
  );
}

function QrSessionUnavailableNotice({ message }: { message: string }) {
  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-950">
      {message}
    </div>
  );
}

function QrPageHeader({
  branchName,
  cartCount,
  onBack,
  onCartOpen,
  onCustomerOrdersOpen,
  recognizedCustomer,
  tableName
}: {
  branchName: string;
  cartCount: number;
  onBack: () => void;
  onCartOpen: () => void;
  onCustomerOrdersOpen: () => void;
  recognizedCustomer: PublicCustomerLookup | null;
  tableName: string;
}) {
  return (
    <header className="sticky top-0 z-30 bg-[#fbfcfa]/95 px-4 pb-3 pt-4 backdrop-blur">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3">
        <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-[#063d22]" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#d9f8e7] text-[#0f6b3a]">
            <Leaf className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-black leading-7 text-[#063d22]">{branchName}</h1>
            <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-normal text-[#60736a]">{tableName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCartOpen} className="relative grid h-11 w-11 place-items-center rounded-xl bg-[#064322] text-white shadow-[0_10px_22px_rgba(6,67,34,0.18)]" aria-label="Open cart">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#86ddb4] px-1 text-[11px] font-black leading-none text-[#063d22]">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </button>
          {recognizedCustomer ? (
            <button type="button" onClick={onCustomerOrdersOpen} className="grid h-11 w-11 place-items-center rounded-full bg-[#e6f5ed] text-[#063d22]" aria-label="Open previous orders">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function QrBottomNav({
  canCallWaiter,
  hasOffers,
  onMenuOpen,
  onOffersOpen,
  onWaiterCallOpen
}: {
  canCallWaiter: boolean;
  hasOffers: boolean;
  onMenuOpen: () => void;
  onOffersOpen: () => void;
  onWaiterCallOpen: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 pointer-events-none" aria-label="QR menu actions">
      <div className="mx-auto w-full max-w-md px-5 pb-3">
        <div className="pointer-events-auto grid grid-cols-3 gap-1.5 rounded-[1.35rem] border border-[#e3eee8]/80 bg-white/90 p-1.5 shadow-[0_16px_34px_rgba(6,67,34,0.16)] backdrop-blur-xl">
          <button type="button" onClick={onMenuOpen} className="flex h-12 flex-col items-center justify-center rounded-[1rem] bg-[#d9f8e7] text-[#063d22] shadow-sm">
            <Home className="h-4 w-4" aria-hidden="true" />
            <span className="mt-1 text-[11px] font-black">Home</span>
          </button>
          <button
            type="button"
            onClick={onOffersOpen}
            className="flex h-12 flex-col items-center justify-center rounded-[1rem] text-[#27352f] disabled:text-[#9aa8a0]"
            disabled={!hasOffers}
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            <span className="mt-1 text-[11px] font-black">Offers</span>
          </button>
          <button
            type="button"
            onClick={onWaiterCallOpen}
            className="flex h-12 flex-col items-center justify-center rounded-[1rem] text-[#27352f] disabled:text-[#9aa8a0]"
            disabled={!canCallWaiter}
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="mt-1 text-[11px] font-black">Service</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

function OffersSheet({ offers, onClose }: { offers: PublicQrMenuOffer[]; onClose: () => void }) {
  const sortedOffers = [...offers].sort((left, right) => left.displayOrder - right.displayOrder);

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto w-full max-w-md rounded-t-[2rem] border border-[#dce8e1] bg-white p-4 shadow-modal">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#dce8e1]" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#006d36]">Offers</p>
            <h2 className="mt-1 text-2xl font-black text-[#001c11]">Available deals</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-[#f4f7f6] text-[#001c11]" aria-label="Close offers">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {sortedOffers.length > 0 ? (
          <div className="mt-4 max-h-[60dvh] space-y-3 overflow-y-auto pr-1">
            {sortedOffers.map((offer) => (
              <article key={offer.branchOfferId} className="rounded-[1.4rem] border border-[#bfe6cf] bg-gradient-to-br from-[#f8fffb] to-[#e9fff1] p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#006d36] shadow-sm">
                    <TicketPercent className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-[#001c11]">{offer.title}</h3>
                    {offer.discountText ? <p className="mt-1 text-sm font-black text-[#006d36]">{offer.discountText}</p> : null}
                    {offer.subtitle ? <p className="mt-1 text-sm font-semibold leading-5 text-[#5a625e]">{offer.subtitle}</p> : null}
                    {offer.promoCode ? (
                      <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-[#001c11]">
                        Code: {offer.promoCode}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-[#f4f7f6] p-5 text-center">
            <p className="text-sm font-black text-[#001c11]">No offers right now</p>
            <p className="mt-1 text-sm font-semibold text-[#5a625e]">Please check again later.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function WaiterCallSheet({
  canCallWaiter,
  note,
  onClose,
  onNoteChange,
  onSubmit,
  state,
  tableName
}: {
  canCallWaiter: boolean;
  note: string;
  onClose: () => void;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
  state: WaiterCallState;
  tableName: string;
}) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto w-full max-w-md rounded-t-[2rem] border border-[#dce8e1] bg-white p-4 shadow-modal">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#dce8e1]" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#006d36]">{tableName}</p>
            <h2 className="mt-1 text-2xl font-black text-[#001c11]">Call waiter</h2>
            <p className="mt-1 text-sm font-semibold text-[#5a625e]">Need water, bill help, or service? Add a note if needed.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-[#f4f7f6] text-[#001c11]" aria-label="Close waiter call">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {state.kind === "success" ? (
          <div className="mt-4 rounded-2xl border border-[#bfe6cf] bg-[#f1fbf5] p-4 text-sm font-black text-[#006d36]">
            Staff has been notified.
          </div>
        ) : null}
        {state.kind === "error" ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-900">
            {state.message}
          </div>
        ) : null}

        <textarea
          className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-[#d9e4df] bg-[#f8fbf9] px-4 py-3 text-sm font-semibold text-[#001c11] outline-none focus:border-[#006d36]"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          maxLength={500}
          placeholder="Optional note, e.g. please bring water"
        />
        <button
          type="button"
          className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#001c11] px-5 text-base font-black text-white shadow-[0_12px_28px_rgba(0,28,17,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onSubmit}
          disabled={!canCallWaiter || state.kind === "submitting"}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {state.kind === "submitting" ? "Calling" : "Call waiter"}
        </button>
      </div>
    </aside>
  );
}

function MenuEmptyState({ canOrder, search }: { canOrder: boolean; search?: string }) {
  const hasSearch = Boolean(search?.trim());

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
      <ReceiptText className="h-9 w-9 text-gold" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-extrabold text-ink">{hasSearch ? "No matching items" : "No items available"}</h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-on-surface-variant">
        {hasSearch
          ? "Try another dish name or category."
          : canOrder
            ? "Please check back in a few minutes."
            : "Ordering is currently paused by the restaurant."}
      </p>
    </div>
  );
}

function MenuHero({
  categories,
  dietFilter,
  menu,
  onCategoryOpen,
  onCategorySelect,
  onCustomerOrdersOpen,
  onOffersOpen,
  onDietFilterChange,
  onSearchChange,
  onSortChange,
  recognizedCustomer,
  search,
  selectedCategoryId,
  sortBy
}: {
  categories: PublicQrMenuCategory[];
  dietFilter: DietQuickFilter;
  menu: PublicQrMenu;
  onCategoryOpen: () => void;
  onCategorySelect: (categoryId: string) => void;
  onCustomerOrdersOpen: () => void;
  onOffersOpen: () => void;
  onDietFilterChange: (value: DietQuickFilter) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: MenuSortCode) => void;
  recognizedCustomer: PublicCustomerLookup | null;
  search: string;
  selectedCategoryId: string;
  sortBy: MenuSortCode;
}) {
  const availableCategories = categories.filter((category) => category.items.length > 0);
  const offers = (menu.offers ?? []).sort((left, right) => left.displayOrder - right.displayOrder);
  const compactOffers = offers.slice(0, 3);
  const totalItemCount = availableCategories.reduce((total, category) => total + category.items.length, 0);

  return (
    <section className="bg-[#fbfcfa] px-4 pb-5 pt-2">
      {recognizedCustomer ? (
        <button
          type="button"
          onClick={onCustomerOrdersOpen}
          className="group mb-4 flex w-full items-center gap-3 overflow-hidden rounded-[22px] border border-[#caead8] bg-[#f1fbf5] p-3 text-left shadow-[0_12px_26px_rgba(0,44,24,0.08)] transition-transform active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#064322] text-white shadow-sm">
            <ReceiptText className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-normal text-[#0f7a43]">Returning customer</span>
            <span className="mt-0.5 block truncate text-base font-black leading-tight text-[#063d22]">Welcome back, {recognizedCustomer.name ?? "Customer"}</span>
            <span className="mt-0.5 block text-xs font-semibold text-[#60736a]">Previous orders and reorders</span>
          </span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#0f7a43] shadow-sm transition-transform group-active:translate-x-0.5">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </span>
        </button>
      ) : null}

      <div className="mb-4 flex h-14 items-center gap-3 rounded-2xl border border-[#e8eee9] bg-[#f1f3f1] px-4 shadow-inner">
        <Search className="h-6 w-6 shrink-0 text-[#25342d]" aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[#202824] outline-none placeholder:text-[#68756e]"
          placeholder="Search dishes..."
          type="search"
        />
        {search ? (
          <button type="button" onClick={() => onSearchChange("")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#60736a]" aria-label="Clear search">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={onCategoryOpen} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#466155]" aria-label="Open categories">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-2">
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#d9e4df] bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => onDietFilterChange(dietFilter === "veg" ? "all" : "veg")}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-black uppercase tracking-normal transition-colors ${
              dietFilter === "veg" ? "bg-[#9be8bf] text-[#063d22]" : "text-[#466155]"
            }`}
            aria-pressed={dietFilter === "veg"}
            aria-label="Show vegetarian items"
          >
            <DietSymbol type="veg" />
            <span>Veg</span>
          </button>
          <button
            type="button"
            onClick={() => onDietFilterChange(dietFilter === "nonveg" ? "all" : "nonveg")}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-black uppercase tracking-normal transition-colors ${
              dietFilter === "nonveg" ? "bg-[#ffd9b5] text-[#4d2500]" : "text-[#466155]"
            }`}
            aria-pressed={dietFilter === "nonveg"}
            aria-label="Show non-vegetarian items"
          >
            <DietSymbol type="nonveg" />
            <span>Non-veg</span>
          </button>
        </div>

        <label className="flex h-12 min-w-0 items-center gap-2 rounded-2xl border border-[#d9e4df] bg-white px-3 shadow-sm">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#466155]" aria-hidden="true" />
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as MenuSortCode)}
            className="min-w-0 flex-1 bg-transparent text-xs font-bold text-[#001c11] outline-none"
            aria-label="Sort menu"
          >
            <option value="recommended">Recommended</option>
            <option value="priceAsc">Price: low to high</option>
            <option value="priceDesc">Price: high to low</option>
            <option value="nameAsc">Name: A to Z</option>
          </select>
        </label>
      </div>

      {availableCategories.length > 0 ? (
        <div className="-mx-4 mb-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryPill
            active={selectedCategoryId === AllPublicCategoryId}
            count={totalItemCount}
            icon={<Flame className="h-5 w-5" aria-hidden="true" />}
            label="All"
            onClick={() => onCategorySelect(AllPublicCategoryId)}
          />
          {availableCategories.map((category) => (
            <CategoryPill
              active={selectedCategoryId === category.menuCategoryId}
              count={category.items.length}
              icon={<CategoryIcon name={category.name} />}
              key={category.menuCategoryId}
              label={category.name}
              onClick={() => onCategorySelect(category.menuCategoryId)}
            />
          ))}
        </div>
      ) : null}

      {compactOffers.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-normal text-[#0f7a43]">Today&apos;s offers</p>
              <h3 className="mt-0.5 text-base font-black text-[#063d22]">Save on your order</h3>
            </div>
            <button type="button" onClick={onOffersOpen} className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#0f7a43] shadow-sm">
              View all
            </button>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {compactOffers.map((offer) => (
              <button
                key={offer.branchOfferId}
                type="button"
                onClick={onOffersOpen}
                className="flex min-w-[13.5rem] max-w-[15rem] shrink-0 items-center gap-3 rounded-[1.25rem] border border-[#c9ead7] bg-white p-3 text-left shadow-[0_10px_22px_rgba(0,44,24,0.06)]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#e9fff1] text-[#0f7a43]">
                  <TicketPercent className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm font-black text-[#063d22]">{offer.title}</span>
                  <span className="mt-0.5 block line-clamp-1 text-xs font-semibold text-[#60736a]">
                    {offer.discountText ?? offer.subtitle ?? "Limited-time branch offer"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CategoryPill({
  active,
  count,
  icon,
  label,
  onClick
}: {
  active: boolean;
  count: number;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid min-h-[4.65rem] min-w-[5.4rem] shrink-0 place-items-center gap-1 rounded-2xl border px-3 py-2 text-center shadow-sm transition active:scale-[0.98] ${
        active ? "border-[#91ddb5] bg-[#8fe3b7] text-[#063d22]" : "border-[#8bdab0] bg-white text-[#163a2a]"
      }`}
      aria-pressed={active}
    >
      <span className="grid h-6 place-items-center">{icon}</span>
      <span className="line-clamp-1 max-w-[4.7rem] break-words text-sm font-bold leading-5">{label}</span>
      <span className={active ? "text-[10px] font-black text-[#063d22]/70" : "text-[10px] font-bold text-[#60736a]"}>
        {count}
      </span>
    </button>
  );
}

function CategoryIcon({ name }: { name: string }) {
  const normalized = name.toLowerCase();

  if (normalized.includes("salad") || normalized.includes("veg") || normalized.includes("green")) {
    return <Leaf className="h-5 w-5" aria-hidden="true" />;
  }

  if (normalized.includes("popular") || normalized.includes("special") || normalized.includes("best")) {
    return <Flame className="h-5 w-5" aria-hidden="true" />;
  }

  return <Utensils className="h-5 w-5" aria-hidden="true" />;
}

function MenuCategorySection({
  canOrder,
  cart,
  category,
  onAdd,
  onChooseVariant,
  onDecrement
}: {
  canOrder: boolean;
  cart: Record<string, CartLine>;
  category: PublicQrMenuCategory;
  onAdd: (item: PublicQrMenuItem, categoryName: string, variant?: PublicQrMenuItem["variants"][number] | null) => void;
  onChooseVariant: (item: PublicQrMenuItem, categoryName: string) => void;
  onDecrement: (cartLineId: string) => void;
}) {
  const items = category.items;

  return (
    <section id={`category-${category.menuCategoryId}`} className="scroll-mt-28">
      <div className="flex items-center justify-between gap-3 pt-1">
        <h2 className="min-w-0 truncate text-[22px] font-black leading-[1.25] text-[#063d22]">{category.name}</h2>
        <p className="shrink-0 rounded-full bg-[#eef8f2] px-3 py-1 text-[11px] font-black uppercase tracking-normal text-[#0f7a43]">{items.length} items</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {items.map((item) => {
          const variants = item.variants ?? [];
          const hasVariants = variants.length > 0;
          const singleCartLineId = getCartLineId(item.menuItemId, null);
          const quantity = Object.values(cart)
            .filter((line) => line.item.menuItemId === item.menuItemId)
            .reduce((total, line) => total + line.quantity, 0);
          const singleQuantity = cart[singleCartLineId]?.quantity ?? 0;
          const displayPrice = hasVariants ? Math.min(...variants.map((variant) => variant.price)) : item.price;

          return (
            <MenuDishCard
              canOrder={canOrder}
              categoryName={category.name}
              displayPrice={displayPrice}
              hasVariants={hasVariants}
              item={item}
              key={item.menuItemId}
              quantity={quantity}
              singleCartLineId={singleCartLineId}
              singleQuantity={singleQuantity}
              onAdd={onAdd}
              onChooseVariant={onChooseVariant}
              onDecrement={onDecrement}
            />
          );
        })}
      </div>
    </section>
  );
}

function MenuDishCard({
  canOrder,
  categoryName,
  displayPrice,
  hasVariants,
  item,
  onAdd,
  onChooseVariant,
  onDecrement,
  quantity,
  singleCartLineId,
  singleQuantity
}: {
  canOrder: boolean;
  categoryName: string;
  displayPrice: number;
  hasVariants: boolean;
  item: PublicQrMenuItem;
  onAdd: (item: PublicQrMenuItem, categoryName: string, variant?: PublicQrMenuItem["variants"][number] | null) => void;
  onChooseVariant: (item: PublicQrMenuItem, categoryName: string) => void;
  onDecrement: (cartLineId: string) => void;
  quantity: number;
  singleCartLineId: string;
  singleQuantity: number;
}) {
  const priceLabel = hasVariants ? `From ${formatPrice(displayPrice)}` : formatPrice(displayPrice);

  return (
    <article className="relative min-w-0 overflow-hidden rounded-[22px] border border-[#eef2ee] bg-white shadow-[0_12px_26px_rgba(6,67,34,0.11)] transition-transform active:scale-[0.99]">
      <div className="aspect-[1.22/1] overflow-hidden bg-[#eef8f2]">
        <FoodThumb imageAltText={item.imageAltText} imageUrl={item.imageUrl} name={item.name} className="h-full min-h-0 rounded-none" />
      </div>

      <div className="min-h-[8.9rem] p-3 pb-12">
        <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
          <MenuItemDietIcon dietTypeCode={item.dietTypeCode} />
          {hasVariants ? <span className="rounded-full bg-[#eef8f2] px-2 py-0.5 text-[10px] font-black text-[#0f7a43]">Options</span> : null}
        </div>
        <h3 className="line-clamp-2 min-h-[2.35rem] break-words text-[15px] font-black leading-[1.18] text-[#08291a]">{item.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2.35rem] break-words text-[12px] font-medium leading-[1.25] text-[#27352f]">
          {item.description || "Freshly prepared by the kitchen."}
        </p>
        <p className="mt-2 truncate pr-11 text-[18px] font-black leading-6 text-[#063d22]">{priceLabel}</p>
      </div>

      {canOrder ? (
        hasVariants ? (
          <button
            type="button"
            className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-xl bg-[#8fe3b7] text-[#063d22] shadow-[0_8px_18px_rgba(6,67,34,0.18)]"
            onClick={() => onChooseVariant(item, categoryName)}
            aria-label={`Choose variant for ${item.name}`}
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            {quantity > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#063d22] px-1 text-[10px] font-black text-white">
                {quantity > 99 ? "99+" : quantity}
              </span>
            ) : null}
          </button>
        ) : singleQuantity > 0 ? (
          <div className="absolute bottom-3 right-3 flex h-10 w-[6.45rem] items-center justify-between overflow-hidden rounded-xl bg-[#8fe3b7] text-[#063d22] shadow-[0_8px_18px_rgba(6,67,34,0.18)]">
            <button
              type="button"
              className="grid h-10 w-8 place-items-center"
              onClick={() => onDecrement(singleCartLineId)}
              aria-label={`Remove one ${item.name}`}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="grid h-10 min-w-8 place-items-center text-sm font-black">{singleQuantity}</span>
            <button
              type="button"
              className="grid h-10 w-8 place-items-center"
              onClick={() => onAdd(item, categoryName, null)}
              aria-label={`Add one ${item.name}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-xl bg-[#8fe3b7] text-[#063d22] shadow-[0_8px_18px_rgba(6,67,34,0.18)]"
            onClick={() => onAdd(item, categoryName, null)}
            aria-label={`Add ${item.name}`}
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        )
      ) : null}
    </article>
  );
}

function FlyingCartItem({ item }: { item: PublicQrMenuItem }) {
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -ml-9">
      <div className="qr-fly-to-cart grid h-16 w-16 place-items-center rounded-full bg-white shadow-modal ring-4 ring-[#e9fbf8]">
        <FoodThumb imageAltText={item.imageAltText} imageUrl={item.imageUrl} name={item.name} compact />
      </div>
    </div>
  );
}

function CheckoutBar({
  cartCount,
  totalAmount,
  pulseKey,
  recentItem,
  onOpen
}: {
  cartCount: number;
  totalAmount: number;
  pulseKey: number;
  recentItem: PublicQrMenuItem | null;
  onOpen: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[5.15rem] z-20 pointer-events-none">
      <div className="mx-auto w-full max-w-md px-4 pb-3">
        <button
          type="button"
          className="pointer-events-auto flex min-h-16 w-full items-center gap-3 rounded-[24px] bg-[#001c11] px-4 py-3 text-white shadow-modal"
          onClick={onOpen}
        >
          <span key={pulseKey} className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 shadow-sm animate-[pulse_650ms_ease-out_1]">
            {recentItem ? <FoodThumb imageAltText={recentItem.imageAltText} imageUrl={recentItem.imageUrl} name={recentItem.name} compact /> : <ShoppingCart className="h-5 w-5 text-white" aria-hidden="true" />}
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#83fba5] px-1 text-[11px] font-black leading-none text-[#00210c]">
              {cartCount}
            </span>
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-lg font-black">View Cart</span>
            <span className="mt-0.5 block truncate text-xs font-semibold uppercase tracking-[0.12em] text-white/55">{recentItem?.name ?? `${cartCount} selected items`}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3 text-xl font-black">
            {formatPrice(totalAmount)}
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#00743a]">
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

function CartPage({
  cartCount,
  cartLines,
  cartEstimate,
  cartTotal,
  currentOffers,
  customerName,
  customerPhoneCountryCode,
  customerWhatsApp,
  marketingConsent,
  notes,
  promoCode,
  orderSettings,
  qrSession,
  qrToken,
  menuItemById,
  submitState,
  onCustomerNameChange,
  onCustomerPhoneCountryChange,
  onCustomerWhatsAppChange,
  onDecrement,
  onItemNoteChange,
  onMarketingConsentChange,
  onBackToMenu,
  onNotesChange,
  onPromoCodeChange,
  onSubmit
}: {
  cartCount: number;
  cartLines: CartLine[];
  cartEstimate: CartEstimate;
  cartTotal: number;
  currentOffers: PublicQrMenuOffer[];
  customerName: string;
  customerPhoneCountryCode: string;
  customerWhatsApp: string;
  marketingConsent: boolean;
  notes: string;
  promoCode: string;
  orderSettings: PublicQrMenu["orderSettings"];
  qrSession: PublicQrSession | null;
  qrToken: string;
  menuItemById: Map<string, PublicQrMenuItem>;
  submitState: SubmitState;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneCountryChange: (value: string) => void;
  onCustomerWhatsAppChange: (value: string) => void;
  onDecrement: (cartLineId: string) => void;
  onItemNoteChange: (cartLineId: string, value: string) => void;
  onMarketingConsentChange: (value: boolean) => void;
  onBackToMenu: () => void;
  onNotesChange: (value: string) => void;
  onPromoCodeChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [promoDraft, setPromoDraft] = useState(promoCode);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [isPromoApplying, setIsPromoApplying] = useState(false);

  if (submitState.kind === "success") {
    return <OrderPlacedView menuItemById={menuItemById} order={submitState.order} promoCode={submitState.promoCode} qrToken={qrToken} onBackToMenu={onBackToMenu} />;
  }

  function openPromoDialog() {
    setPromoDraft(promoCode);
    setPromoMessage(null);
    setPromoDialogOpen(true);
  }

  async function applyPromoCode() {
    const cleanCode = promoDraft.trim().toUpperCase().replace(/\s+/g, "").slice(0, 40);
    if (!cleanCode) {
      onPromoCodeChange("");
      setPromoMessage(null);
      setPromoDialogOpen(false);
      return;
    }

    if (!qrSession) {
      setPromoMessage("This table session has expired. Please scan the QR code again.");
      return;
    }

    if (!customerWhatsApp.trim()) {
      setPromoMessage("Enter WhatsApp number before applying a coupon.");
      return;
    }

    setIsPromoApplying(true);
    try {
      const validation = await validatePublicQrPromoCode(qrToken, qrSession.qrSessionId, {
        customerWhatsApp: valueOrNull(customerWhatsApp),
        promoCode: cleanCode,
        items: cartLines.map((line) => ({
          menuItemId: line.item.menuItemId,
          menuItemVariantId: line.variant?.menuItemVariantId ?? null,
          itemNote: valueOrNull(line.itemNote),
          quantity: line.quantity
        }))
      });

      const localOffer = currentOffers.find((offer) => offer.branchOfferId === validation.branchOfferId);
      if (!localOffer && validation.discountAmount <= 0) {
        setPromoMessage("This code is not eligible for the current cart.");
        return;
      }

      onPromoCodeChange(cleanCode);
      setPromoMessage(null);
      setPromoDialogOpen(false);
    } catch (caught) {
      setPromoMessage(caught instanceof ApiError ? caught.message : "Promo code could not be checked.");
    } finally {
      setIsPromoApplying(false);
    }
  }

  return (
    <section className="min-h-dvh flex-1 bg-gradient-to-b from-[#e9fff5] via-[#fbfcfa] to-white px-4 pb-36 pt-5">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-3">
        <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-[#063d22]" onClick={onBackToMenu} aria-label="Back to menu">
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-2xl font-black leading-8 text-[#0a1510]">Checkout</h1>
          <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-[#60736a]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#83dcb0]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#83dcb0]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#83dcb0]" />
            <span>Review order</span>
          </div>
        </div>
        <span aria-hidden="true" />
      </div>

      {cartLines.length > 0 ? (
        <>
          <section className="mt-5 overflow-hidden rounded-[28px] border border-white/70 bg-white/95 p-4 shadow-[0_18px_38px_rgba(6,67,34,0.13)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-black uppercase tracking-normal text-[#565b58]">Order summary</p>
                <h2 className="mt-2 text-xl font-black text-[#0a1510]">Cart items</h2>
              </div>
              <span className="grid h-8 min-w-8 place-items-center rounded-full bg-[#d9f8e7] px-2 text-sm font-black text-[#0f7a43]">{cartCount}</span>
            </div>

            <div className="mt-4 divide-y divide-[#edf2ef] rounded-[18px] border border-[#edf2ef] bg-[#fbfcfa]">
              {cartLines.map((line) => (
                <div key={line.cartLineId} className="p-3">
                  <div className="grid grid-cols-[3.7rem_minmax(0,1fr)_auto] gap-3">
                    <FoodThumb imageAltText={line.item.imageAltText} imageUrl={line.item.imageUrl} name={line.item.name} compact className="h-14 w-14 rounded-xl" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words text-[15px] font-semibold leading-5 text-[#0a1510]">{formatCartItemName(line)}</p>
                      <p className="mt-1 text-sm font-semibold text-[#0a1510]">
                        {formatPrice(getCartLinePrice(line))} x {line.quantity}
                      </p>
                      <DietTypePill dietTypeCode={line.item.dietTypeCode} compact />
                    </div>
                    <div className="flex flex-col items-end justify-between gap-2">
                      <p className="whitespace-nowrap text-base font-black text-[#0a1510]">{formatPrice(getCartLinePrice(line) * line.quantity)}</p>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-xl border border-[#c9ead7] bg-white text-[#0f7a43]"
                        onClick={() => onDecrement(line.cartLineId)}
                        aria-label={`Remove one ${line.item.name}`}
                      >
                        {line.quantity === 1 ? <Trash2 className="h-4 w-4" aria-hidden="true" /> : <Minus className="h-4 w-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                  <label className="mt-3 block">
                    <span className="text-[11px] font-black uppercase tracking-normal text-[#60736a]">Item note</span>
                    <textarea
                      className="mt-1 min-h-12 w-full resize-none rounded-xl border border-[#e1ebe5] bg-white px-3 py-2 text-sm outline-none focus:border-[#0f7a43]"
                      value={line.itemNote}
                      onChange={(event) => onItemNoteChange(line.cartLineId, event.target.value)}
                      maxLength={200}
                      placeholder="Less spicy, no onion, no ice..."
                    />
                  </label>
                </div>
              ))}
            </div>

            <button type="button" className="mt-4 flex w-full items-center justify-between rounded-[18px] border border-dashed border-[#9cddb9] bg-[#f1fbf5] p-3 text-left transition-transform active:scale-[0.99]" onClick={openPromoDialog}>
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#0f7a43]">
                  <TicketPercent className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[#063d22]">{promoCode ? `Code applied: ${promoCode}` : "Apply coupon"}</span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-[#0f7a43]">{promoCode ? "Tap to change coupon" : "Check available promo benefits"}</span>
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#0f7a43]" aria-hidden="true" />
            </button>

            <div className="mt-5">
              <h2 className="text-base font-black uppercase tracking-normal text-[#565b58]">Price breakdown</h2>
              <div className="mt-3 space-y-2 text-base text-[#0a1510]">
                <div className="flex items-center justify-between gap-3">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatPrice(cartTotal)}</span>
                </div>
                {cartEstimate.discountAmount > 0 ? (
                  <div className="rounded-xl border border-[#c9ead7] bg-[#f1fbf5] px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-[#0f7a43]">{cartEstimate.appliedOffer?.title ?? "Offer discount"}:</span>
                      <span className="font-semibold text-[#0f7a43]">-{formatPrice(cartEstimate.discountAmount)}</span>
                    </div>
                    {cartEstimate.appliedOffer?.discountText ? <p className="mt-1 text-xs font-semibold text-[#60736a]">{cartEstimate.appliedOffer.discountText}</p> : null}
                  </div>
                ) : null}
                {cartEstimate.taxAmount > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Tax:</span>
                    <span className="font-semibold">{formatPrice(cartEstimate.taxAmount)}</span>
                  </div>
                ) : null}
                {cartEstimate.serviceChargeAmount > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Service charge:</span>
                    <span className="font-semibold">{formatPrice(cartEstimate.serviceChargeAmount)}</span>
                  </div>
                ) : null}
                {Math.abs(cartEstimate.roundingAmount) >= 0.01 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Rounding:</span>
                    <span className="font-semibold">{formatSignedPrice(cartEstimate.roundingAmount)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-4 shadow-[0_10px_22px_rgba(6,67,34,0.12)]">
              <span className="text-2xl font-black text-[#0a1510]">Order Total</span>
              <span className="text-2xl font-black text-[#0a1510]">{formatPrice(cartEstimate.totalAmount)}</span>
            </div>

            {promoCode ? (
              <button type="button" className="mt-3 text-xs font-black text-[#9a3d00]" onClick={() => onPromoCodeChange("")}>
                Remove coupon
              </button>
            ) : null}

            <div className="mt-5 space-y-4">
              <div>
                <h2 className="text-xl font-black text-[#0a1510]">Payment method</h2>
                <div className="mt-2 rounded-[16px] border border-[#0f6b3a] bg-[#f1fbf5] px-4 py-3">
                  <p className="text-sm font-black text-[#063d22]">Pay at restaurant</p>
                  <p className="mt-1 text-sm leading-5 text-[#0a1510]">Your order will be sent to the staff. Payment can be collected at the counter or table.</p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-black text-[#0a1510]">Customer details</h2>
                <div className="mt-2 grid gap-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-normal text-[#60736a]">
                      Name{orderSettings.requireCustomerName ? " *" : ""}
                    </span>
                    <input
                      className="mt-1 h-12 w-full rounded-xl border border-[#d9e4df] bg-white px-3 text-sm outline-none focus:border-[#0f7a43]"
                      value={customerName}
                      onChange={(event) => onCustomerNameChange(event.target.value)}
                      maxLength={120}
                    />
                  </label>
                  <CountryPhoneInput
                    countryCode={customerPhoneCountryCode}
                    label="WhatsApp"
                    required={orderSettings.requireCustomerWhatsApp}
                    value={customerWhatsApp}
                    onChange={onCustomerWhatsAppChange}
                    onCountryChange={(countryCode, value) => {
                      onCustomerPhoneCountryChange(countryCode);
                      onCustomerWhatsAppChange(value);
                    }}
                  />
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-normal text-[#60736a]">Order notes</span>
                <textarea
                  className="mt-1 min-h-20 w-full resize-none rounded-xl border border-[#d9e4df] bg-white px-3 py-2 text-sm outline-none focus:border-[#0f7a43]"
                  value={notes}
                  onChange={(event) => onNotesChange(event.target.value)}
                  maxLength={500}
                  placeholder="Any table instructions for the staff"
                />
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-[#d9e4df] bg-white p-4">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(event) => onMarketingConsentChange(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#b9c8c0] text-[#0f7a43] focus:ring-[#0f7a43]"
                />
                <span className="text-sm font-semibold leading-5 text-[#414844]">
                  Send me WhatsApp updates and offers from this restaurant.
                </span>
              </label>
            </div>
          </section>

          {promoDialogOpen ? (
            <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 px-4 pb-4 sm:place-items-center sm:p-4">
              <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-modal">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-normal text-[#0f7a43]">Promo code</p>
                    <h2 className="mt-1 text-xl font-black text-[#0a1510]">Apply coupon</h2>
                  </div>
                  <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-[#f8f9fa] text-[#0a1510]" onClick={() => setPromoDialogOpen(false)} aria-label="Close promo code">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <label className="mt-4 block">
                  <span className="text-xs font-bold uppercase tracking-normal text-[#60736a]">Enter code</span>
                  <input
                    className="mt-1 h-12 w-full rounded-xl border border-[#d9e4df] bg-[#f8f9fa] px-3 text-sm font-black uppercase tracking-normal outline-none focus:border-[#0f7a43]"
                    value={promoDraft}
                    onChange={(event) => {
                      setPromoDraft(event.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 40));
                      setPromoMessage(null);
                    }}
                    placeholder="Enter code"
                    maxLength={40}
                    autoFocus
                  />
                </label>
                {promoMessage ? <p className="mt-2 text-xs font-semibold text-[#9a3d00]">{promoMessage}</p> : null}
                <button type="button" className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#063d22] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60" onClick={applyPromoCode} disabled={isPromoApplying}>
                  {isPromoApplying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {isPromoApplying ? "Checking" : "Apply"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(6,67,34,0.12)] backdrop-blur">
            <div className="mx-auto flex max-w-md items-center gap-4">
              <button
                type="button"
                className="inline-flex h-14 min-w-0 flex-1 items-center justify-center gap-3 rounded-[1.35rem] bg-[#064322] px-5 text-base font-black uppercase tracking-normal text-white shadow-[0_12px_28px_rgba(6,67,34,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={cartCount === 0 || submitState.kind === "submitting"}
                onClick={onSubmit}
              >
                {submitState.kind === "submitting" ? "Sending" : "Place order"}
                <span className="font-black text-white/65">{formatPrice(cartEstimate.totalAmount)}</span>
              </button>
            </div>
            <p className="mx-auto mt-2 max-w-md text-center text-xs font-semibold text-[#60736a]">You are securely sending your order to the restaurant.</p>
          </div>
        </>
      ) : (
        <div className="mt-8 flex min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-[#d9e4df] bg-white p-6 text-center shadow-[0_18px_38px_rgba(6,67,34,0.10)]">
          <ReceiptText className="h-9 w-9 text-[#0f7a43]" aria-hidden="true" />
          <p className="mt-4 text-lg font-black text-[#0a1510]">Your cart is empty</p>
          <p className="mt-2 text-sm leading-6 text-[#60736a]">Add menu items to see total amount and place an order.</p>
          <button type="button" className="mt-5 rounded-xl bg-[#064322] px-4 py-3 text-sm font-black text-white" onClick={onBackToMenu}>
            Back to menu
          </button>
        </div>
      )}
    </section>
  );
}

function OrderPlacedView({
  menuItemById,
  order,
  promoCode,
  qrToken,
  onBackToMenu
}: {
  menuItemById: Map<string, PublicQrMenuItem>;
  order: PublicQrOrder;
  promoCode: string | null;
  qrToken: string;
  onBackToMenu: () => void;
}) {
  const trackingHref = `/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(order.orderId)}`;

  return (
    <section className="min-h-dvh flex-1 bg-[#f8f9fa] px-4 py-5 pb-8">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#006d36]">Order confirmed</p>
        <h1 className="mt-1 text-2xl font-black leading-8 text-[#001c11]">Order placed</h1>
      </div>
      <div className="rounded-2xl border border-[#d9e4df] bg-white p-5 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-[#001c11]">Order placed</h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">Staff received your order.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-[#d9e4df] bg-[#f8f9fa] p-3">
            <p className="text-xs font-bold uppercase text-on-surface-variant">Order</p>
            <p className="mt-1 text-lg font-black text-[#001c11]">#{shortOrderCode(order.orderId)}</p>
          </div>
          <div className="rounded-xl border border-[#d9e4df] bg-[#f8f9fa] p-3">
            <p className="text-xs font-bold uppercase text-on-surface-variant">Status</p>
            <p className="mt-1 text-lg font-black text-[#006d36]">{order.orderStatusCode}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e6eeea] pb-3">
          <h3 className="text-sm font-black uppercase text-[#001c11]">Items</h3>
          <p className="text-sm font-bold text-on-surface-variant">{order.items.length} item{order.items.length === 1 ? "" : "s"}</p>
        </div>

        <div className="divide-y divide-[#e6eeea]">
          {order.items.map((item) => (
            <div key={item.orderItemId} className="grid grid-cols-[3.5rem_1fr_auto] gap-3 py-3">
              <OrderItemThumb item={menuItemById.get(item.menuItemId)} name={item.menuItemName} />
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-[#001c11]">{formatOrderItemName(item.menuItemName, item.variantName)}</p>
                <DietTypePill dietTypeCode={item.dietTypeCode} compact />
                <p className="mt-1 text-xs text-on-surface-variant">
                  {item.quantity} x {formatPrice(item.unitPrice)}
                </p>
                {item.itemNote ? <p className="mt-1 rounded-lg bg-[#f8f9fa] px-2 py-1 text-xs font-semibold text-[#5a625e]">{item.itemNote}</p> : null}
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
            {promoCode ? `Promo code ${promoCode}` : order.appliedOfferTitle ?? "Offer applied"} saved {formatPrice(order.appliedOfferDiscountAmount)}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        <Link
          href={trackingHref}
          className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-[#006d36] px-4 text-sm font-black text-white"
        >
          Track order
        </Link>
        <button
          type="button"
          className="h-14 w-full rounded-2xl bg-[#001c11] px-4 text-sm font-black text-white"
          onClick={onBackToMenu}
        >
          Back to menu
        </button>
      </div>
    </section>
  );
}

function CustomerPreviousOrdersPage({
  customer,
  menuItemById,
  qrToken,
  onBack,
  onForgetCustomer,
  onReorder
}: {
  customer: PublicCustomerLookup | null;
  menuItemById: Map<string, PublicQrMenuItem>;
  qrToken: string;
  onBack: () => void;
  onForgetCustomer: () => void;
  onReorder: (order: PublicCustomerRecentOrder) => void;
}) {
  const orders = customer?.recentOrders ?? [];

  return (
    <section className="min-h-dvh flex-1 bg-[#f8f9fa] px-4 py-5 pb-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#006d36]">
            {orders.length} previous order{orders.length === 1 ? "" : "s"}
          </p>
          <h1 className="mt-1 truncate text-2xl font-black leading-8 text-[#001c11]">
            {customer?.name ? `${customer.name}'s orders` : "Previous orders"}
          </h1>
        </div>
        <button
          type="button"
          className="rounded-full border border-[#d9e4df] bg-white px-4 py-2 text-sm font-black text-[#001c11] shadow-sm"
          onClick={onBack}
        >
          Back
        </button>
      </div>

      {customer ? (
        <div className="mb-4 rounded-2xl border border-[#bfe6cf] bg-[#f1fbf5] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#006d36]">Welcome back</p>
              <p className="mt-1 truncate text-lg font-black text-[#001c11]">{customer.name ?? "Customer"}</p>
              <p className="mt-1 text-sm font-semibold text-[#5a625e]">{maskPhoneNumber(customer.whatsAppNumber)}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-[#bfe6cf] bg-white px-3 py-2 text-xs font-black text-[#00552a]"
              onClick={onForgetCustomer}
            >
              Forget me
            </button>
          </div>
        </div>
      ) : null}

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.orderId} className="rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Order</p>
                  <h3 className="mt-1 text-lg font-black text-[#001c11]">#{shortOrderCode(order.orderId)}</h3>
                  <p className="mt-1 text-xs text-on-surface-variant">{formatOrderDate(order.createdAtUtc)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Total</p>
                  <p className="mt-1 text-base font-black text-[#006d36]">{formatPrice(order.totalAmount)}</p>
                </div>
              </div>

              <div className="mt-3 divide-y divide-[#e6eeea] border-t border-[#e6eeea]">
                {order.items.map((item, index) => (
                  <div key={`${order.orderId}:${item.menuItemId}:${item.menuItemVariantId ?? "base"}:${index}`} className="grid grid-cols-[3.5rem_1fr_auto] gap-3 py-3">
                    <OrderItemThumb item={menuItemById.get(item.menuItemId)} name={item.menuItemName} />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-[#001c11]">{formatOrderItemName(item.menuItemName, item.variantName)}</p>
                      <DietTypePill dietTypeCode={item.dietTypeCode} compact />
                      {item.itemNote ? <p className="mt-1 rounded-lg bg-[#f8f9fa] px-2 py-1 text-xs font-semibold text-[#5a625e]">{item.itemNote}</p> : null}
                    </div>
                    <p className="text-sm font-black text-[#001c11]">x{item.quantity}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Link
                  href={`/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(order.orderId)}?from=previous-orders`}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d9e4df] bg-white px-3 text-sm font-black text-[#001c11]"
                >
                  Track
                </Link>
                <Link
                  href={`/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(order.orderId)}?from=previous-orders#feedback`}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#bfe6cf] bg-[#f1fbf5] px-3 text-sm font-black text-[#006d36]"
                >
                  Feedback
                </Link>
                <button
                  type="button"
                  className="h-12 rounded-xl bg-[#001c11] px-3 text-sm font-black text-white"
                  onClick={() => onReorder(order)}
                >
                  Reorder
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[#d9e4df] bg-white p-5 text-center shadow-sm">
          <ReceiptText className="h-8 w-8 text-gold" aria-hidden="true" />
          <p className="mt-3 text-sm font-black text-[#001c11]">No previous orders found</p>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            Orders linked to this WhatsApp number will appear here.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-[#001c11] px-4 py-2 text-sm font-bold text-white"
            onClick={onBack}
          >
            Back
          </button>
        </div>
      )}
    </section>
  );
}

function VariantPickerSheet({
  categoryName,
  item,
  onAdd,
  onClose
}: {
  categoryName: string;
  item: PublicQrMenuItem;
  onAdd: (variant: PublicQrMenuItem["variants"][number]) => void;
  onClose: () => void;
}) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto w-full max-w-md px-4 pb-5">
        <div className="rounded-[24px] border border-[#d9e4df] bg-white p-4 shadow-modal">
          <div className="flex items-start gap-3">
            <FoodThumb imageAltText={item.imageAltText} imageUrl={item.imageUrl} name={item.name} compact />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006d36]">{categoryName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-[#001c11]">{item.name}</h3>
                <DietTypePill dietTypeCode={item.dietTypeCode} />
              </div>
              <p className="mt-1 text-sm font-medium text-[#5a625e]">Choose a portion or size.</p>
            </div>
            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d9e4df] text-[#414844]" onClick={onClose} aria-label="Close variants">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {(item.variants ?? []).map((variant) => (
              <button
                key={variant.menuItemVariantId}
                type="button"
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#d9e4df] bg-[#f8f9fa] px-4 py-3 text-left"
                onClick={() => onAdd(variant)}
              >
                <span className="font-black text-[#001c11]">{variant.name}</span>
                <span className="font-black text-[#006d36]">{formatPrice(variant.price)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function CategorySheet({
  categories,
  onClose,
  onSelect,
  selectedCategoryId
}: {
  categories: PublicQrMenuCategory[];
  onClose: () => void;
  onSelect: (categoryId: string) => void;
  selectedCategoryId: string;
}) {
  const totalItemCount = categories.reduce((total, category) => total + category.items.length, 0);

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto w-full max-w-md px-4 pb-5">
        <div className="rounded-[28px] border border-[#d9e4df] bg-white p-4 shadow-modal">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#dce8e1]" />
          <div className="flex items-center justify-between gap-3 border-b border-[#edf2ef] pb-3">
            <div>
              <p className="text-xs font-black uppercase tracking-normal text-[#0f7a43]">Categories</p>
              <h2 className="mt-0.5 text-xl font-black text-[#063d22]">Browse menu</h2>
            </div>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#d9e4df] text-[#27352f]"
              onClick={onClose}
              aria-label="Close categories"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[48vh] overflow-y-auto py-2">
            <button
              type="button"
              className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-3 text-left text-sm font-black ${
                selectedCategoryId === AllPublicCategoryId ? "bg-[#d9f8e7] text-[#063d22]" : "text-[#27352f] hover:bg-[#f5faf7]"
              }`}
              onClick={() => onSelect(AllPublicCategoryId)}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-[#0f7a43]">
                  <Flame className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>All items</span>
              </span>
              <span className="text-xs font-black text-[#60736a]">{totalItemCount}</span>
            </button>
            {categories.map((category) => (
              <button
                key={category.menuCategoryId}
                type="button"
                className={`mt-1 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-3 text-left text-sm font-black ${
                  selectedCategoryId === category.menuCategoryId ? "bg-[#d9f8e7] text-[#063d22]" : "text-[#27352f] hover:bg-[#f5faf7]"
                }`}
                onClick={() => onSelect(category.menuCategoryId)}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#0f7a43]">
                    <CategoryIcon name={category.name} />
                  </span>
                  <span className="truncate">{category.name}</span>
                </span>
                <span className="text-xs font-black text-[#60736a]">{category.items.length}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function DietTypePill({ compact = false, dietTypeCode }: { compact?: boolean; dietTypeCode: DietTypeCode }) {
  if (dietTypeCode === "Unspecified") {
    return null;
  }

  const tone =
    dietTypeCode === "Veg" || dietTypeCode === "Vegan" || dietTypeCode === "Jain"
      ? "border-[#bfe6cf] bg-[#f1fbf5] text-[#006d36]"
      : "border-[#ffd9b5] bg-[#fff5ec] text-[#9a4b00]";

  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border font-black uppercase tracking-normal ${tone} ${compact ? "mt-1 px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"}`}>
      {formatDietType(dietTypeCode)}
    </span>
  );
}

function DietSymbol({ type }: { type: "veg" | "nonveg" }) {
  if (type === "veg") {
    return (
      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border border-[#0f7a3f] bg-white" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-[#0f7a3f]" />
      </span>
    );
  }

  return (
    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border border-[#c94e20] bg-white" aria-hidden="true">
      <span className="h-0 w-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-[#c94e20]" />
    </span>
  );
}

function MenuItemDietIcon({ dietTypeCode }: { dietTypeCode: DietTypeCode }) {
  if (dietTypeCode === "Unspecified") {
    return null;
  }

  const type = dietTypeCode === "NonVeg" || dietTypeCode === "Egg" ? "nonveg" : "veg";

  return (
    <span className="inline-flex shrink-0 items-center gap-1" title={formatDietType(dietTypeCode)}>
      <DietSymbol type={type} />
      <span className={`text-[10px] font-bold uppercase tracking-normal ${type === "veg" ? "text-[#0f7a3f]" : "text-[#c94e20]"}`}>
        {dietTypeCode === "NonVeg" ? "Non-veg" : formatDietType(dietTypeCode)}
      </span>
    </span>
  );
}

function formatDietType(dietTypeCode: DietTypeCode): string {
  switch (dietTypeCode) {
    case "NonVeg":
      return "Non-veg";
    case "Unspecified":
      return "Food type not set";
    default:
      return dietTypeCode;
  }
}

function getCategoryInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function FoodThumb({
  className = "",
  compact = false,
  imageAltText,
  imageUrl,
  name
}: {
  className?: string;
  compact?: boolean;
  imageAltText?: string | null;
  imageUrl?: string | null;
  name: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 via-white to-emerald-100 ${compact ? "mx-auto h-12 w-12" : "h-full min-h-[144px] w-full"} ${className}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={imageAltText ?? name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#1bb7b5]/20" />
          <div className="absolute -bottom-3 left-2 h-10 w-10 rounded-full bg-[#f4c542]/30" />
          <div className="absolute inset-0 grid place-items-center p-3">
            <div className={`grid place-items-center rounded-full bg-white text-primary shadow-soft-saas ${compact ? "h-9 w-9 text-[11px]" : "h-20 w-20 text-lg"}`}>
              <span className="font-black">{initials || <Utensils className="h-5 w-5" aria-hidden="true" />}</span>
            </div>
          </div>
        </>
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}

function OrderItemThumb({ item, name }: { item?: PublicQrMenuItem; name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#dff5e8] via-white to-[#759b89] text-[#001c11]">
      {item?.imageUrl ? (
        <img src={item.imageUrl} alt={item.imageAltText ?? name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute -right-4 -top-4 h-10 w-10 rounded-full bg-[#83fba5]/40" />
          <div className="absolute -bottom-3 left-1 h-8 w-8 rounded-full bg-[#006d36]/15" />
          <span className="relative text-sm font-black">{initials || <Utensils className="h-4 w-4" aria-hidden="true" />}</span>
        </>
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}

function valueOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function calculateCartEstimate(subtotalAmount: number, settings: PublicQrMenu["billingSettings"], offers: PublicQrMenuOffer[], promoCode: string): CartEstimate {
  const subtotal = roundMoney(subtotalAmount);
  const appliedOffer = selectEligibleOffer(subtotal, offers, promoCode);
  const discountAmount = appliedOffer ? calculateOfferDiscount(subtotal, appliedOffer) : 0;
  const taxableAmount = roundMoney(Math.max(0, subtotal - discountAmount));
  const taxRate = Math.max(0, settings.taxRate);
  let taxAmount = 0;

  if (settings.taxEnabled && taxRate > 0) {
    taxAmount =
      settings.taxMode === "Inclusive"
        ? roundMoney(taxableAmount - taxableAmount / (1 + taxRate / 100))
        : roundMoney((taxableAmount * taxRate) / 100);
  }

  const serviceChargeAmount =
    settings.serviceChargeEnabled && settings.serviceChargeRate > 0
      ? roundMoney((taxableAmount * Math.max(0, settings.serviceChargeRate)) / 100)
      : 0;
  const totalBeforeRounding = roundMoney((settings.taxMode === "Inclusive" ? taxableAmount : taxableAmount + taxAmount) + serviceChargeAmount);
  const roundedTotal = settings.roundingMode === "NearestRupee" ? Math.round(totalBeforeRounding) : totalBeforeRounding;
  const roundingAmount = roundMoney(roundedTotal - totalBeforeRounding);

  return {
    subtotalAmount: subtotal,
    discountAmount,
    appliedOffer,
    taxableAmount,
    taxAmount,
    serviceChargeAmount,
    roundingAmount,
    totalAmount: roundMoney(totalBeforeRounding + roundingAmount)
  };
}

function selectEligibleOffer(subtotal: number, offers: PublicQrMenuOffer[], promoCode: string): PublicQrMenuOffer | null {
  const cleanPromoCode = promoCode.trim().toUpperCase();
  if (cleanPromoCode) {
    const promoOffer = offers
      .filter((offer) => offer.promoCode?.toUpperCase() === cleanPromoCode)
      .filter((offer) => offer.discountTypeCode !== "DisplayOnly" && offer.discountValue > 0 && subtotal >= offer.minimumOrderAmount)
      .map((offer) => ({ offer, discountAmount: calculateOfferDiscount(subtotal, offer) }))
      .filter((entry) => entry.discountAmount > 0)
      .sort(compareOfferDiscounts)[0]?.offer;

    return promoOffer ?? null;
  }

  const eligible = offers
    .filter((offer) => offer.autoApply && !offer.requiresPromoCode && offer.discountTypeCode !== "DisplayOnly" && offer.discountValue > 0 && subtotal >= offer.minimumOrderAmount)
    .map((offer) => ({ offer, discountAmount: calculateOfferDiscount(subtotal, offer) }))
    .filter((entry) => entry.discountAmount > 0)
    .sort(compareOfferDiscounts);

  return eligible[0]?.offer ?? null;
}

function compareOfferDiscounts(
  left: { offer: PublicQrMenuOffer; discountAmount: number },
  right: { offer: PublicQrMenuOffer; discountAmount: number }
): number {
  if (right.discountAmount !== left.discountAmount) {
    return right.discountAmount - left.discountAmount;
  }

  if (left.offer.displayOrder !== right.offer.displayOrder) {
    return left.offer.displayOrder - right.offer.displayOrder;
  }

  return left.offer.title.localeCompare(right.offer.title);
}

function calculateOfferDiscount(subtotal: number, offer: PublicQrMenuOffer): number {
  if (subtotal <= 0 || offer.discountValue <= 0) {
    return 0;
  }

  const rawDiscount = offer.discountTypeCode === "Percentage" ? roundMoney((subtotal * offer.discountValue) / 100) : roundMoney(offer.discountValue);
  const cappedDiscount = offer.maxDiscountAmount !== null ? Math.min(rawDiscount, offer.maxDiscountAmount) : rawDiscount;
  return roundMoney(Math.min(subtotal, Math.max(0, cappedDiscount)));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getQrMenuDraftKey(qrToken: string): string {
  return `qrave:qr-menu-draft:${qrToken}`;
}

function getCustomerProfileKey(branchId: string): string {
  return `qrave:customer-profile:${branchId}`;
}

function readCustomerProfile(branchId: string): StoredCustomerProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = getCustomerProfileKey(branchId);
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

    return parsed;
  } catch {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage failures in restricted browsers.
    }
    return null;
  }
}

function writeCustomerProfile(branchId: string, profile: StoredCustomerProfile) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getCustomerProfileKey(branchId), JSON.stringify(profile));
  } catch {
    // Remembering the customer is optional; checkout must remain usable.
  }
}

function clearCustomerProfile(branchId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(getCustomerProfileKey(branchId));
  } catch {
    // Ignore storage failures in restricted browsers.
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

function getQrVisitSessionKey(qrToken: string): string {
  return `qrave:qr-visit-session:${qrToken}`;
}

function readQrVisitSession(qrToken: string): PublicQrSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = getQrVisitSessionKey(qrToken);

  try {
    const rawSession = window.localStorage.getItem(storageKey);
    if (!rawSession) {
      return null;
    }

    const parsed: unknown = JSON.parse(rawSession);
    if (!isStoredQrVisitSession(parsed)) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    return parsed;
  } catch {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore local storage failures in restricted browsers.
    }
    return null;
  }
}

function writeQrVisitSession(qrToken: string, session: PublicQrSession) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getQrVisitSessionKey(qrToken), JSON.stringify(session));
  } catch {
    // Ordering will still be blocked by the backend if the session cannot be persisted.
  }
}

function isStoredQrVisitSession(value: unknown): value is PublicQrSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<PublicQrSession>;
  return (
    typeof session.qrSessionId === "string" &&
    typeof session.branchId === "string" &&
    typeof session.tableId === "string" &&
    typeof session.startedAtUtc === "string" &&
    typeof session.expiresAtUtc === "string" &&
    typeof session.isExpired === "boolean"
  );
}

function isQrSessionActive(session: PublicQrSession, _tick: number): boolean {
  if (session.isExpired) {
    return false;
  }

  const expiresAt = Date.parse(session.expiresAtUtc);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function readQrMenuDraft(qrToken: string): StoredQrMenuDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = getQrMenuDraftKey(qrToken);

  try {
    const rawDraft = window.sessionStorage.getItem(storageKey);
    if (!rawDraft) {
      return null;
    }

    const parsed: unknown = JSON.parse(rawDraft);
    if (!isStoredQrMenuDraft(parsed)) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    return parsed;
  } catch {
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore storage failures so the menu remains usable in restricted browsers.
    }
    return null;
  }
}

function writeQrMenuDraft(qrToken: string, draft: StoredQrMenuDraft) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storageKey = getQrMenuDraftKey(qrToken);
    if (!hasStoredDraftContent(draft)) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Storage can be blocked or full. Ordering must continue without draft persistence.
  }
}

function clearQrMenuDraft(qrToken: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(getQrMenuDraftKey(qrToken));
  } catch {
    // Ignore storage failures after successful order submission.
  }
}

function isStoredQrMenuDraft(value: unknown): value is StoredQrMenuDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<StoredQrMenuDraft>;
  return (
    draft.version === 1 &&
    typeof draft.customerName === "string" &&
    typeof draft.customerWhatsApp === "string" &&
    typeof draft.customerPhoneCountryCode === "string" &&
    typeof draft.marketingConsent === "boolean" &&
    typeof draft.notes === "string" &&
    Array.isArray(draft.cartLines) &&
    draft.cartLines.every(isStoredCartLine)
  );
}

function isStoredCartLine(value: unknown): value is StoredCartLine {
  if (!value || typeof value !== "object") {
    return false;
  }

  const line = value as Partial<StoredCartLine>;
  return (
    typeof line.menuItemId === "string" &&
    (typeof line.menuItemVariantId === "string" || line.menuItemVariantId === null) &&
    typeof line.itemNote === "string" &&
    typeof line.quantity === "number"
  );
}

function hasStoredDraftContent(draft: StoredQrMenuDraft): boolean {
  return (
    draft.cartLines.length > 0 ||
    draft.customerName.trim().length > 0 ||
    draft.customerWhatsApp.trim().length > 0 ||
    draft.notes.trim().length > 0 ||
    draft.marketingConsent
  );
}

function toStoredCartLines(cart: Record<string, CartLine>): StoredCartLine[] {
  return Object.values(cart)
    .map((line) => ({
      menuItemId: line.item.menuItemId,
      menuItemVariantId: line.variant?.menuItemVariantId ?? null,
      itemNote: normalizeStoredText(line.itemNote, 200),
      quantity: normalizeStoredQuantity(line.quantity)
    }))
    .filter((line) => line.quantity > 0);
}

function sanitizeLiveCartLines(
  cart: Record<string, CartLine>,
  menuItemById: Map<string, PublicQrMenuItem>,
  categoryNameByMenuItemId: Map<string, string>
): Record<string, CartLine> {
  return sanitizeStoredCartLines(toStoredCartLines(cart), menuItemById, categoryNameByMenuItemId);
}

function sanitizeStoredCartLines(
  lines: StoredCartLine[],
  menuItemById: Map<string, PublicQrMenuItem>,
  categoryNameByMenuItemId: Map<string, string>
): Record<string, CartLine> {
  return lines.reduce<Record<string, CartLine>>((next, line) => {
    const item = menuItemById.get(line.menuItemId);
    if (!item) {
      return next;
    }

    const variant = line.menuItemVariantId ? item.variants.find((candidate) => candidate.menuItemVariantId === line.menuItemVariantId) ?? null : null;
    if (line.menuItemVariantId && !variant) {
      return next;
    }

    const quantity = normalizeStoredQuantity(line.quantity);
    if (quantity <= 0) {
      return next;
    }

    const cartLineId = getCartLineId(item.menuItemId, variant?.menuItemVariantId ?? null);
    const existing = next[cartLineId];
    next[cartLineId] = {
      cartLineId,
      item,
      categoryName: categoryNameByMenuItemId.get(item.menuItemId) ?? "Menu",
      variant,
      itemNote: normalizeStoredText(existing?.itemNote ?? line.itemNote, 200),
      quantity: Math.min(99, (existing?.quantity ?? 0) + quantity)
    };

    return next;
  }, {});
}

function normalizeStoredText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function normalizeStoredCountryCode(value: string): string {
  const countryCode = value.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  return countryCode || "IN";
}

function normalizeStoredQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(99, Math.max(1, Math.trunc(value)));
}

function getCartLineId(menuItemId: string, menuItemVariantId: string | null): string {
  return `${menuItemId}:${menuItemVariantId ?? "base"}`;
}

function getCartLinePrice(line: CartLine): number {
  return line.variant?.price ?? line.item.price;
}

function formatCartItemName(line: CartLine): string {
  return line.variant ? `${line.item.name} - ${line.variant.name}` : line.item.name;
}

function formatOrderItemName(itemName: string, variantName: string | null): string {
  return variantName ? `${itemName} - ${variantName}` : itemName;
}

function filterCategories(categories: PublicQrMenuCategory[], search: string, dietFilter: DietQuickFilter, sortBy: MenuSortCode): PublicQrMenuCategory[] {
  const sorted = [...categories].sort((left, right) => left.displayOrder - right.displayOrder);
  const query = search.trim().toLowerCase();

  return sorted
    .map((category) => ({
      ...category,
      items: [...category.items]
        .filter((item) => matchesSearch(item, category.name, query))
        .filter((item) => matchesDietFilter(item.dietTypeCode, dietFilter))
        .sort((left, right) => compareMenuItems(left, right, sortBy))
    }))
    .filter((category) => category.items.length > 0);
}

function matchesSearch(item: PublicQrMenuItem, categoryName: string, query: string): boolean {
  if (!query) {
    return true;
  }

  return [item.name, item.description, categoryName]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(query));
}

function matchesDietFilter(dietTypeCode: DietTypeCode, filter: DietQuickFilter): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "veg") {
    return dietTypeCode === "Veg" || dietTypeCode === "Vegan" || dietTypeCode === "Jain";
  }

  return dietTypeCode === "NonVeg" || dietTypeCode === "Egg";
}

function compareMenuItems(left: PublicQrMenuItem, right: PublicQrMenuItem, sortBy: MenuSortCode): number {
  if (sortBy === "priceAsc") {
    return getMenuItemDisplayPrice(left) - getMenuItemDisplayPrice(right) || left.displayOrder - right.displayOrder || left.name.localeCompare(right.name);
  }

  if (sortBy === "priceDesc") {
    return getMenuItemDisplayPrice(right) - getMenuItemDisplayPrice(left) || left.displayOrder - right.displayOrder || left.name.localeCompare(right.name);
  }

  if (sortBy === "nameAsc") {
    return left.name.localeCompare(right.name) || left.displayOrder - right.displayOrder;
  }

  return left.displayOrder - right.displayOrder || left.name.localeCompare(right.name);
}

function getMenuItemDisplayPrice(item: PublicQrMenuItem): number {
  const variants = item.variants ?? [];
  return variants.length > 0 ? Math.min(...variants.map((variant) => variant.price)) : item.price;
}

function shortOrderCode(orderId: string): string {
  return orderId.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function maskPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) {
    return value;
  }

  return `${"•".repeat(Math.min(6, digits.length - 4))}${digits.slice(-4)}`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(price);
}

function formatSignedPrice(price: number): string {
  const formatted = formatPrice(Math.abs(price));
  return price < 0 ? `-${formatted}` : `+${formatted}`;
}
