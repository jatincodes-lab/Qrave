"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  LockKeyhole,
  Save,
  Settings,
  Store,
  UserRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { useToast } from "../../../components/ui/toast";
import {
  changeOwnPassword,
  createBranchOrderSettings,
  getBranchBillingSettings,
  getBranchOrderSettings,
  saveBranchBillingSettings,
  updateBranchOrderSettings,
  type BranchBillingSettings,
  type BranchOrderSettings,
  type SaveBranchBillingSettingsInput,
  type SaveBranchOrderSettingsInput
} from "../../../lib/api";
import { useAdminWorkspace } from "../../../lib/admin-workspace";
import { getCurrentRoleCode } from "../../../lib/auth";
import { firstInvalid, validatePassword, validateRequired } from "../../../lib/validation";

const DefaultSettings: SaveBranchOrderSettingsInput = {
  enableDirectQrOrdering: false,
  requireCustomerName: true,
  requireCustomerWhatsApp: true,
  waiterCallEnabled: false
};

const DefaultBillingSettings: SaveBranchBillingSettingsInput = {
  taxEnabled: false,
  taxName: "GST",
  taxRate: 0,
  taxMode: "Exclusive",
  serviceChargeEnabled: false,
  serviceChargeName: "Service charge",
  serviceChargeRate: 0,
  discountEnabled: true,
  staffCanApplyDiscount: false,
  roundingMode: "NearestRupee"
};

const DefaultPasswordForm = {
  currentPassword: "",
  newPassword: ""
};

type SettingsSection = "ordering" | "billing" | "customer" | "security";

const SettingsSections: Array<{
  description: string;
  icon: LucideIcon;
  id: SettingsSection;
  label: string;
  requiresBranchAccess?: boolean;
}> = [
  {
    id: "ordering",
    label: "Ordering",
    description: "QR orders and waiter calls",
    icon: ClipboardList,
    requiresBranchAccess: true
  },
  {
    id: "billing",
    label: "Billing",
    description: "Tax, charges, discounts",
    icon: CreditCard,
    requiresBranchAccess: true
  },
  {
    id: "customer",
    label: "Customer details",
    description: "Checkout information",
    icon: UserRound,
    requiresBranchAccess: true
  },
  {
    id: "security",
    label: "Account security",
    description: "Password for this login",
    icon: LockKeyhole
  }
];

