"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Building2, IndianRupee, ReceiptText, Store, Users } from "lucide-react";
import { ApiError, getSuperAdminDashboard, type SuperAdminDashboard } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { SuperAdminShell, StatusPill, formatDate, formatMoney } from "../superadmin-common";

export default function SuperAdminDashboardPage() {
  const [dashboard, setDashboard] = useState<SuperAdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setDashboard(await getSuperAdminDashboard());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load super admin dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SuperAdminShell title="Dashboard">
      {error ? <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-bold text-destructive">{error}</div> : null}

      <div className="mb-4 flex justify-end">
        <Button type="button" variant="outline" onClick={load} disabled={isLoading}>Refresh</Button>
      </div>

      {isLoading || !dashboard ? (
        <div className="rounded-xl border border-outline-variant/50 bg-white p-8 text-center text-sm font-bold text-on-surface-variant">Loading platform metrics...</div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric icon={<Building2 size={20} />} label="Restaurants" value={dashboard.totalRestaurants} />
            <Metric icon={<Store size={20} />} label="Active" value={dashboard.activeRestaurants} />
            <Metric icon={<AlertTriangle size={20} />} label="Needs action" value={dashboard.needsAttention.length} />
            <Metric icon={<ReceiptText size={20} />} label="Orders" value={dashboard.totalOrders} />
            <Metric icon={<IndianRupee size={20} />} label="Revenue" value={formatMoney(dashboard.totalRevenue)} />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Card className="border-outline-variant/50 bg-surface-container-lowest">
              <CardHeader>
                <CardTitle>Restaurants Needing Action</CardTitle>
                <CardDescription>Expired trials, overdue, suspended, or inactive accounts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.needsAttention.length === 0 ? (
                  <EmptyLine text="No restaurants need action right now." />
                ) : dashboard.needsAttention.map((item) => <RestaurantRow key={item.tenantId} item={item} />)}
              </CardContent>
            </Card>

            <Card className="border-outline-variant/50 bg-surface-container-lowest">
              <CardHeader>
                <CardTitle>Recent Restaurants</CardTitle>
                <CardDescription>Latest owner signups on the platform.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.recentRestaurants.length === 0 ? (
                  <EmptyLine text="No restaurants have signed up yet." />
                ) : dashboard.recentRestaurants.map((item) => <RestaurantRow key={item.tenantId} item={item} />)}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
            <Card className="border-outline-variant/50 bg-surface-container-lowest">
              <CardHeader>
                <CardTitle>Platform Totals</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <SmallStat label="Trial restaurants" value={dashboard.trialRestaurants} />
                <SmallStat label="Expired trials" value={dashboard.expiredTrials} />
                <SmallStat label="Paid restaurants" value={dashboard.paidRestaurants} />
                <SmallStat label="Suspended restaurants" value={dashboard.suspendedRestaurants} />
                <SmallStat label="New this month" value={dashboard.newRestaurantsThisMonth} />
                <SmallStat label="Branches / tables" value={`${dashboard.totalBranches} / ${dashboard.totalTables}`} />
              </CardContent>
            </Card>

            <Card className="border-outline-variant/50 bg-surface-container-lowest">
              <CardHeader>
                <CardTitle>Recent Platform Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.recentActions.length === 0 ? (
                  <EmptyLine text="No super admin actions recorded yet." />
                ) : dashboard.recentActions.map((entry) => (
                  <div key={entry.superAdminAuditEntryId} className="rounded-lg border border-outline-variant/50 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-on-surface">{entry.summary}</p>
                      <span className="text-xs font-semibold text-on-surface-variant">{formatDate(entry.createdAtUtc)}</span>
                    </div>
                    <p className="mt-1 text-xs text-on-surface-variant">{entry.superAdminEmail} {entry.tenantName ? `- ${entry.tenantName}` : ""}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </SuperAdminShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="border-outline-variant/50 bg-white">
      <CardContent className="flex min-h-28 items-center gap-4 p-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-on-surface-variant">{label}</p>
          <p className="mt-1 truncate text-2xl font-black text-on-surface">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RestaurantRow({ item }: { item: SuperAdminDashboard["recentRestaurants"][number] }) {
  return (
    <Link href={`/superadmin/restaurants/${item.tenantId}`} className="block rounded-lg border border-outline-variant/50 bg-white p-3 hover:border-primary/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-extrabold text-on-surface">{item.name}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{item.ownerEmail}</p>
        </div>
        <StatusPill value={item.subscriptionStatusCode} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <Mini label="Branches" value={item.branchCount} />
        <Mini label="Orders" value={item.orderCount} />
        <Mini label="Revenue" value={formatMoney(item.revenueTotal)} />
      </div>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md bg-surface-container-low px-2 py-2"><p className="font-black">{value}</p><p className="mt-0.5 text-on-surface-variant">{label}</p></div>;
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-center justify-between rounded-lg border border-outline-variant/40 bg-white px-3 py-2 text-sm"><span className="font-semibold text-on-surface-variant">{label}</span><strong>{value}</strong></div>;
}

function EmptyLine({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-outline-variant/60 bg-white px-3 py-6 text-center text-sm font-semibold text-on-surface-variant">{text}</div>;
}
