"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Power, RotateCcw, Save } from "lucide-react";
import {
  ApiError,
  createSuperAdminRestaurantNote,
  extendSuperAdminRestaurantTrial,
  getSuperAdminRestaurantDetail,
  reactivateSuperAdminRestaurant,
  suspendSuperAdminRestaurant,
  updateSuperAdminRestaurantSubscription,
  type AccountStatusCode,
  type SubscriptionStatusCode,
  type SuperAdminRestaurantDetail,
  type UpdateTenantSubscriptionInput
} from "../../../../lib/api";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { SuperAdminShell, StatusPill, formatDate, formatMoney } from "../../superadmin-common";

export default function SuperAdminRestaurantDetailPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const [detail, setDetail] = useState<SuperAdminRestaurantDetail | null>(null);
  const [form, setForm] = useState<UpdateTenantSubscriptionInput | null>(null);
  const [trialDays, setTrialDays] = useState("7");
  const [actionNote, setActionNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [tenantId]);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getSuperAdminRestaurantDetail(tenantId);
      setDetail(response);
      setForm({
        planCode: response.restaurant.planCode,
        subscriptionStatusCode: response.restaurant.subscriptionStatusCode,
        accountStatusCode: response.restaurant.accountStatusCode,
        trialEndAtUtc: response.restaurant.trialEndAtUtc,
        subscriptionNotes: ""
      });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load restaurant.");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) {
      return;
    }

    await run("subscription", async () => {
      await updateSuperAdminRestaurantSubscription(tenantId, form);
      await load();
    });
  }

  async function extendTrial() {
    await run("extend", async () => {
      await extendSuperAdminRestaurantTrial(tenantId, { days: Number(trialDays) || 7, subscriptionNotes: actionNote || null });
      setActionNote("");
      await load();
    });
  }

  async function reactivate() {
    await run("reactivate", async () => {
      await reactivateSuperAdminRestaurant(tenantId, { subscriptionNotes: actionNote || null });
      setActionNote("");
      await load();
    });
  }

  async function suspend() {
    if (actionNote.trim().length < 2) {
      setError("Suspension reason is required.");
      return;
    }

    const confirmed = window.confirm("Suspend this restaurant? Customers will see that the restaurant is temporarily unavailable.");
    if (!confirmed) {
      return;
    }

    await run("suspend", async () => {
      await suspendSuperAdminRestaurant(tenantId, { subscriptionNotes: actionNote.trim() });
      setActionNote("");
      await load();
    });
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("note", async () => {
      await createSuperAdminRestaurantNote(tenantId, internalNote);
      setInternalNote("");
      await load();
    });
  }

  async function run(key: string, action: () => Promise<void>) {
    setSavingKey(key);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Action failed.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <SuperAdminShell title={detail?.restaurant.name ?? "Restaurant Detail"}>
      <Link href="/superadmin/restaurants" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
        <ArrowLeft size={16} />
        Back to restaurants
      </Link>

      {error ? <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-bold text-destructive">{error}</div> : null}

      {isLoading || !detail || !form ? (
        <div className="rounded-xl border border-outline-variant/50 bg-white p-8 text-center text-sm font-bold text-on-surface-variant">Loading restaurant detail...</div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <Card className="border-outline-variant/50 bg-surface-container-lowest">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{detail.restaurant.name}</CardTitle>
                    <CardDescription>{detail.restaurant.ownerEmail}</CardDescription>
                  </div>
                  <StatusPill value={detail.restaurant.subscriptionStatusCode} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Info label="Slug" value={detail.restaurant.slug} />
                <Info label="Plan" value={detail.restaurant.planCode} />
                <Info label="Trial ends" value={formatDate(detail.restaurant.trialEndAtUtc)} />
                <Info label="Access" value={detail.accessStatus.message} />
                <Info label="Branches" value={detail.restaurant.branchCount} />
                <Info label="Orders" value={detail.restaurant.orderCount} />
                <Info label="Revenue" value={formatMoney(detail.restaurant.revenueTotal)} />
                <Info label="Created" value={formatDate(detail.restaurant.createdAtUtc)} />
              </CardContent>
            </Card>

            <Card className="border-outline-variant/50 bg-surface-container-lowest">
              <CardHeader>
                <CardTitle>Subscription Controls</CardTitle>
                <CardDescription>Manual platform-owner override. Every change is audited.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveSubscription} className="grid gap-3">
                  <Field label="Plan code">
                    <Input value={form.planCode} onChange={(event) => setForm({ ...form, planCode: event.target.value })} required />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Subscription">
                      <select value={form.subscriptionStatusCode} onChange={(event) => setForm({ ...form, subscriptionStatusCode: event.target.value as SubscriptionStatusCode })} className="h-10 rounded-md border border-input bg-white px-3 text-sm font-semibold">
                        {["Trialing", "Active", "ManualActive", "PastDue", "Suspended", "Cancelled", "Expired"].map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </Field>
                    <Field label="Account">
                      <select value={form.accountStatusCode} onChange={(event) => setForm({ ...form, accountStatusCode: event.target.value as AccountStatusCode })} className="h-10 rounded-md border border-input bg-white px-3 text-sm font-semibold">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Trial end">
                    <Input type="datetime-local" value={toLocalDateTimeInput(form.trialEndAtUtc)} onChange={(event) => setForm({ ...form, trialEndAtUtc: fromLocalDateTimeInput(event.target.value) })} />
                  </Field>
                  <Field label="Internal subscription note">
                    <Input value={form.subscriptionNotes ?? ""} onChange={(event) => setForm({ ...form, subscriptionNotes: event.target.value || null })} placeholder="Reason for change" />
                  </Field>
                  <Button type="submit" disabled={savingKey === "subscription"}>
                    <Save size={16} />
                    Save Subscription
                  </Button>
                </form>

                <div className="mt-4 grid gap-3 rounded-lg border border-outline-variant/50 bg-white p-3">
                  <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
                    <Input type="number" min="1" max="365" value={trialDays} onChange={(event) => setTrialDays(event.target.value)} />
                    <Input value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="Action note" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button type="button" variant="outline" onClick={extendTrial} disabled={savingKey === "extend"}>
                      <FileText size={16} />
                      Extend Trial
                    </Button>
                    <Button type="button" variant="outline" onClick={reactivate} disabled={savingKey === "reactivate"}>
                      <RotateCcw size={16} />
                      Reactivate
                    </Button>
                    <Button type="button" variant="destructive" onClick={suspend} disabled={savingKey === "suspend"}>
                      <Power size={16} />
                      Suspend
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <SummaryCard title="Branches" empty="No branches yet">
              {detail.branches.map((branch) => <Line key={branch.branchId} title={branch.name} meta={`${branch.city ?? "No city"} - ${branch.tableCount} tables - ${branch.orderCount} orders`} />)}
            </SummaryCard>
            <SummaryCard title="Staff" empty="No staff users yet">
              {detail.staff.map((staff) => <Line key={staff.userId} title={staff.displayName} meta={`${staff.roleCode} - ${staff.email}`} />)}
            </SummaryCard>
            <SummaryCard title="Recent Orders" empty="No orders yet">
              {detail.recentOrders.map((order) => <Line key={order.orderId} title={`${order.tableName} - ${formatMoney(order.totalAmount)}`} meta={`${order.branchName} - ${order.orderStatusCode} - ${formatDate(order.createdAtUtc)}`} />)}
            </SummaryCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-outline-variant/50 bg-surface-container-lowest">
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
                <CardDescription>Visible only to Qrave platform admins.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <form onSubmit={addNote} className="grid gap-2">
                  <Input value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Add internal note..." required />
                  <Button type="submit" disabled={savingKey === "note"}>Add Note</Button>
                </form>
                {detail.internalNotes.length === 0 ? <Empty text="No notes yet." /> : detail.internalNotes.map((note) => <Line key={note.superAdminInternalNoteId} title={note.note} meta={`${note.createdByEmail} - ${formatDate(note.createdAtUtc)}`} />)}
              </CardContent>
            </Card>

            <Card className="border-outline-variant/50 bg-surface-container-lowest">
              <CardHeader>
                <CardTitle>Audit History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.auditEntries.length === 0 ? <Empty text="No audit entries yet." /> : detail.auditEntries.map((entry) => <Line key={entry.superAdminAuditEntryId} title={entry.summary} meta={`${entry.superAdminEmail} - ${entry.actionCode} - ${formatDate(entry.createdAtUtc)}`} />)}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </SuperAdminShell>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Info({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-outline-variant/40 bg-white px-3 py-2"><p className="text-xs font-black uppercase text-on-surface-variant">{label}</p><p className="mt-1 break-words text-sm font-bold text-on-surface">{value}</p></div>;
}

function SummaryCard({ children, empty, title }: { children: React.ReactNode[]; empty: string; title: string }) {
  return <Card className="border-outline-variant/50 bg-surface-container-lowest"><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-3">{children.length === 0 ? <Empty text={empty} /> : children}</CardContent></Card>;
}

function Line({ meta, title }: { title: string; meta: string }) {
  return <div className="rounded-lg border border-outline-variant/50 bg-white p-3"><p className="break-words text-sm font-extrabold text-on-surface">{title}</p><p className="mt-1 break-words text-xs text-on-surface-variant">{meta}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-outline-variant/60 bg-white px-3 py-6 text-center text-sm font-semibold text-on-surface-variant">{text}</div>;
}

function toLocalDateTimeInput(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDateTimeInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