export default function AdminSettingsPage() {
  const workspace = useAdminWorkspace();
  const { toastSuccess } = useToast();
  const roleCode = getCurrentRoleCode();
  const canManageBranchSettings = roleCode === "owner" || roleCode === "admin" || roleCode === "manager";
  const [activeSection, setActiveSection] = useState<SettingsSection>("ordering");
  const [settings, setSettings] = useState<BranchOrderSettings | null>(null);
  const [billingSettings, setBillingSettings] = useState<BranchBillingSettings | null>(null);
  const [form, setForm] = useState<SaveBranchOrderSettingsInput>(DefaultSettings);
  const [billingForm, setBillingForm] = useState<SaveBranchBillingSettingsInput>(DefaultBillingSettings);
  const [passwordForm, setPasswordForm] = useState(DefaultPasswordForm);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBilling, setIsSavingBilling] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const visibleSections = useMemo(
    () => SettingsSections.filter((section) => canManageBranchSettings || !section.requiresBranchAccess),
    [canManageBranchSettings]
  );
  const savedOrderForm = useMemo(() => (settings ? toForm(settings) : DefaultSettings), [settings]);
  const savedBillingForm = useMemo(() => (billingSettings ? toBillingForm(billingSettings) : DefaultBillingSettings), [billingSettings]);
  const isOrderDirty = !sameJson(form, savedOrderForm);
  const isBillingDirty = !sameJson(billingForm, savedBillingForm);

  useEffect(() => {
    if (!canManageBranchSettings && activeSection !== "security") {
      setActiveSection("security");
    }
  }, [activeSection, canManageBranchSettings]);

  useEffect(() => {
    if (!workspace.selectedBranch || !canManageBranchSettings) {
      setSettings(null);
      setBillingSettings(null);
      setForm(DefaultSettings);
      setBillingForm(DefaultBillingSettings);
      return;
    }

    void loadSettings(workspace.selectedBranch.branchId);
  }, [canManageBranchSettings, workspace.selectedBranch?.branchId]);

  async function loadSettings(branchId: string) {
    setIsLoadingSettings(true);

    try {
      const [response, billingResponse] = await Promise.all([getBranchOrderSettings(branchId), getBranchBillingSettings(branchId)]);
      setSettings(response);
      setBillingSettings(billingResponse);
      setForm(response ? toForm(response) : DefaultSettings);
      setBillingForm(billingResponse ? toBillingForm(billingResponse) : DefaultBillingSettings);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingSettings(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace.selectedBranch) {
      return;
    }

    setIsSaving(true);

    try {
      const saved = settings
        ? await updateBranchOrderSettings(workspace.selectedBranch.branchId, form)
        : await createBranchOrderSettings(workspace.selectedBranch.branchId, form);

      setSettings(saved);
      setForm(toForm(saved));
      toastSuccess("Ordering settings saved.");
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveBillingSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace.selectedBranch) {
      return;
    }

    setIsSavingBilling(true);

    try {
      const saved = await saveBranchBillingSettings(workspace.selectedBranch.branchId, {
        ...billingForm,
        taxRate: Number(billingForm.taxRate) || 0,
        serviceChargeRate: Number(billingForm.serviceChargeRate) || 0
      });

      setBillingSettings(saved);
      setBillingForm(toBillingForm(saved));
      toastSuccess("Billing settings saved.");
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsSavingBilling(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = firstInvalid(
      validateRequired(passwordForm.currentPassword, "Current password", 128),
      validatePassword(passwordForm.newPassword)
    );

    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      workspace.setWorkspaceError("New password must be different from current password.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changeOwnPassword(passwordForm);
      setPasswordForm(DefaultPasswordForm);
      toastSuccess("Password changed.");
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsChangingPassword(false);
    }
  }

  const branchName = workspace.selectedBranch?.name ?? "Settings";

  return (
    <AdminShell
      active="settings"
      branchName={branchName}
      branches={workspace.activeBranches}
      onLogout={workspace.logout}
      onSelectedBranchChange={workspace.setSelectedBranchId}
      selectedBranchId={workspace.selectedBranchId}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <Settings size={14} />
              Settings center
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Branch settings</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Configure ordering, customer checkout, billing, and account security for the selected branch.
            </p>
          </div>
        </header>

        <PageError message={workspace.workspaceError} />

        {workspace.isLoadingBranches ? (
          <PageLoading />
        ) : !workspace.selectedBranch ? (
          <EmptyBranchState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatusCard
                icon={<Store size={19} />}
                label="Selected branch"
                value={workspace.selectedBranch.name}
                note={[workspace.selectedBranch.city, workspace.selectedBranch.countryCode].filter(Boolean).join(", ") || "Location not added"}
                tone="neutral"
              />
              <StatusCard
                icon={<ClipboardList size={19} />}
                label="QR ordering"
                value={form.enableDirectQrOrdering ? "Enabled" : "Disabled"}
                note={form.enableDirectQrOrdering ? "Customers can place orders" : "Customers can only browse"}
                tone={form.enableDirectQrOrdering ? "success" : "muted"}
              />
              <StatusCard
                icon={<BellRing size={19} />}
                label="Waiter calls"
                value={form.waiterCallEnabled ? "Enabled" : "Disabled"}
                note={form.waiterCallEnabled ? "Guests can call staff" : "No QR staff requests"}
                tone={form.waiterCallEnabled ? "success" : "muted"}
              />
              <StatusCard
                icon={<CreditCard size={19} />}
                label="Billing"
                value={billingForm.taxEnabled || billingForm.serviceChargeEnabled ? "Configured" : "Basic"}
                note={billingForm.taxEnabled ? `${billingForm.taxName || "Tax"} ${billingForm.taxRate || 0}%` : "No tax enabled"}
                tone={billingForm.taxEnabled || billingForm.serviceChargeEnabled ? "success" : "neutral"}
              />
            </section>

            <section className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <Card className="h-fit border-outline-variant/70 bg-white shadow-soft-saas">
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Choose one area to edit.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {visibleSections.map((section) => (
                    <SettingsNavButton
                      key={section.id}
                      active={activeSection === section.id}
                      description={section.description}
                      icon={section.icon}
                      label={section.label}
                      onClick={() => setActiveSection(section.id)}
                    />
                  ))}
                </CardContent>
              </Card>

              <div className="min-w-0">
                {canManageBranchSettings && isLoadingSettings ? (
                  <PageLoading />
                ) : activeSection === "ordering" && canManageBranchSettings ? (
                  <OrderingSection form={form} isDirty={isOrderDirty} isSaving={isSaving} onChange={setForm} onSubmit={saveSettings} />
                ) : activeSection === "billing" && canManageBranchSettings ? (
                  <BillingSection
                    form={billingForm}
                    isDirty={isBillingDirty}
                    isSaving={isSavingBilling}
                    onChange={setBillingForm}
                    onSubmit={saveBillingSettings}
                  />
                ) : activeSection === "customer" && canManageBranchSettings ? (
                  <CustomerDetailsSection form={form} isDirty={isOrderDirty} isSaving={isSaving} onChange={setForm} onSubmit={saveSettings} />
                ) : (
                  <SecuritySection
                    form={passwordForm}
                    isChanging={isChangingPassword}
                    onChange={setPasswordForm}
                    onSubmit={changePassword}
                    canManageBranchSettings={canManageBranchSettings}
                  />
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function OrderingSection({
  form,
  isDirty,
  isSaving,
  onChange,
  onSubmit
}: {
  form: SaveBranchOrderSettingsInput;
  isDirty: boolean;
  isSaving: boolean;
  onChange: (form: SaveBranchOrderSettingsInput) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <SettingsPanel
      badge="Ordering"
      description="Control whether guests can place orders from the QR menu and request staff from their table."
      icon={<ClipboardList size={18} />}
      title="QR ordering controls"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-3">
          <ToggleCard
            checked={form.enableDirectQrOrdering}
            description="When enabled, customers can submit orders directly from the public QR menu."
            label="Accept direct QR orders"
            onChange={(value) => onChange({ ...form, enableDirectQrOrdering: value })}
          />
          <ToggleCard
            checked={form.waiterCallEnabled}
            description="When enabled, customers can call staff without placing a new order."
            label="Allow waiter calls"
            onChange={(value) => onChange({ ...form, waiterCallEnabled: value })}
          />
        </div>
        <ImpactBox
          title={form.enableDirectQrOrdering ? "Customers can order now" : "QR menu is browse-only"}
          text={form.enableDirectQrOrdering ? "New orders will appear in Orders and Kitchen for this branch." : "Customers can view menu items, but checkout is blocked until ordering is enabled."}
        />
        <SectionActions dirty={isDirty} saving={isSaving} saveLabel="Save ordering" />
      </form>
    </SettingsPanel>
  );
}

function CustomerDetailsSection({
  form,
  isDirty,
  isSaving,
  onChange,
  onSubmit
}: {
  form: SaveBranchOrderSettingsInput;
  isDirty: boolean;
  isSaving: boolean;
  onChange: (form: SaveBranchOrderSettingsInput) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <SettingsPanel
      badge="Customer details"
      description="Choose what information customers must enter before submitting a QR order."
      icon={<UserRound size={18} />}
      title="Checkout requirements"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-3">
          <ToggleCard
            checked={form.requireCustomerName}
            description="Helps staff identify the guest when serving or clarifying an order."
            label="Require customer name"
            onChange={(value) => onChange({ ...form, requireCustomerName: value })}
          />
          <ToggleCard
            checked={form.requireCustomerWhatsApp}
            description="Collects a WhatsApp number for order updates and customer history."
            label="Require WhatsApp number"
            onChange={(value) => onChange({ ...form, requireCustomerWhatsApp: value })}
          />
        </div>
        <ImpactBox
          title="Keep checkout short"
          text="Ask only for details your staff actually uses. Fewer required fields usually means faster ordering."
        />
        <SectionActions dirty={isDirty} saving={isSaving} saveLabel="Save customer fields" />
      </form>
    </SettingsPanel>
  );
}

function BillingSection({
  form,
  isDirty,
  isSaving,
  onChange,
  onSubmit
}: {
  form: SaveBranchBillingSettingsInput;
  isDirty: boolean;
  isSaving: boolean;
  onChange: (form: SaveBranchBillingSettingsInput) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <SettingsPanel
      badge="Billing"
      description="Set the default charges copied into generated bills for this branch."
      icon={<CreditCard size={18} />}
      title="Billing defaults"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <SettingsGroup title="Tax" text="Apply tax to generated bills. Use inclusive mode when menu prices already include tax.">
          <ToggleCard
            checked={form.taxEnabled}
            description="Adds tax rows to generated bills."
            label="Enable tax"
            onChange={(value) => onChange({ ...form, taxEnabled: value })}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tax name">
              <Input
                disabled={!form.taxEnabled}
                value={form.taxName}
                onChange={(event) => onChange({ ...form, taxName: event.target.value })}
              />
            </Field>
            <Field label="Tax rate %">
              <Input
                disabled={!form.taxEnabled}
                type="number"
                min="0"
                max="100"
                step="0.001"
                value={form.taxRate}
                onChange={(event) => onChange({ ...form, taxRate: Number(event.target.value) })}
              />
            </Field>
            <Field label="Tax mode">
              <SelectField
                disabled={!form.taxEnabled}
                value={form.taxMode}
                onChange={(value) => onChange({ ...form, taxMode: value as SaveBranchBillingSettingsInput["taxMode"] })}
                options={[
                  { label: "Exclusive", value: "Exclusive" },
                  { label: "Inclusive", value: "Inclusive" }
                ]}
              />
            </Field>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Service charge" text="Apply a branch-level service charge on generated bills.">
          <ToggleCard
            checked={form.serviceChargeEnabled}
            description="Adds a service charge row to generated bills."
            label="Enable service charge"
            onChange={(value) => onChange({ ...form, serviceChargeEnabled: value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Service charge label">
              <Input
                disabled={!form.serviceChargeEnabled}
                value={form.serviceChargeName}
                onChange={(event) => onChange({ ...form, serviceChargeName: event.target.value })}
              />
            </Field>
            <Field label="Service charge %">
              <Input
                disabled={!form.serviceChargeEnabled}
                type="number"
                min="0"
                max="100"
                step="0.001"
                value={form.serviceChargeRate}
                onChange={(event) => onChange({ ...form, serviceChargeRate: Number(event.target.value) })}
              />
            </Field>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Discounts and rounding" text="Control manual discounts and final bill rounding.">
          <div className="grid gap-3 lg:grid-cols-2">
          <ToggleCard
            checked={form.discountEnabled}
            description="Allows generated bills to include manual discounts."
            label="Allow discounts"
            onChange={(value) => onChange({ ...form, discountEnabled: value, staffCanApplyDiscount: value ? form.staffCanApplyDiscount : false })}
          />
            <ToggleCard
              checked={form.staffCanApplyDiscount}
              description="Lets non-owner staff apply discounts when billing."
              disabled={!form.discountEnabled}
              label="Staff can apply discounts"
              onChange={(value) => onChange({ ...form, staffCanApplyDiscount: value })}
            />
          </div>
          <Field label="Rounding">
            <SelectField
              value={form.roundingMode}
              onChange={(value) => onChange({ ...form, roundingMode: value as SaveBranchBillingSettingsInput["roundingMode"] })}
              options={[
                { label: "Nearest rupee", value: "NearestRupee" },
                { label: "No rounding", value: "None" }
              ]}
            />
          </Field>
        </SettingsGroup>

        <SectionActions dirty={isDirty} saving={isSaving} saveLabel="Save billing" />
      </form>
    </SettingsPanel>
  );
}

function SecuritySection({
  canManageBranchSettings,
  form,
  isChanging,
  onChange,
  onSubmit
}: {
  canManageBranchSettings: boolean;
  form: typeof DefaultPasswordForm;
  isChanging: boolean;
  onChange: (form: typeof DefaultPasswordForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <SettingsPanel
      badge="Security"
      description="Change the password used by the currently signed-in admin account."
      icon={<LockKeyhole size={18} />}
      title="Account security"
    >
      {!canManageBranchSettings ? (
        <ImpactBox
          title="Limited branch access"
          text="Your role can update account security here. Ask an owner, admin, or manager to change branch operations and billing settings."
        />
      ) : null}
      <form onSubmit={onSubmit} className="mt-5 max-w-xl space-y-4">
        <Field label="Current password">
          <Input
            autoComplete="current-password"
            type="password"
            value={form.currentPassword}
            onChange={(event) => onChange({ ...form, currentPassword: event.target.value })}
          />
        </Field>
        <Field label="New password">
          <Input
            autoComplete="new-password"
            type="password"
            value={form.newPassword}
            onChange={(event) => onChange({ ...form, newPassword: event.target.value })}
          />
        </Field>
        <div className="pt-2">
          <Button type="submit" disabled={isChanging}>
            <Save size={17} />
            {isChanging ? "Changing..." : "Change password"}
          </Button>
        </div>
      </form>
    </SettingsPanel>
  );
}

function StatusCard({
  icon,
  label,
  note,
  tone,
  value
}: {
  icon: ReactNode;
  label: string;
  note: string;
  tone: "muted" | "neutral" | "success";
  value: string;
}) {
  const toneClass = tone === "success" ? "bg-secondary-container text-primary" : tone === "muted" ? "bg-surface-container text-on-surface-variant" : "bg-primary-fixed text-primary";

  return (
    <Card className="border-outline-variant/70 bg-white shadow-soft-saas">
      <CardContent className="flex min-h-28 items-center gap-4 p-5">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneClass}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold uppercase tracking-wide text-on-surface-variant">{label}</p>
          <p className="mt-1 truncate text-xl font-extrabold text-on-surface">{value}</p>
          <p className="mt-1 truncate text-xs font-semibold text-on-surface-variant">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsNavButton({
  active,
  description,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  description: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-primary/20 bg-secondary-container text-primary"
          : "border-transparent bg-white text-on-surface hover:border-outline-variant/70 hover:bg-surface-container-low"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-white text-primary" : "bg-surface-container text-on-surface-variant"}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold">{label}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold opacity-70">{description}</span>
      </span>
    </button>
  );
}

function SettingsPanel({
  badge,
  children,
  description,
  icon,
  title
}: {
  badge: string;
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Card className="border-outline-variant/70 bg-white shadow-soft-saas">
      <CardHeader className="border-b border-outline-variant/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              {icon}
              {badge}
            </Badge>
            <CardTitle className="mt-4 text-2xl">{title}</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">{children}</CardContent>
    </Card>
  );
}

function SettingsGroup({ children, text, title }: { children: ReactNode; text: string; title: string }) {
  return (
    <section className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-4">
      <div className="mb-4">
        <h3 className="text-base font-extrabold text-on-surface">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant">{text}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ToggleCard({
  checked,
  description,
  disabled = false,
  label,
  onChange
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${disabled ? "border-outline-variant/50 bg-surface-container-low opacity-70" : "border-outline-variant/70 bg-white hover:border-primary/25"}`}>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-extrabold text-on-surface">
          {checked ? <CheckCircle2 size={16} className="text-primary" /> : null}
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-on-surface-variant">{description}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-outline-variant"}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </span>
    </label>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SelectField({
  disabled = false,
  onChange,
  options,
  value
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <select
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ImpactBox({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-xl border border-primary/15 bg-secondary-container/70 p-4">
      <p className="text-sm font-extrabold text-primary">{title}</p>
      <p className="mt-1 text-sm leading-6 text-on-surface-variant">{text}</p>
    </div>
  );
}

function SectionActions({ dirty, saveLabel, saving }: { dirty: boolean; saveLabel: string; saving: boolean }) {
  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-on-surface-variant">{dirty ? "You have unsaved changes." : "All changes are saved."}</p>
      <Button type="submit" disabled={saving || !dirty} className="sm:w-fit">
        <Save size={17} />
        {saving ? "Saving..." : saveLabel}
      </Button>
    </div>
  );
}

function toForm(settings: BranchOrderSettings): SaveBranchOrderSettingsInput {
  return {
    enableDirectQrOrdering: settings.enableDirectQrOrdering,
    requireCustomerName: settings.requireCustomerName,
    requireCustomerWhatsApp: settings.requireCustomerWhatsApp,
    waiterCallEnabled: settings.waiterCallEnabled
  };
}

function toBillingForm(settings: BranchBillingSettings): SaveBranchBillingSettingsInput {
  return {
    taxEnabled: settings.taxEnabled,
    taxName: settings.taxName,
    taxRate: settings.taxRate,
    taxMode: settings.taxMode,
    serviceChargeEnabled: settings.serviceChargeEnabled,
    serviceChargeName: settings.serviceChargeName,
    serviceChargeRate: settings.serviceChargeRate,
    discountEnabled: settings.discountEnabled,
    staffCanApplyDiscount: settings.staffCanApplyDiscount,
    roundingMode: settings.roundingMode
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
