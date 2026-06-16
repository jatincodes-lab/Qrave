"use client";

import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Menu,
  Minus,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  Utensils,
  X
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CountryPhoneInput } from "../../../components/country-phone-input";
import { useToast } from "../../../components/ui/toast";
import {
  ApiError,
  createWaiterCall,
  createPublicQrOrder,
  getPublicQrMenu,
  lookupPublicCustomer,
  type CreatePublicQrOrderInput,
  type DietTypeCode,
  type PublicCustomerLookup,
  type PublicCustomerRecentOrder,
  type PublicQrMenu,
  type PublicQrMenuCategory,
  type PublicQrMenuItem,
  type PublicQrMenuOffer,
  type PublicQrOrder
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
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsApp, setCustomerWhatsApp] = useState("");
  const [customerPhoneCountryCode, setCustomerPhoneCountryCode] = useState("IN");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [recognizedCustomer, setRecognizedCustomer] = useState<PublicCustomerLookup | null>(null);
  const [isCustomerLookupLoading, setIsCustomerLookupLoading] = useState(false);
  const [lastLookupWhatsApp, setLastLookupWhatsApp] = useState("");
  const [notes, setNotes] = useState("");
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("menu");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
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
  const cartEstimate = useMemo(() => calculateCartEstimate(cartTotal, currentMenu.billingSettings, currentMenu.offers ?? []), [cartTotal, currentMenu.billingSettings, currentMenu.offers]);
  const canOrder = currentMenu.orderSettings.enableDirectQrOrdering;
  const canCallWaiter = currentMenu.orderSettings.waiterCallEnabled;
  const itemCount = categories.reduce((total, category) => total + category.items.length, 0);
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

  useEffect(() => {
    const cleanWhatsApp = customerWhatsApp.trim();
    const phoneValidation = validatePhone(cleanWhatsApp, "WhatsApp number", false);

    if (!cleanWhatsApp || !phoneValidation.isValid) {
      setRecognizedCustomer(null);
      setIsCustomerLookupLoading(false);
      return;
    }

    if (cleanWhatsApp === lastLookupWhatsApp) {
      return;
    }

    let isActive = true;
    const timer = window.setTimeout(async () => {
      setIsCustomerLookupLoading(true);
      try {
        const customer = await lookupPublicCustomer(currentMenu.qrToken, cleanWhatsApp);
        if (!isActive) {
          return;
        }

        setRecognizedCustomer(customer);
        setLastLookupWhatsApp(cleanWhatsApp);
        if (customer?.name && customerName.trim().length === 0) {
          setCustomerName(customer.name);
        }
      } catch {
        if (isActive) {
          setRecognizedCustomer(null);
        }
      } finally {
        if (isActive) {
          setIsCustomerLookupLoading(false);
        }
      }
    }, 450);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [currentMenu.qrToken, customerName, customerWhatsApp, lastLookupWhatsApp]);

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
    if (!canOrder || cartLines.length === 0 || submitState.kind === "submitting") {
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

    const input: CreatePublicQrOrderInput = {
      customerName: valueOrNull(customerName),
      customerWhatsApp: valueOrNull(customerWhatsApp),
      notes: valueOrNull(notes),
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
      const order = await createPublicQrOrder(currentMenu.qrToken, input);
      clearQrMenuDraft(currentMenu.qrToken);
      setCart({});
      setNotes("");
      setMarketingConsent(false);
      setActiveView("cart");
      setSubmitState({ kind: "success", order });
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

  function handleHeaderBack() {
    if (activeView === "menu") {
      window.history.back();
      return;
    }

    if (activeView === "customerOrders") {
      setActiveView("cart");
      return;
    }

    returnToMenu();
  }

  async function submitWaiterCall() {
    if (!canCallWaiter || waiterCallState.kind === "submitting") {
      return;
    }

    const validation = validateOptionalText(waiterCallNote, "Waiter-call note", 500);
    if (!validation.isValid) {
      toastError(validation.message ?? "Waiter-call note is invalid.");
      return;
    }

    setWaiterCallState({ kind: "submitting" });

    try {
      await createWaiterCall(currentMenu.qrToken, {
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
      <QrPageHeader
        branchName={currentMenu.branchName}
        cartCount={cartCount}
        tableName={currentMenu.tableName}
        onBack={handleHeaderBack}
        onCartOpen={() => setActiveView("cart")}
      />

      {activeView === "customerOrders" ? (
        <CustomerPreviousOrdersPage
          customer={recognizedCustomer}
          menuItemById={menuItemById}
          qrToken={currentMenu.qrToken}
          onBackToCart={() => setActiveView("cart")}
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
          customerName={customerName}
          customerPhoneCountryCode={customerPhoneCountryCode}
          customerWhatsApp={customerWhatsApp}
          isCustomerLookupLoading={isCustomerLookupLoading}
          marketingConsent={marketingConsent}
          notes={notes}
          orderSettings={currentMenu.orderSettings}
          qrToken={currentMenu.qrToken}
          recognizedCustomer={recognizedCustomer}
          submitState={submitState}
          onCustomerNameChange={setCustomerName}
          onCustomerPhoneCountryChange={setCustomerPhoneCountryCode}
          onCustomerWhatsAppChange={setCustomerWhatsApp}
          onDecrement={decrementItem}
          onItemNoteChange={updateCartLineNote}
          onMarketingConsentChange={setMarketingConsent}
          onBackToMenu={returnToMenu}
          onCheckPreviousOrders={() => setActiveView("customerOrders")}
          onNotesChange={setNotes}
          onSubmit={submitOrder}
        />
      ) : (
        <>
          {flyingItem ? <FlyingCartItem key={flyingItem.key} item={flyingItem.item} /> : null}
          {!canOrder ? <OrderingUnavailableNotice /> : null}

          <MenuHero
            categories={categories}
            dietFilter={dietFilter}
            itemCount={itemCount}
            menu={currentMenu}
            search={search}
            sortBy={sortBy}
            onCategoryOpen={() => setIsCategoryOpen(true)}
            onDietFilterChange={setDietFilter}
            onSearchChange={setSearch}
            onSortChange={setSortBy}
          />

          {canCallWaiter ? (
            <WaiterCallAction
              note={waiterCallNote}
              state={waiterCallState}
              onNoteChange={(value) => {
                setWaiterCallNote(value);
                if (waiterCallState.kind !== "submitting") {
                  setWaiterCallState({ kind: "idle" });
                }
              }}
              onSubmit={() => void submitWaiterCall()}
            />
          ) : null}

          <div className="flex-1 space-y-8 bg-[#f4f7f6] px-4 pb-28">
            {itemCount > 0 ? (
              categories.map((category) => (
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

          <FloatingMenuButton hasCheckoutBar={canOrder && cartCount > 0} onOpen={() => setIsCategoryOpen(true)} />
          {variantPicker ? (
            <VariantPickerSheet
              categoryName={variantPicker.categoryName}
              item={variantPicker.item}
              onAdd={(variant) => addItem(variantPicker.item, variantPicker.categoryName, variant)}
              onClose={() => setVariantPicker(null)}
            />
          ) : null}
        </>
      )}

      {isCategoryOpen ? <CategorySheet categories={categories} onClose={() => setIsCategoryOpen(false)} /> : null}
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

function QrPageHeader({
  branchName,
  cartCount,
  onBack,
  onCartOpen,
  tableName
}: {
  branchName: string;
  cartCount: number;
  onBack: () => void;
  onCartOpen: () => void;
  tableName: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e6eeea] bg-white/95 px-4 py-3 backdrop-blur">
      <div className="grid h-10 grid-cols-[40px_1fr_40px] items-center">
        <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-[#001c11]" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-[15px] font-black uppercase tracking-normal text-[#001c11]">{branchName}</h1>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-[#5a625e]">{tableName}</p>
        </div>
        <button type="button" onClick={onCartOpen} className="relative grid h-10 w-10 place-items-center rounded-full bg-[#001c11] text-white shadow-sm" aria-label="Open cart">
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          {cartCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#83fba5] px-1 text-[10px] font-black leading-none text-[#00210c]">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}

function WaiterCallAction({
  note,
  state,
  onNoteChange,
  onSubmit
}: {
  note: string;
  state: WaiterCallState;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="bg-[#f8f9fa] px-4 pb-5">
      <div className="rounded-2xl border border-[#cfe1d8] bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e7f8ee] text-[#006d36]">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-ink">Call Waiter</p>
            <p className="mt-0.5 text-xs font-medium text-on-surface-variant">Staff at your service</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                maxLength={500}
                placeholder="Optional note"
                className="h-11 min-w-0 rounded-xl border border-[#d9e4df] bg-[#f8f9fa] px-3 text-sm outline-none focus:border-[#006d36]"
              />
              <button
                type="button"
                disabled={state.kind === "submitting"}
                onClick={onSubmit}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#001c11] px-4 text-sm font-extrabold text-white disabled:opacity-50"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {state.kind === "submitting" ? "Calling" : "Call waiter"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
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
  itemCount,
  menu,
  onCategoryOpen,
  onDietFilterChange,
  onSearchChange,
  onSortChange,
  search,
  sortBy
}: {
  categories: PublicQrMenuCategory[];
  dietFilter: DietQuickFilter;
  itemCount: number;
  menu: PublicQrMenu;
  onCategoryOpen: () => void;
  onDietFilterChange: (value: DietQuickFilter) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: MenuSortCode) => void;
  search: string;
  sortBy: MenuSortCode;
}) {
  const availableCategories = categories.filter((category) => category.items.length > 0);
  const offers = (menu.offers ?? []).sort((left, right) => left.displayOrder - right.displayOrder);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const activeOffer = offers[activeOfferIndex] ?? null;
  const fallbackFeature = availableCategories[0]?.items[0] ?? null;
  const heroImageUrl = activeOffer?.imageUrl ?? fallbackFeature?.imageUrl ?? null;
  const heroImageAlt = activeOffer?.imageAltText ?? activeOffer?.title ?? fallbackFeature?.imageAltText ?? fallbackFeature?.name ?? menu.branchName;

  useEffect(() => {
    if (offers.length <= 1) {
      setActiveOfferIndex(0);
      return;
    }

    setActiveOfferIndex((current) => (current >= offers.length ? 0 : current));
    const timer = window.setInterval(() => {
      setActiveOfferIndex((current) => (current + 1) % offers.length);
    }, 4_200);

    return () => window.clearInterval(timer);
  }, [offers.length]);

  function handleOfferTouchEnd(clientX: number) {
    if (touchStartX === null || offers.length <= 1) {
      setTouchStartX(null);
      return;
    }

    const delta = touchStartX - clientX;
    if (Math.abs(delta) > 36) {
      setActiveOfferIndex((current) => (delta > 0 ? current + 1 : current - 1 + offers.length) % offers.length);
    }

    setTouchStartX(null);
  }

  return (
    <section className="bg-[#f4f7f6] px-4 pb-5 pt-5">
      <div className="mb-5 flex h-16 items-center gap-3 rounded-full border border-[#dce4df] bg-white px-5 shadow-sm">
        <Search className="h-6 w-6 shrink-0 text-[#6b746f]" aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[#191c1d] outline-none placeholder:text-[#a8afab]"
          placeholder="What are you craving today?"
          type="search"
        />
        {search ? (
          <button type="button" onClick={() => onSearchChange("")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#6b746f]" aria-label="Clear search">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={onCategoryOpen} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#466155]" aria-label="Open categories">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)] gap-2">
        <div className="grid grid-cols-2 overflow-hidden rounded-full border border-[#d9e4df] bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => onDietFilterChange(dietFilter === "veg" ? "all" : "veg")}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-black uppercase tracking-normal transition-colors ${
              dietFilter === "veg" ? "bg-[#83fba5] text-[#00210c]" : "text-[#466155]"
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
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-black uppercase tracking-normal transition-colors ${
              dietFilter === "nonveg" ? "bg-[#ffd9b5] text-[#4d2500]" : "text-[#466155]"
            }`}
            aria-pressed={dietFilter === "nonveg"}
            aria-label="Show non-vegetarian items"
          >
            <DietSymbol type="nonveg" />
            <span>Non-veg</span>
          </button>
        </div>

        <label className="flex h-12 min-w-0 items-center gap-2 rounded-full border border-[#d9e4df] bg-white px-3 shadow-sm">
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

      <div
        className="relative min-h-[320px] overflow-hidden rounded-[28px] bg-[#0f3224] text-white shadow-soft-saas"
        onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => handleOfferTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      >
        {heroImageUrl ? <img src={heroImageUrl} alt={heroImageAlt} className="absolute inset-0 h-full w-full object-cover" /> : <FoodPosterFallback name={menu.branchName} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
        <div className="relative flex min-h-[320px] flex-col justify-end p-6">
          <div className="mb-auto flex justify-end">
            {activeOffer?.discountText ? (
              <div className="rounded-[28px] border border-white/20 bg-white/20 px-5 py-4 text-center shadow-modal backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-white/75">Promo</p>
                <p className="mt-1 text-xl font-black">{activeOffer.discountText}</p>
              </div>
            ) : null}
          </div>
          <div>
            <span className="inline-flex rounded-lg bg-[#00743a] px-3 py-2 text-xs font-black uppercase tracking-wide text-white">
              {activeOffer ? "Newbie Offer" : "Recommended"}
            </span>
            <h2 className="mt-4 max-w-[13rem] text-[40px] font-black leading-[1.08] tracking-normal">{activeOffer?.title ?? fallbackFeature?.name ?? "Explore Menu"}</h2>
            <p className="mt-3 max-w-[18rem] text-base font-semibold leading-6 text-white/80">{activeOffer?.subtitle ?? `${itemCount} dishes available today`}</p>
          </div>
        </div>
        {offers.length > 1 ? (
          <div className="absolute bottom-5 right-5 flex gap-1.5">
            {offers.map((offer, index) => (
              <button
                key={offer.branchOfferId}
                type="button"
                onClick={() => setActiveOfferIndex(index)}
                className={`h-1.5 rounded-full transition-all ${index === activeOfferIndex ? "w-6 bg-white" : "w-1.5 bg-white/45"}`}
                aria-label={`Show offer ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {availableCategories.length > 0 ? (
        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[18px] font-bold leading-6 text-[#1c1b1b]">Explore Menu</h3>
            <button type="button" onClick={onCategoryOpen} className="text-xs font-bold text-[#0f3d2e]">Full Gallery</button>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {availableCategories.map((category, index) => (
              <a key={category.menuCategoryId} href={`#category-${category.menuCategoryId}`} className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 text-center">
                <div
                  className={`grid h-14 w-14 place-items-center rounded-2xl border text-sm font-extrabold shadow-sm transition-colors ${
                    index === 0
                      ? "border-[#0f3d2e] bg-[#0f3d2e] text-white"
                      : "border-[#d9e4df] bg-white text-[#0f3d2e]"
                  }`}
                >
                  {getCategoryInitials(category.name) || <Utensils className="h-5 w-5" aria-hidden="true" />}
                </div>
                <span className={`line-clamp-1 max-w-full break-words text-[11px] leading-4 ${index === 0 ? "font-bold text-[#0f3d2e]" : "font-medium text-[#555f59]"}`}>
                  {category.name}
                </span>
                <span className="text-[9px] font-medium leading-3 text-[#8b938f]">
                  {category.items.length} {category.items.length === 1 ? "item" : "items"}
                </span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
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
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-[24px] font-bold leading-[1.3] text-[#00261a]">{category.name}</h2>
        <p className="text-xs font-bold uppercase tracking-normal text-[#0f3d2e]">{items.length} items</p>
      </div>

      <div className="mt-3 grid gap-4">
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
            <article key={item.menuItemId} className="grid min-h-[178px] grid-cols-[minmax(0,1fr)_7.25rem] gap-4 rounded-3xl border border-[#c0c8c3]/45 bg-white p-4 shadow-sm">
              <div className="flex min-w-0 flex-col">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <MenuItemDietIcon dietTypeCode={item.dietTypeCode} />
                    <h3 className="line-clamp-2 min-w-0 break-words text-[18px] font-bold leading-[1.35] text-[#1c1b1b]">{item.name}</h3>
                  </div>
                  <p className="mt-2 line-clamp-2 break-words text-sm font-normal leading-5 text-[#414944]">{item.description || "Freshly prepared by the kitchen."}</p>
                </div>

                <div className="mt-auto flex min-h-12 items-end justify-between gap-3 pt-3">
                  <p className="min-w-0 whitespace-nowrap text-[18px] font-bold leading-6 text-[#234f3f]">{hasVariants ? `From ${formatPrice(displayPrice)}` : formatPrice(displayPrice)}</p>
                  {canOrder ? (
                    hasVariants ? (
                      <button
                        type="button"
                        className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#beedd7] px-3 text-xs font-bold uppercase tracking-normal text-[#002116]"
                        onClick={() => onChooseVariant(item, category.name)}
                        aria-label={`Choose variant for ${item.name}`}
                      >
                        {quantity > 0 ? `${quantity} Added` : "Choose"}
                      </button>
                    ) : singleQuantity > 0 ? (
                      <div className="flex h-10 w-[7.25rem] shrink-0 items-center justify-between overflow-hidden rounded-lg border border-[#cfe1d8] bg-[#f8f9fa]">
                        <button
                          type="button"
                          className="grid h-10 w-9 place-items-center text-[#006d36]"
                          onClick={() => onDecrement(singleCartLineId)}
                          aria-label={`Remove one ${item.name}`}
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <span className="grid h-10 min-w-8 place-items-center text-sm font-black text-[#001c11]">{singleQuantity}</span>
                        <button
                          type="button"
                          className="grid h-10 w-9 place-items-center text-[#006d36]"
                          onClick={() => onAdd(item, category.name, null)}
                          aria-label={`Add one ${item.name}`}
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#beedd7] px-3 text-xs font-bold uppercase tracking-normal text-[#002116]"
                        onClick={() => onAdd(item, category.name, null)}
                        aria-label={`Add ${item.name}`}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add
                      </button>
                    )
                  ) : null}
                </div>
              </div>

              <div className="h-full min-h-[146px]">
                <FoodThumb imageAltText={item.imageAltText} imageUrl={item.imageUrl} name={item.name} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
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
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
      <div className="mx-auto w-full max-w-md px-4 pb-5">
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
  customerName,
  customerPhoneCountryCode,
  customerWhatsApp,
  isCustomerLookupLoading,
  marketingConsent,
  notes,
  orderSettings,
  qrToken,
  menuItemById,
  recognizedCustomer,
  submitState,
  onCustomerNameChange,
  onCustomerPhoneCountryChange,
  onCustomerWhatsAppChange,
  onDecrement,
  onItemNoteChange,
  onMarketingConsentChange,
  onBackToMenu,
  onCheckPreviousOrders,
  onNotesChange,
  onSubmit
}: {
  cartCount: number;
  cartLines: CartLine[];
  cartEstimate: CartEstimate;
  cartTotal: number;
  customerName: string;
  customerPhoneCountryCode: string;
  customerWhatsApp: string;
  isCustomerLookupLoading: boolean;
  marketingConsent: boolean;
  notes: string;
  orderSettings: PublicQrMenu["orderSettings"];
  qrToken: string;
  menuItemById: Map<string, PublicQrMenuItem>;
  recognizedCustomer: PublicCustomerLookup | null;
  submitState: SubmitState;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneCountryChange: (value: string) => void;
  onCustomerWhatsAppChange: (value: string) => void;
  onDecrement: (cartLineId: string) => void;
  onItemNoteChange: (cartLineId: string, value: string) => void;
  onMarketingConsentChange: (value: boolean) => void;
  onBackToMenu: () => void;
  onCheckPreviousOrders: () => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (submitState.kind === "success") {
    return <OrderPlacedView menuItemById={menuItemById} order={submitState.order} qrToken={qrToken} onBackToMenu={onBackToMenu} />;
  }

  return (
    <section className="min-h-dvh flex-1 bg-[#f8f9fa] px-4 py-5 pb-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#006d36]">
            {cartCount} selected item{cartCount === 1 ? "" : "s"}
          </p>
          <h1 className="mt-1 text-2xl font-black leading-8 text-[#001c11]">Cart</h1>
        </div>
        <button type="button" className="rounded-full border border-[#d9e4df] bg-white px-4 py-2 text-sm font-black text-[#001c11] shadow-sm" onClick={onBackToMenu}>
          Menu
        </button>
      </div>

      {cartLines.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-3">
            {cartLines.map((line) => (
              <div key={line.cartLineId} className="rounded-2xl border border-[#d9e4df] bg-white p-3 shadow-sm">
                <div className="grid grid-cols-[4.75rem_1fr_auto] gap-3">
                  <FoodThumb imageAltText={line.item.imageAltText} imageUrl={line.item.imageUrl} name={line.item.name} compact />
                  <div className="min-w-0">
                    <p className="line-clamp-2 break-words text-sm font-black text-[#001c11]">{formatCartItemName(line)}</p>
                    <DietTypePill dietTypeCode={line.item.dietTypeCode} compact />
                    <p className="mt-1 text-xs font-semibold text-[#5a625e]">{line.categoryName}</p>
                    <p className="mt-2 text-sm font-black text-[#006d36]">{formatPrice(getCartLinePrice(line))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#001c11]">x{line.quantity}</span>
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center rounded-full border border-[#d9e4df] bg-[#f8f9fa] text-[#414844]"
                      onClick={() => onDecrement(line.cartLineId)}
                      aria-label={`Remove one ${line.item.name}`}
                    >
                      {line.quantity === 1 ? (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <label className="mt-3 block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Item note</span>
                  <textarea
                    className="mt-1 min-h-16 w-full resize-none rounded-xl border border-[#d9e4df] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006d36]"
                    value={line.itemNote}
                    onChange={(event) => onItemNoteChange(line.cartLineId, event.target.value)}
                    maxLength={200}
                    placeholder="Less spicy, no onion, no ice..."
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm text-[#5a625e]">
              <span>Subtotal</span>
              <span className="font-black text-[#001c11]">{formatPrice(cartTotal)}</span>
            </div>
            {cartEstimate.discountAmount > 0 ? (
              <div className="mt-2 rounded-xl border border-[#bfe6cf] bg-[#f1fbf5] px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-black text-[#006d36]">{cartEstimate.appliedOffer?.title ?? "Offer discount"}</span>
                  <span className="font-black text-[#006d36]">-{formatPrice(cartEstimate.discountAmount)}</span>
                </div>
                {cartEstimate.appliedOffer?.discountText ? <p className="mt-1 text-xs font-semibold text-[#4e6256]">{cartEstimate.appliedOffer.discountText}</p> : null}
              </div>
            ) : null}
            {cartEstimate.taxAmount > 0 ? (
              <div className="mt-2 flex items-center justify-between text-sm text-[#5a625e]">
                <span>Tax</span>
                <span className="font-black text-[#001c11]">{formatPrice(cartEstimate.taxAmount)}</span>
              </div>
            ) : null}
            {cartEstimate.serviceChargeAmount > 0 ? (
              <div className="mt-2 flex items-center justify-between text-sm text-[#5a625e]">
                <span>Service charge</span>
                <span className="font-black text-[#001c11]">{formatPrice(cartEstimate.serviceChargeAmount)}</span>
              </div>
            ) : null}
            {Math.abs(cartEstimate.roundingAmount) >= 0.01 ? (
              <div className="mt-2 flex items-center justify-between text-sm text-[#5a625e]">
                <span>Rounding</span>
                <span className="font-black text-[#001c11]">{formatSignedPrice(cartEstimate.roundingAmount)}</span>
              </div>
            ) : null}
            <div className="mt-3 flex items-center justify-between border-t border-[#e6eeea] pt-3">
              <span className="text-base font-black text-[#001c11]">Total amount</span>
              <span className="text-xl font-black text-[#006d36]">{formatPrice(cartEstimate.totalAmount)}</span>
            </div>
          </div>

          {isCustomerLookupLoading ? (
            <div className="rounded-2xl border border-[#d9e4df] bg-white p-4 text-sm font-semibold text-[#5a625e] shadow-sm">
              Checking customer history...
            </div>
          ) : recognizedCustomer ? (
            <div className="rounded-2xl border border-[#bfe6cf] bg-[#f1fbf5] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#006d36]">Welcome back</p>
                  <h2 className="mt-1 truncate text-lg font-black text-[#001c11]">
                    {recognizedCustomer.name ?? "Customer"}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-[#5a625e]">
                    {recognizedCustomer.totalOrderCount} previous order{recognizedCustomer.totalOrderCount === 1 ? "" : "s"}
                  </p>
                </div>
                {recognizedCustomer.marketingConsent ? (
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#006d36]">Opted in</span>
                ) : null}
              </div>

              <button
                type="button"
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#001c11] px-4 text-sm font-black text-white"
                onClick={onCheckPreviousOrders}
              >
                Check previous orders
              </button>
            </div>
          ) : null}

          <div className="grid gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                Name{orderSettings.requireCustomerName ? " *" : ""}
              </span>
              <input
                className="mt-1 h-12 w-full rounded-xl border border-[#d9e4df] bg-white px-3 text-sm outline-none focus:border-[#006d36]"
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

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">Notes</span>
            <textarea
              className="mt-1 min-h-24 w-full resize-none rounded-xl border border-[#d9e4df] bg-white px-3 py-2 text-sm outline-none focus:border-[#006d36]"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              maxLength={500}
            />
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(event) => onMarketingConsentChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#b9c8c0] text-[#006d36] focus:ring-[#006d36]"
            />
            <span className="text-sm font-semibold leading-5 text-[#414844]">
              Send me WhatsApp updates and offers from this restaurant.
            </span>
          </label>

          <button
            type="button"
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#001c11] px-4 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={cartCount === 0 || submitState.kind === "submitting"}
            onClick={onSubmit}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitState.kind === "submitting" ? "Sending order" : "Place order"}
          </button>
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[#d9e4df] bg-white p-5 text-center shadow-sm">
            <ReceiptText className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-ink">Your cart is empty</p>
            <p className="mt-1 text-sm text-on-surface-variant">Add menu items to see total amount and place an order.</p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-[#001c11] px-4 py-2 text-sm font-bold text-white"
              onClick={onBackToMenu}
            >
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
  qrToken,
  onBackToMenu
}: {
  menuItemById: Map<string, PublicQrMenuItem>;
  order: PublicQrOrder;
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
            {order.appliedOfferTitle ?? "Offer applied"} saved {formatPrice(order.appliedOfferDiscountAmount)}
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
  onBackToCart,
  onReorder
}: {
  customer: PublicCustomerLookup | null;
  menuItemById: Map<string, PublicQrMenuItem>;
  qrToken: string;
  onBackToCart: () => void;
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
          onClick={onBackToCart}
        >
          Cart
        </button>
      </div>

      {customer ? (
        <div className="mb-4 rounded-2xl border border-[#bfe6cf] bg-[#f1fbf5] p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#006d36]">Welcome back</p>
          <p className="mt-1 text-lg font-black text-[#001c11]">{customer.name ?? "Customer"}</p>
          <p className="mt-1 text-sm font-semibold text-[#5a625e]">{customer.whatsAppNumber}</p>
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

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link
                  href={`/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(order.orderId)}`}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d9e4df] bg-white px-4 text-sm font-black text-[#001c11]"
                >
                  Track
                </Link>
                <button
                  type="button"
                  className="h-12 rounded-xl bg-[#001c11] px-4 text-sm font-black text-white"
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
            onClick={onBackToCart}
          >
            Back to cart
          </button>
        </div>
      )}
    </section>
  );
}

function FloatingMenuButton({ hasCheckoutBar, onOpen }: { hasCheckoutBar: boolean; onOpen: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
      <div className={`mx-auto flex w-full max-w-md justify-end px-4 ${hasCheckoutBar ? "pb-24" : "pb-5"}`}>
        <button
          type="button"
          className="pointer-events-auto relative grid h-14 w-14 place-items-center rounded-full bg-primary text-on-primary shadow-modal"
          onClick={onOpen}
          aria-label="Open categories"
        >
          <Menu className="h-7 w-7" aria-hidden="true" />
        </button>
      </div>
    </div>
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
  onClose
}: {
  categories: PublicQrMenuCategory[];
  onClose: () => void;
}) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto w-full max-w-md px-4 pb-5">
        <div className="rounded-xl border border-line bg-white p-3 shadow-modal">
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <p className="text-sm font-extrabold uppercase text-ink">Categories</p>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-on-surface-variant"
              onClick={onClose}
              aria-label="Close categories"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[45vh] overflow-y-auto py-2">
            {categories.map((category) => (
              <a
                key={category.menuCategoryId}
                href={`#category-${category.menuCategoryId}`}
                className="flex min-h-12 items-center justify-between border-b border-line px-1 text-sm font-bold text-ink last:border-b-0"
                onClick={onClose}
              >
                <span>{category.name}</span>
                <span className="text-xs font-semibold text-on-surface-variant">{category.items.length}</span>
              </a>
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

function FoodThumb({ compact = false, imageAltText, imageUrl, name }: { compact?: boolean; imageAltText?: string | null; imageUrl?: string | null; name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 via-white to-emerald-100 ${compact ? "mx-auto h-12 w-12" : "h-full min-h-[144px] w-full"}`}>
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

function FoodPosterFallback({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#dff5e8] via-[#759b89] to-[#001c11]">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/20" />
      <div className="absolute bottom-8 left-8 h-32 w-32 rounded-full bg-[#83fba5]/30" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-28 w-28 place-items-center rounded-full bg-white/80 text-[#001c11] shadow-modal">
          <Utensils className="h-12 w-12" aria-hidden="true" />
        </div>
      </div>
      <span className="sr-only">{name}</span>
    </div>
  );
}

function valueOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function calculateCartEstimate(subtotalAmount: number, settings: PublicQrMenu["billingSettings"], offers: PublicQrMenuOffer[]): CartEstimate {
  const subtotal = roundMoney(subtotalAmount);
  const appliedOffer = selectBestAutoOffer(subtotal, offers);
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

function selectBestAutoOffer(subtotal: number, offers: PublicQrMenuOffer[]): PublicQrMenuOffer | null {
  const eligible = offers
    .filter((offer) => offer.autoApply && offer.discountTypeCode !== "DisplayOnly" && offer.discountValue > 0 && subtotal >= offer.minimumOrderAmount)
    .map((offer) => ({ offer, discountAmount: calculateOfferDiscount(subtotal, offer) }))
    .filter((entry) => entry.discountAmount > 0)
    .sort((left, right) => {
      if (right.discountAmount !== left.discountAmount) {
        return right.discountAmount - left.discountAmount;
      }

      if (left.offer.displayOrder !== right.offer.displayOrder) {
        return left.offer.displayOrder - right.offer.displayOrder;
      }

      return left.offer.title.localeCompare(right.offer.title);
    });

  return eligible[0]?.offer ?? null;
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
