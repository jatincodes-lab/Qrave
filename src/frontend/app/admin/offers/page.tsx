"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, Clock3, Gift, IndianRupee, Loader2, Megaphone, Pencil, Percent, Plus, Power, RefreshCw, Save, TicketPercent, X } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { MenuItemImagePicker } from "../../../components/menu-item-image-picker";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  createBranchOffer,
  deactivateBranchOffer,
  getBranchOffers,
  updateBranchOffer,
  type BranchOffer,
  type CreateBranchOfferInput,
  type OfferDiscountTypeCode
} from "../../../lib/api";
import { useAdminWorkspace } from "../../../lib/admin-workspace";
import { firstInvalid, validateOptionalText, validatePositiveInteger, validateRequired } from "../../../lib/validation";

type OfferForm = {
  title: string;
  subtitle: string;
  discountText: string;
  imageUrl: string;
  imageAltText: string;
  displayOrder: string;
  discountTypeCode: OfferDiscountTypeCode;
  discountValue: string;
  minimumOrderAmount: string;
  maxDiscountAmount: string;
  autoApply: boolean;
  promoCode: string;
  requiresPromoCode: boolean;
  startsAtLocal: string;
  endsAtLocal: string;
  maxTotalRedemptions: string;
  maxRedemptionsPerCustomer: string;
  maxRedemptionsPerDay: string;
};

const EmptyOfferForm: OfferForm = {
  title: "",
  subtitle: "",
  discountText: "",
  imageUrl: "",
  imageAltText: "",
  displayOrder: "1",
  discountTypeCode: "DisplayOnly",
  discountValue: "0",
  minimumOrderAmount: "0",
  maxDiscountAmount: "",
  autoApply: false,
  promoCode: "",
  requiresPromoCode: false,
  startsAtLocal: "",
  endsAtLocal: "",
  maxTotalRedemptions: "",
  maxRedemptionsPerCustomer: "",
  maxRedemptionsPerDay: ""
};

export default function AdminOffersPage() {
  const workspace = useAdminWorkspace();
  const [offers, setOffers] = useState<BranchOffer[]>([]);
  const [form, setForm] = useState<OfferForm>(EmptyOfferForm);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<OfferForm>(EmptyOfferForm);
  const [isLoading, setIsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const sortedOffers = useMemo(() => [...offers].sort((left, right) => left.displayOrder - right.displayOrder), [offers]);
  const offerStats = useMemo(
    () => ({
      redemptions: offers.reduce((total, offer) => total + offer.totalRedemptions, 0),
      discount: offers.reduce((total, offer) => total + offer.totalDiscountAmount, 0),
      revenue: offers.reduce((total, offer) => total + offer.totalRevenueAmount, 0)
    }),
    [offers]
  );

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setOffers([]);
      return;
    }

    void loadOffers(workspace.selectedBranch.branchId);
  }, [workspace.selectedBranch?.branchId]);

  async function loadOffers(branchId: string) {
    setIsLoading(true);
    try {
      setOffers(await getBranchOffers(branchId));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoading(false);
    }
  }

  async function createOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace.selectedBranch) {
      return;
    }

    setSavingKey("offer");
    try {
      const validation = validateOfferForm(form);
      if (!validation.isValid) {
        workspace.setWorkspaceError(validation.message);
        return;
      }

      const offer = await createBranchOffer(workspace.selectedBranch.branchId, toOfferInput(form));
      setOffers((current) => [...current, offer]);
      setForm({ ...EmptyOfferForm, displayOrder: String(offers.length + 2) });
      workspace.setWorkspaceError(null);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  function startEditOffer(offer: BranchOffer) {
    setEditingOfferId(offer.branchOfferId);
    setEditingForm(toOfferForm(offer));
    workspace.setWorkspaceError(null);
  }

  function cancelEditOffer() {
    setEditingOfferId(null);
    setEditingForm(EmptyOfferForm);
    workspace.setWorkspaceError(null);
  }

  async function saveOffer(event: FormEvent<HTMLFormElement>, offer: BranchOffer) {
    event.preventDefault();
    if (!workspace.selectedBranch) {
      return;
    }

    const validation = validateOfferForm(editingForm);
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    setSavingKey(`edit-${offer.branchOfferId}`);
    try {
      const updated = await updateBranchOffer(workspace.selectedBranch.branchId, offer.branchOfferId, {
        ...toOfferInput(editingForm),
        isActive: offer.isActive
      });
      setOffers((current) => current.map((item) => (item.branchOfferId === updated.branchOfferId ? updated : item)));
      cancelEditOffer();
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  async function turnOffOffer(offer: BranchOffer) {
    if (!workspace.selectedBranch) {
      return;
    }

    setSavingKey(offer.branchOfferId);
    try {
      await deactivateBranchOffer(workspace.selectedBranch.branchId, offer.branchOfferId);
      setOffers((current) => current.filter((item) => item.branchOfferId !== offer.branchOfferId));
      if (editingOfferId === offer.branchOfferId) {
        cancelEditOffer();
      }
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  const branchName = workspace.selectedBranch?.name ?? "Offers";

  return (
    <AdminShell
      active="offers"
      branchName={branchName}
      branches={workspace.activeBranches}
      onLogout={workspace.logout}
      onSelectedBranchChange={workspace.setSelectedBranchId}
      selectedBranchId={workspace.selectedBranchId}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <Gift size={14} />
              Offers
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Offers and combo banners</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Create customer-facing promotions for the QR menu. Use these for discounts, combo messaging, and seasonal specials.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => workspace.selectedBranch && loadOffers(workspace.selectedBranch.branchId)} className="w-full sm:w-auto">
            <RefreshCw size={17} />
            Refresh
          </Button>
        </header>

        <PageError message={workspace.workspaceError} />

        {workspace.isLoadingBranches ? (
          <PageLoading />
        ) : !workspace.selectedBranch ? (
          <EmptyBranchState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard icon={<Gift size={20} />} label="Active offers" value={isLoading ? "..." : String(offers.length)} />
              <MetricCard icon={<TicketPercent size={20} />} label="Redemptions" value={isLoading ? "..." : String(offerStats.redemptions)} />
              <MetricCard icon={<BarChart3 size={20} />} label="Offer revenue" value={isLoading ? "..." : formatCurrency(offerStats.revenue)} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Add offer or combo</CardTitle>
                  <CardDescription>Choose what you want customers to see, then fill only the required details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createOffer} className="grid gap-4">
                    <OfferFormFields form={form} onChange={setForm} />
                    <Button type="submit" disabled={savingKey === "offer"} className="h-12 w-full justify-self-start sm:w-auto">
                      {savingKey === "offer" ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                      Create offer
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active QR offers</CardTitle>
                  <CardDescription>These appear in the customer QR menu carousel.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {isLoading ? (
                    <PageLoading />
                  ) : sortedOffers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
                      <p className="text-sm font-bold text-on-surface">No active offers</p>
                      <p className="mt-1 text-sm text-on-surface-variant">Add a promotion or combo banner to highlight it on the QR menu.</p>
                    </div>
                  ) : (
                    sortedOffers.map((offer) => (
                      <article key={offer.branchOfferId} className="grid gap-3 rounded-xl border border-outline-variant/60 bg-white p-4 shadow-sm">
                        {editingOfferId === offer.branchOfferId ? (
                          <form onSubmit={(event) => saveOffer(event, offer)} className="grid gap-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-extrabold text-on-surface">Edit offer</p>
                                <p className="mt-1 text-xs text-on-surface-variant">Changes update the QR menu after saving.</p>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={cancelEditOffer} className="h-9 w-9" aria-label="Cancel edit">
                                <X size={16} />
                              </Button>
                            </div>
                            <OfferFormFields form={editingForm} onChange={setEditingForm} />
                            <div className="grid gap-2 sm:flex sm:justify-end">
                              <Button type="button" variant="outline" onClick={cancelEditOffer} className="h-11">
                                Cancel
                              </Button>
                              <Button type="submit" disabled={savingKey === `edit-${offer.branchOfferId}`} className="h-11">
                                {savingKey === `edit-${offer.branchOfferId}` ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save offer
                              </Button>
                            </div>
                          </form>
                        ) : (
                            <div className="grid gap-4 sm:flex sm:items-start sm:justify-between">
                              <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="break-words text-sm font-extrabold text-on-surface">{offer.title}</p>
                                <Badge variant={offer.discountTypeCode === "DisplayOnly" ? "outline" : "secondary"}>{offer.discountTypeCode === "DisplayOnly" ? "Combo banner" : offer.requiresPromoCode ? "Coupon" : "Auto discount"}</Badge>
                              </div>
                              <p className="mt-1 break-words text-xs leading-5 text-on-surface-variant">{offer.subtitle || offer.discountText || "No subtitle"}</p>
                              <p className="mt-2 text-xs font-semibold text-on-surface-variant">
                                {formatOfferRule(offer)} - Order {offer.displayOrder}
                              </p>
                              <div className="mt-3 grid gap-2 text-xs text-on-surface-variant sm:grid-cols-3">
                                <MetricPill label="Used" value={String(offer.totalRedemptions)} />
                                <MetricPill label="Discount" value={formatCurrency(offer.totalDiscountAmount)} />
                                <MetricPill label="Revenue" value={formatCurrency(offer.totalRevenueAmount)} />
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {offer.promoCode ? (
                                  <Badge variant="secondary" className="gap-1">
                                    <TicketPercent size={12} />
                                    {offer.promoCode}
                                  </Badge>
                                ) : null}
                                {formatSchedule(offer) ? (
                                  <Badge variant="outline" className="gap-1">
                                    <Clock3 size={12} />
                                    {formatSchedule(offer)}
                                  </Badge>
                                ) : null}
                                {formatLimits(offer) ? <Badge variant="outline">{formatLimits(offer)}</Badge> : null}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:flex">
                              <Button type="button" variant="outline" onClick={() => startEditOffer(offer)} className="h-11 w-full sm:w-auto">
                                <Pencil size={14} />
                                Edit
                              </Button>
                              <Button type="button" variant="outline" disabled={savingKey === offer.branchOfferId} onClick={() => turnOffOffer(offer)} className="h-11 w-full sm:w-auto">
                                {savingKey === offer.branchOfferId ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                                Off
                              </Button>
                            </div>
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-bold uppercase text-on-surface-variant">{label}</Label>
      {children}
    </div>
  );
}

function OfferFormFields({ form, onChange }: { form: OfferForm; onChange: (form: OfferForm) => void }) {
  const isDisplayOnly = form.discountTypeCode === "DisplayOnly";
  const isCoupon = form.discountTypeCode !== "DisplayOnly" && form.requiresPromoCode;
  const isAutoDiscount = form.discountTypeCode !== "DisplayOnly" && form.autoApply;

  return (
    <>
      <div className="grid gap-3">
        <p className="text-sm font-extrabold text-on-surface">What do you want to create?</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <OfferTypeButton
            active={isDisplayOnly}
            description="Show a combo or festival banner on the QR menu."
            icon={<Megaphone size={18} />}
            label="Combo banner"
            onClick={() =>
              onChange({
                ...form,
                discountTypeCode: "DisplayOnly",
                discountValue: "0",
                minimumOrderAmount: "0",
                maxDiscountAmount: "",
                autoApply: false,
                promoCode: "",
                requiresPromoCode: false
              })
            }
          />
          <OfferTypeButton
            active={isCoupon}
            description="Customer enters a code before placing the order."
            icon={<TicketPercent size={18} />}
            label="Coupon code"
            onClick={() =>
              onChange({
                ...form,
                discountTypeCode: form.discountTypeCode === "DisplayOnly" ? "Percentage" : form.discountTypeCode,
                discountValue: form.discountTypeCode === "DisplayOnly" ? "10" : form.discountValue,
                autoApply: false,
                requiresPromoCode: true,
                promoCode: form.promoCode || "WELCOME10"
              })
            }
          />
          <OfferTypeButton
            active={isAutoDiscount}
            description="Discount applies automatically when the cart qualifies."
            icon={<Percent size={18} />}
            label="Auto discount"
            onClick={() =>
              onChange({
                ...form,
                discountTypeCode: form.discountTypeCode === "DisplayOnly" ? "Percentage" : form.discountTypeCode,
                discountValue: form.discountTypeCode === "DisplayOnly" ? "10" : form.discountValue,
                autoApply: true,
                requiresPromoCode: false,
                promoCode: ""
              })
            }
          />
        </div>
      </div>

      <SectionPanel title="Customer text">
        <div className="grid gap-3">
          <Field label="Offer name">
            <Input value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} required placeholder={isDisplayOnly ? "Family combo" : isCoupon ? "Welcome coupon" : "Lunch discount"} className="h-11" />
          </Field>
          <Field label="Short description">
            <Input value={form.subtitle} onChange={(event) => onChange({ ...form, subtitle: event.target.value })} placeholder={isDisplayOnly ? "Pizza + pasta + 2 drinks" : "Valid on QR orders today"} className="h-11" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
            <Field label="Badge text">
              <Input value={form.discountText} onChange={(event) => onChange({ ...form, discountText: event.target.value })} placeholder={isDisplayOnly ? "Best for 2" : "Save Rs 99"} className="h-11" />
            </Field>
            <Field label="Display order">
              <Input type="number" min="1" value={form.displayOrder} onChange={(event) => onChange({ ...form, displayOrder: event.target.value })} required className="h-11" />
            </Field>
          </div>
        </div>
      </SectionPanel>

      {!isDisplayOnly ? (
        <SectionPanel title="Discount rule">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Discount type">
              <div className="grid grid-cols-2 gap-2">
                <RuleButton active={form.discountTypeCode === "Percentage"} icon={<Percent size={15} />} label="Percent" onClick={() => onChange({ ...form, discountTypeCode: "Percentage" })} />
                <RuleButton active={form.discountTypeCode === "FixedAmount"} icon={<IndianRupee size={15} />} label="Rupees" onClick={() => onChange({ ...form, discountTypeCode: "FixedAmount", maxDiscountAmount: "" })} />
              </div>
            </Field>
            <Field label={form.discountTypeCode === "Percentage" ? "Discount percent" : "Discount amount"}>
              <Input
                type="number"
                min="0"
                max={form.discountTypeCode === "Percentage" ? "100" : undefined}
                step="0.01"
                value={form.discountValue}
                onChange={(event) => onChange({ ...form, discountValue: event.target.value })}
                className="h-11"
              />
            </Field>
            <Field label="Minimum order amount">
              <Input type="number" min="0" step="0.01" value={form.minimumOrderAmount} onChange={(event) => onChange({ ...form, minimumOrderAmount: event.target.value })} placeholder="0" className="h-11" />
            </Field>
            {form.discountTypeCode === "Percentage" ? (
              <Field label="Maximum discount">
                <Input type="number" min="0" step="0.01" value={form.maxDiscountAmount} onChange={(event) => onChange({ ...form, maxDiscountAmount: event.target.value })} placeholder="No cap" className="h-11" />
              </Field>
            ) : null}
          </div>
        </SectionPanel>
      ) : null}

      {isCoupon ? (
        <SectionPanel title="Coupon code">
          <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Promo code">
            <Input
              value={form.promoCode}
              onChange={(event) => onChange({ ...form, promoCode: event.target.value.toUpperCase().replace(/\s+/g, "") })}
              placeholder="ENTER CODE"
              maxLength={40}
              className="h-11"
            />
          </Field>
            <div className="rounded-lg border border-outline-variant/60 bg-white px-3 py-2 text-xs leading-5 text-on-surface-variant">
              Customers will tap “Have a promo or coupon code?” on the QR cart and enter this code before checkout.
            </div>
          </div>
        </SectionPanel>
      ) : null}

      {!isDisplayOnly ? (
        <SectionPanel title="Usage limits">
          <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Total uses">
            <Input type="number" min="1" value={form.maxTotalRedemptions} onChange={(event) => onChange({ ...form, maxTotalRedemptions: event.target.value })} placeholder="No limit" className="h-11" />
          </Field>
          <Field label="Uses per customer">
            <Input type="number" min="1" value={form.maxRedemptionsPerCustomer} onChange={(event) => onChange({ ...form, maxRedemptionsPerCustomer: event.target.value })} placeholder="No limit" className="h-11" />
          </Field>
          <Field label="Uses per day">
            <Input type="number" min="1" value={form.maxRedemptionsPerDay} onChange={(event) => onChange({ ...form, maxRedemptionsPerDay: event.target.value })} placeholder="No limit" className="h-11" />
          </Field>
          </div>
        </SectionPanel>
      ) : null}

      <SectionPanel title="Schedule">
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Starts at">
            <Input type="datetime-local" value={form.startsAtLocal} onChange={(event) => onChange({ ...form, startsAtLocal: event.target.value })} className="h-11" />
          </Field>
          <Field label="Ends at">
            <Input type="datetime-local" value={form.endsAtLocal} onChange={(event) => onChange({ ...form, endsAtLocal: event.target.value })} className="h-11" />
          </Field>
        </div>
      </SectionPanel>

      <SectionPanel title="Image">
        <Field label="Offer image">
          <MenuItemImagePicker
            imageAltText={form.imageAltText}
            imageUrl={form.imageUrl}
            itemName={form.title}
            purpose="offer"
            onChange={(next) => onChange({ ...form, imageUrl: next.imageUrl, imageAltText: next.imageAltText })}
          />
        </Field>
      </SectionPanel>
    </>
  );
}

function SectionPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-3 sm:p-4">
      <p className="text-sm font-extrabold text-on-surface">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function OfferTypeButton({ active, description, icon, label, onClick }: { active: boolean; description: string; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid min-h-[116px] gap-2 rounded-xl border p-3 text-left transition sm:min-h-[138px] ${
        active ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-outline-variant/70 bg-white text-on-surface hover:border-primary/50"
      }`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-primary text-white" : "bg-surface-container-low text-on-surface"}`}>{icon}</span>
      <span className="text-sm font-black">{label}</span>
      <span className="text-xs font-semibold leading-5 text-on-surface-variant">{description}</span>
    </button>
  );
}

function RuleButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-extrabold ${
        active ? "border-primary bg-primary text-white" : "border-outline-variant/70 bg-white text-on-surface"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function toOfferForm(offer: BranchOffer): OfferForm {
  return {
    title: offer.title,
    subtitle: offer.subtitle ?? "",
    discountText: offer.discountText ?? "",
    imageUrl: offer.imageUrl ?? "",
    imageAltText: offer.imageAltText ?? "",
    displayOrder: String(offer.displayOrder),
    discountTypeCode: offer.discountTypeCode,
    discountValue: String(offer.discountValue),
    minimumOrderAmount: String(offer.minimumOrderAmount),
    maxDiscountAmount: offer.maxDiscountAmount === null ? "" : String(offer.maxDiscountAmount),
    autoApply: offer.autoApply,
    promoCode: offer.promoCode ?? "",
    requiresPromoCode: offer.requiresPromoCode,
    startsAtLocal: toDateTimeLocal(offer.startsAtUtc),
    endsAtLocal: toDateTimeLocal(offer.endsAtUtc),
    maxTotalRedemptions: offer.maxTotalRedemptions === null ? "" : String(offer.maxTotalRedemptions),
    maxRedemptionsPerCustomer: offer.maxRedemptionsPerCustomer === null ? "" : String(offer.maxRedemptionsPerCustomer),
    maxRedemptionsPerDay: offer.maxRedemptionsPerDay === null ? "" : String(offer.maxRedemptionsPerDay)
  };
}

function toOfferInput(form: OfferForm): CreateBranchOfferInput {
  return {
    title: form.title.trim(),
    subtitle: optional(form.subtitle),
    discountText: optional(form.discountText),
    imageUrl: optional(form.imageUrl),
    imageAltText: form.imageUrl ? optional(form.imageAltText) ?? form.title.trim() : null,
    displayOrder: toPositiveNumber(form.displayOrder),
    startsAtUtc: toUtcDateTime(form.startsAtLocal),
    endsAtUtc: toUtcDateTime(form.endsAtLocal),
    discountTypeCode: form.discountTypeCode,
    discountValue: form.discountTypeCode === "DisplayOnly" ? 0 : toMoneyNumber(form.discountValue),
    minimumOrderAmount: form.discountTypeCode === "DisplayOnly" ? 0 : toMoneyNumber(form.minimumOrderAmount),
    maxDiscountAmount: form.discountTypeCode === "Percentage" ? optionalMoney(form.maxDiscountAmount) : null,
    autoApply: form.discountTypeCode !== "DisplayOnly" && form.autoApply,
    promoCode: form.discountTypeCode === "DisplayOnly" ? null : optional(form.promoCode.toUpperCase()),
    requiresPromoCode: form.discountTypeCode !== "DisplayOnly" && form.requiresPromoCode,
    maxTotalRedemptions: optionalPositiveInteger(form.maxTotalRedemptions),
    maxRedemptionsPerCustomer: optionalPositiveInteger(form.maxRedemptionsPerCustomer),
    maxRedemptionsPerDay: optionalPositiveInteger(form.maxRedemptionsPerDay)
  };
}

function validateOfferForm(form: OfferForm) {
  return firstInvalid(
    validateRequired(form.title, "Title"),
    validateOptionalText(form.subtitle, "Subtitle", 200),
    validateOptionalText(form.discountText, "Discount text", 120),
    validatePositiveInteger(form.displayOrder, "Order"),
    validateOfferRule(form),
    validatePromoCode(form),
    validateSchedule(form),
    validateOptionalLimit(form.maxTotalRedemptions, "Total uses"),
    validateOptionalLimit(form.maxRedemptionsPerCustomer, "Uses per customer"),
    validateOptionalLimit(form.maxRedemptionsPerDay, "Uses per day")
  );
}

function validateOfferRule(form: OfferForm) {
  if (form.discountTypeCode === "DisplayOnly") {
    return { isValid: true, message: "" };
  }

  const discountValue = Number(form.discountValue);
  const minimumOrderAmount = Number(form.minimumOrderAmount);
  const maxDiscountAmount = form.maxDiscountAmount.trim() ? Number(form.maxDiscountAmount) : null;

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { isValid: false, message: "Discount value must be greater than 0." };
  }

  if (form.discountTypeCode === "Percentage" && discountValue > 100) {
    return { isValid: false, message: "Percentage discount cannot exceed 100." };
  }

  if (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
    return { isValid: false, message: "Minimum order amount cannot be negative." };
  }

  if (maxDiscountAmount !== null && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount < 0)) {
    return { isValid: false, message: "Maximum discount amount cannot be negative." };
  }

  return { isValid: true, message: "" };
}

function validatePromoCode(form: OfferForm) {
  const code = form.promoCode.trim();
  if (form.discountTypeCode === "DisplayOnly" || (!code && !form.requiresPromoCode)) {
    return { isValid: true, message: "" };
  }

  if (code.length < 3 || code.length > 40) {
    return { isValid: false, message: "Promo code must be between 3 and 40 characters." };
  }

  if (!/^[A-Z0-9_-]+$/i.test(code)) {
    return { isValid: false, message: "Promo code can contain only letters, numbers, hyphens, or underscores." };
  }

  if (form.requiresPromoCode && !code) {
    return { isValid: false, message: "Enter a promo code when code entry is required." };
  }

  return { isValid: true, message: "" };
}

function validateSchedule(form: OfferForm) {
  if (!form.startsAtLocal || !form.endsAtLocal) {
    return { isValid: true, message: "" };
  }

  return new Date(form.endsAtLocal).getTime() > new Date(form.startsAtLocal).getTime()
    ? { isValid: true, message: "" }
    : { isValid: false, message: "Offer end date must be after the start date." };
}

function validateOptionalLimit(value: string, label: string) {
  if (!value.trim()) {
    return { isValid: true, message: "" };
  }

  return validatePositiveInteger(value, label);
}

function optional(value: string): string | null {
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function toPositiveNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function toMoneyNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
}

function optionalMoney(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : null;
}

function optionalPositiveInteger(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function toUtcDateTime(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function toDateTimeLocal(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatOfferRule(offer: BranchOffer): string {
  if (offer.discountTypeCode === "DisplayOnly") {
    return "Display only";
  }

  const value = offer.discountTypeCode === "Percentage" ? `${offer.discountValue}% off` : `Rs ${offer.discountValue} off`;
  const minimum = offer.minimumOrderAmount > 0 ? ` above Rs ${offer.minimumOrderAmount}` : "";
  return `${offer.autoApply ? "Auto" : "Manual"} ${value}${minimum}`;
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-2">
      <span className="block text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</span>
      <span className="mt-1 block font-black text-on-surface">{value}</span>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatSchedule(offer: BranchOffer): string | null {
  if (!offer.startsAtUtc && !offer.endsAtUtc) {
    return null;
  }

  if (offer.startsAtUtc && offer.endsAtUtc) {
    return `${formatShortDate(offer.startsAtUtc)} to ${formatShortDate(offer.endsAtUtc)}`;
  }

  return offer.startsAtUtc ? `Starts ${formatShortDate(offer.startsAtUtc)}` : `Ends ${formatShortDate(offer.endsAtUtc!)}`;
}

function formatLimits(offer: BranchOffer): string | null {
  const limits = [
    offer.maxTotalRedemptions ? `${offer.maxTotalRedemptions} total` : null,
    offer.maxRedemptionsPerCustomer ? `${offer.maxRedemptionsPerCustomer}/customer` : null,
    offer.maxRedemptionsPerDay ? `${offer.maxRedemptionsPerDay}/day` : null
  ].filter(Boolean);

  return limits.length > 0 ? `Limit ${limits.join(", ")}` : null;
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
