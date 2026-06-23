"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronRight, IndianRupee, PackageCheck, RefreshCw, Search, ShoppingBag, SlidersHorizontal, Star, UserRound, X } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { getAdminFeedback, getCustomerReport, getOrderReportOrders, type AdminFeedback, type CustomerReport, type OrderReportListItem, type OrderStatusCode, type ReportFilterInput } from "../../../lib/api";
import { formatMoney, useAdminWorkspace } from "../../../lib/admin-workspace";
import { firstInvalid, invalid, validateOptionalText, valid } from "../../../lib/validation";

type CustomerFilterForm = {
  dateFrom: string;
  dateTo: string;
  status: string;
  search: string;
};

const StatusOptions: Array<"" | OrderStatusCode> = ["", "Placed", "Accepted", "Preparing", "Ready", "Served", "Completed", "Cancelled"];

type CustomerSegment = "all" | "repeat" | "topSpenders" | "inactive" | "firstTime" | "consent";

type CustomerSegmentOption = {
  value: CustomerSegment;
  label: string;
};

const SegmentOptions: CustomerSegmentOption[] = [
  { value: "all", label: "All" },
  { value: "repeat", label: "Repeat" },
  { value: "topSpenders", label: "Top spenders" },
  { value: "firstTime", label: "First-time" },
  { value: "inactive", label: "Inactive" },
  { value: "consent", label: "Consent saved" }
];

const InactiveCustomerDays = 30;
const TopSpenderLimit = 10;

export default function AdminCustomersPage() {
  const workspace = useAdminWorkspace();
  const [form, setForm] = useState<CustomerFilterForm>({
    dateFrom: "",
    dateTo: "",
    status: "",
    search: ""
  });
  const [customers, setCustomers] = useState<CustomerReport[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [activeSegment, setActiveSegment] = useState<CustomerSegment>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerReport | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderReportListItem[]>([]);
  const [isLoadingCustomerOrders, setIsLoadingCustomerOrders] = useState(false);

  const filter = useMemo<ReportFilterInput>(() => ({
    branchId: workspace.selectedBranchId || undefined,
    dateFrom: form.dateFrom || undefined,
    dateTo: form.dateTo || undefined,
    status: form.status || undefined,
    search: form.search.trim() || undefined
  }), [form, workspace.selectedBranchId]);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setCustomers([]);
      setFeedback([]);
      setSelectedCustomer(null);
      setRecentOrders([]);
      return;
    }

    void loadCustomers(filter);
    void loadFeedback(workspace.selectedBranch.branchId);
  }, [workspace.selectedBranch?.branchId]);

  async function loadCustomers(nextFilter: ReportFilterInput) {
    setIsLoading(true);
    try {
      setCustomers(await getCustomerReport(nextFilter));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFeedback(branchId: string) {
    try {
      setFeedback(await getAdminFeedback(branchId));
    } catch (caught) {
      workspace.handleApiError(caught);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = firstInvalid(
      validateOptionalDateRange(form.dateFrom, form.dateTo),
      validateOptionalText(form.search, "Search", 120)
    );
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    void loadCustomers(filter);
  }

  async function openCustomerQuickView(customer: CustomerReport) {
    setSelectedCustomer(customer);
    setRecentOrders([]);
    setIsLoadingCustomerOrders(true);
    try {
      const search = customerSearchTerm(customer);
      const orders = search
        ? await getOrderReportOrders({
            branchId: workspace.selectedBranchId || undefined,
            search
          })
        : [];
      setRecentOrders(orders.slice(0, 3));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingCustomerOrders(false);
    }
  }

  const feedbackMetrics = getFeedbackMetrics(feedback);
  const branchName = workspace.selectedBranch?.name ?? "Customers";
  const visibleCustomers = useMemo(() => filterCustomersBySegment(customers, activeSegment), [activeSegment, customers]);
  const segmentCounts = useMemo(() => getSegmentCounts(customers), [customers]);

  return (
    <AdminShell
      active="customers"
      branchName={branchName}
      branches={workspace.activeBranches}
      onLogout={workspace.logout}
      onSelectedBranchChange={workspace.setSelectedBranchId}
      selectedBranchId={workspace.selectedBranchId}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black leading-tight tracking-normal text-on-surface">Customers</h1>
            <p className="mt-1 text-sm font-medium text-on-surface-variant">
              Track repeat guests, spending, and feedback in one place.
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
            <Card className="bg-white">
              <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
                <form onSubmit={applyFilters} className="grid w-full gap-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_auto_auto] md:items-center">
                    <label className="relative block">
                      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                      <Input
                        className="h-12 rounded-lg border-outline-variant/70 bg-surface-container-low pl-11 pr-4 text-base font-semibold shadow-none focus:border-primary/30"
                        value={form.search}
                        onChange={(event) => setForm({ ...form, search: event.target.value })}
                        placeholder="Search by name, phone, or favourite item"
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 px-4"
                      onClick={() => setShowMoreFilters((current) => !current)}
                      aria-expanded={showMoreFilters}
                    >
                      <SlidersHorizontal size={17} />
                      {showMoreFilters ? "Hide" : "Filters"}
                    </Button>
                    <Button type="submit" disabled={isLoading} className="h-12 px-6">
                      {isLoading ? <RefreshCw size={17} className="animate-spin" /> : <Search size={17} />}
                      Search
                    </Button>
                  </div>

                  {showMoreFilters ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="grid gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                          <CalendarDays size={13} />
                          From
                        </span>
                        <Input className="h-11 bg-white" type="date" value={form.dateFrom} onChange={(event) => setForm({ ...form, dateFrom: event.target.value })} />
                      </label>
                      <label className="grid gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                          <CalendarDays size={13} />
                          To
                        </span>
                        <Input className="h-11 bg-white" type="date" value={form.dateTo} onChange={(event) => setForm({ ...form, dateTo: event.target.value })} />
                      </label>
                      <label className="grid gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                          <SlidersHorizontal size={13} />
                          Order status
                        </span>
                        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-ring/20">
                          {StatusOptions.map((status) => (
                            <option key={status || "all"} value={status}>{status || "All statuses"}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </form>
              </CardContent>
            </Card>

            <CustomerSegments activeSegment={activeSegment} counts={segmentCounts} onChange={setActiveSegment} />

            <CustomerStats counts={segmentCounts} averageRating={feedbackMetrics.averageRating} />

            <Card className="overflow-hidden bg-white">
              <CardHeader className="flex flex-col gap-2 border-b border-outline-variant/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                <div>
                  <CardTitle>Recent feedback</CardTitle>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {feedback.length > 0 ? `${feedback.length} reviews, ${feedbackMetrics.averageRating.toFixed(1)} average rating.` : "Completed order feedback will appear here."}
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Star size={14} />
                  {feedbackMetrics.averageRating > 0 ? feedbackMetrics.averageRating.toFixed(1) : "-"}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <FeedbackList feedback={feedback} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden bg-white">
              <CardHeader className="flex flex-col gap-3 border-b border-outline-variant/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                <div>
                  <CardTitle>Saved customers</CardTitle>
                  <p className="mt-1 text-sm text-on-surface-variant">{visibleCustomers.length} of {customers.length} customers shown.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveSegment("topSpenders")}>
                  Get insights
                  <ArrowUpRight size={14} />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? <PageLoading /> : <CustomerList customers={visibleCustomers} emptyText={segmentEmptyText(activeSegment)} onOpenCustomer={openCustomerQuickView} />}
              </CardContent>
            </Card>

            {selectedCustomer ? (
              <CustomerQuickView
                branchName={branchName}
                customer={selectedCustomer}
                feedback={customerFeedback(selectedCustomer, feedback)}
                isLoadingOrders={isLoadingCustomerOrders}
                onClose={() => {
                  setSelectedCustomer(null);
                  setRecentOrders([]);
                  setIsLoadingCustomerOrders(false);
                }}
                orders={recentOrders}
              />
            ) : null}
          </>
        )}
      </div>
    </AdminShell>
  );
}

function CustomerSegments({ activeSegment, counts, onChange }: { activeSegment: CustomerSegment; counts: Record<CustomerSegment, number>; onChange: (segment: CustomerSegment) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SegmentOptions.map((option) => {
        const active = activeSegment === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`min-h-9 rounded-lg border px-4 py-2 text-sm font-bold transition ${
              active ? "border-primary bg-primary text-white shadow-sm" : "border-outline-variant bg-white text-on-surface hover:border-primary/40 hover:bg-primary/5"
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label} - {counts[option.value]}
          </button>
        );
      })}
    </div>
  );
}

function CustomerStats({ averageRating, counts }: { averageRating: number; counts: Record<CustomerSegment, number> }) {
  const rating = averageRating > 0 ? averageRating.toFixed(1) : "-";

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CustomerStat label="All customers" value={String(counts.all)} />
      <CustomerStat label="Repeat guests" value={String(counts.repeat)} />
      <CustomerStat
        label="Avg. rating"
        value={rating}
        suffix={averageRating > 0 ? <Star size={16} className="fill-current text-primary" /> : null}
      />
      <CustomerStat label="Consent saved" value={String(counts.consent)} />
    </section>
  );
}

function CustomerStat({ label, suffix, value }: { label: string; suffix?: React.ReactNode; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low px-4 py-4">
      <p className="text-xs font-black uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-2 flex items-center gap-1.5 text-2xl font-black leading-none text-on-surface">
        {value}
        {suffix}
      </p>
    </div>
  );
}

function CustomerList({ customers, emptyText, onOpenCustomer }: { customers: CustomerReport[]; emptyText: string; onOpenCustomer: (customer: CustomerReport) => void }) {
  if (customers.length === 0) {
    return (
      <div className="m-5 rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
        <UserRound size={28} className="mx-auto text-on-surface-variant/70" />
        <p className="mt-3 text-sm font-extrabold text-on-surface">No customers found</p>
        <p className="mt-1 text-sm text-on-surface-variant">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-outline-variant/70">
      {customers.map((customer) => (
        <button
          key={customer.customerId ?? customer.customerKey}
          type="button"
          className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-primary/5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          onClick={() => onOpenCustomer(customer)}
        >
          <div className="flex min-w-0 items-center gap-3">
            <InitialAvatar label={displayName(customer)} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-on-surface">{displayName(customer)}</p>
              <p className="mt-1 truncate text-xs font-semibold text-on-surface-variant">{customer.customerWhatsApp ?? "No phone number"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 items-center gap-3 sm:grid-cols-[auto_auto_auto_auto] sm:justify-end sm:gap-6">
            <CustomerRowStat label="visits" value={String(customer.visitCount)} />
            <CustomerRowStat label="spent" value={formatMoney(customer.totalValue)} />
            <div className="min-w-0 text-right">
              <p className="truncate text-xs font-semibold text-on-surface">{formatDateTime(customer.lastVisitAtUtc ?? customer.lastOrderAtUtc)}</p>
              <div className="mt-1 flex justify-end">
                <ConsentBadge customer={customer} />
              </div>
            </div>
            <ChevronRight size={18} className="text-on-surface-variant" />
          </div>
        </button>
      ))}
    </div>
  );
}

function CustomerRowStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-sm font-black text-on-surface">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-on-surface-variant">{label}</p>
    </div>
  );
}

function CustomerQuickView({
  branchName,
  customer,
  feedback,
  isLoadingOrders,
  onClose,
  orders
}: {
  branchName: string;
  customer: CustomerReport;
  feedback: AdminFeedback | null;
  isLoadingOrders: boolean;
  onClose: () => void;
  orders: OrderReportListItem[];
}) {
  const hasConsent = hasUsableCustomerConsent(customer);

  return (
    <Dialog>
      <DialogContent className="max-w-3xl border-outline-variant/70 bg-white p-0 shadow-modal">
        <div className="sticky top-0 z-10 border-b border-outline-variant/70 bg-surface-container-low px-5 py-4">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-lg font-black text-on-surface">
                  <UserRound size={19} className="text-primary" />
                  Customer quick view
                </DialogTitle>
                <DialogDescription className="mt-1 font-semibold">
                  Quick context for staff and owners.
                </DialogDescription>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close customer quick view">
                <X size={18} />
              </Button>
            </div>
          </DialogHeader>
        </div>

        <div className="mx-auto max-w-2xl py-4">
          <section className="overflow-hidden rounded-lg border border-outline-variant/70 bg-white">
            <div className="flex flex-col gap-4 border-b border-outline-variant/70 bg-primary text-white px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-mint text-lg font-black text-primary">
                    {customerInitial(customer)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-black">{displayName(customer)}</h2>
                    <p className="mt-1 truncate text-sm font-semibold text-white/70">{customer.customerWhatsApp ?? "No phone number"}</p>
                  </div>
                </div>
              </div>
              <Badge variant={hasConsent ? "success" : "outline"} className={hasConsent ? "w-fit bg-brand-mint text-primary" : "w-fit border-white/20 bg-white/10 text-white"}>
                {customerConsentLabel(customer)}
              </Badge>
            </div>

            <div className="grid divide-y divide-outline-variant/70 border-b border-outline-variant/70 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              <CustomerQuickMetric icon={<RefreshCw size={15} />} label="Visits" value={String(customer.visitCount)} />
              <CustomerQuickMetric icon={<ShoppingBag size={15} />} label="Orders" value={String(customer.orderCount)} />
              <CustomerQuickMetric icon={<IndianRupee size={15} />} label="Spent" value={formatMoney(customer.totalValue)} />
              <CustomerQuickMetric icon={<CalendarDays size={15} />} label="Last visit" value={formatShortDate(customer.lastVisitAtUtc ?? customer.lastOrderAtUtc)} />
            </div>

            <div className="grid gap-3 border-b border-outline-variant/70 bg-surface-container-low/45 px-5 py-4 sm:grid-cols-2">
              <InfoBox title="Favorite item" text={favoriteItem(customer)} />
              <InfoBox title="Branch context" text={`${branchName}${customer.branchesVisited > 1 ? ` and ${customer.branchesVisited - 1} more` : ""}`} />
            </div>

            <section className="px-5 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant">Recent orders</p>
                <Badge variant="outline">{orders.length} shown</Badge>
              </div>
              {isLoadingOrders ? (
                <PageLoading />
              ) : orders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-outline-variant/70 bg-surface-container-low p-5 text-center text-sm font-semibold text-on-surface-variant">
                  No recent orders found for this customer.
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/70">
                  {orders.map((order) => (
                    <div key={order.orderId} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary-container text-primary">
                          <PackageCheck size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-on-surface">#{shortId(order.orderId)} - {order.tableName}</p>
                          <p className="mt-1 text-xs font-semibold text-on-surface-variant">{formatDateTime(order.createdAtUtc)} - {order.itemCount} item{order.itemCount === 1 ? "" : "s"}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-primary">{formatMoney(order.totalAmount)}</p>
                        <CustomerStatusPill status={order.orderStatusCode} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="border-t border-outline-variant/70 bg-surface-container-low px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <Star size={15} className="text-primary" />
                <p className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant">Latest feedback</p>
              </div>
              {feedback ? (
                <div className="rounded-lg border border-outline-variant/70 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-primary">
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star key={index} size={15} className={index < feedback.rating ? "fill-current" : "text-on-surface-variant/35"} />
                        ))}
                      </div>
                      <p className="mt-2 text-xs font-semibold text-on-surface-variant">
                        {feedback.tableName} - #{shortId(feedback.orderId)} - {formatDateTime(feedback.createdAtUtc)}
                      </p>
                    </div>
                    <Badge variant={feedback.rating >= 4 ? "success" : "outline"} className={feedback.rating <= 2 ? "border-red-200 bg-red-50 text-red-800" : undefined}>{feedback.rating}/5</Badge>
                  </div>
                  {feedback.comment ? <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-sm font-semibold leading-6 text-on-surface-variant">{feedback.comment}</p> : null}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-outline-variant/70 bg-white p-5 text-center text-sm font-semibold text-on-surface-variant">No feedback from this customer yet.</p>
              )}
            </section>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerQuickMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5">
        <span className="text-on-surface-variant">{icon}</span>
        <p className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant">{label}</p>
      </div>
      <p className="mt-2 truncate text-[15px] font-black text-on-surface">{value}</p>
    </div>
  );
}

function InfoBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/70 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-5 text-on-surface">{text}</p>
    </div>
  );
}

function CustomerStatusPill({ status }: { status: OrderStatusCode }) {
  const className = status === "Cancelled"
    ? "border-red-200 bg-red-50 text-red-700"
    : status === "Completed" || status === "Served"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${className}`}>{status}</span>;
}

function InitialAvatar({ label, size = "md" }: { label: string; size?: "sm" | "md" }) {
  const dimension = size === "sm" ? "h-9 w-9 text-sm" : "h-10 w-10 text-sm";

  return (
    <div className={`grid shrink-0 place-items-center rounded-full bg-brand-mint font-black text-primary ${dimension}`}>
      {label.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

function FeedbackList({ feedback }: { feedback: AdminFeedback[] }) {
  if (feedback.length === 0) {
    return (
      <div className="m-5 rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
        <Star size={28} className="mx-auto text-on-surface-variant/70" />
        <p className="mt-3 text-sm font-extrabold text-on-surface">No feedback yet</p>
        <p className="mt-1 text-sm text-on-surface-variant">Customers can rate their experience after an order is completed.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-outline-variant/70">
      {feedback.slice(0, 8).map((item) => (
        <article key={item.orderFeedbackId} className="flex gap-3 px-5 py-4">
          <InitialAvatar label={feedbackDisplayName(item)} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="text-sm font-black text-on-surface">{feedbackDisplayName(item)}</p>
                  <p className="text-xs font-semibold text-on-surface-variant">{item.tableName} - {formatDateTime(item.createdAtUtc)}</p>
                </div>
              </div>
              <RatingStars rating={item.rating} />
            </div>
            {item.comment ? <p className="mt-3 rounded-lg bg-surface-container-low px-3 py-2 text-sm font-semibold leading-5 text-on-surface-variant">{item.comment}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  const clampedRating = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <div className="flex shrink-0 items-center gap-0.5 text-primary" aria-label={`${clampedRating} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={14} className={index < clampedRating ? "fill-current" : "text-on-surface-variant/35"} />
      ))}
    </div>
  );
}

function ConsentBadge({ customer }: { customer: CustomerReport }) {
  if (hasUsableCustomerConsent(customer)) {
    return <Badge variant="success" className="w-fit">Consent saved</Badge>;
  }

  return <Badge variant="outline" className="w-fit">{customerConsentLabel(customer)}</Badge>;
}

function filterCustomersBySegment(customers: CustomerReport[], segment: CustomerSegment): CustomerReport[] {
  switch (segment) {
    case "repeat":
      return customers.filter(isRepeatCustomer);
    case "topSpenders":
      return topSpenderCustomers(customers);
    case "inactive":
      return customers.filter(isInactiveCustomer);
    case "firstTime":
      return customers.filter(isFirstTimeCustomer);
    case "consent":
      return customers.filter(hasUsableCustomerConsent);
    case "all":
    default:
      return customers;
  }
}

function getSegmentCounts(customers: CustomerReport[]): Record<CustomerSegment, number> {
  return {
    all: customers.length,
    repeat: customers.filter(isRepeatCustomer).length,
    topSpenders: topSpenderCustomers(customers).length,
    inactive: customers.filter(isInactiveCustomer).length,
    firstTime: customers.filter(isFirstTimeCustomer).length,
    consent: customers.filter(hasUsableCustomerConsent).length
  };
}

function segmentEmptyText(segment: CustomerSegment): string {
  switch (segment) {
    case "repeat":
      return "No repeat guests match the current search or date filters.";
    case "topSpenders":
      return "No spending data is available for the current customer list.";
    case "inactive":
      return `No customers have been inactive for ${InactiveCustomerDays} days in this view.`;
    case "firstTime":
      return "No first-time customers match the current filters.";
    case "consent":
      return "No customers with a valid phone number and saved consent match the current filters.";
    case "all":
    default:
      return "Customers will appear here after they place an order with saved contact details.";
  }
}

function isRepeatCustomer(customer: CustomerReport): boolean {
  return safeCustomerNumber(customer.visitCount) > 1 || safeCustomerNumber(customer.orderCount) > 1;
}

function isFirstTimeCustomer(customer: CustomerReport): boolean {
  return !isRepeatCustomer(customer);
}

function isInactiveCustomer(customer: CustomerReport): boolean {
  const lastActivity = parseCustomerDate(customer.lastVisitAtUtc ?? customer.lastOrderAtUtc);
  if (!lastActivity) {
    return false;
  }

  const inactiveMs = Date.now() - lastActivity.getTime();
  return inactiveMs >= InactiveCustomerDays * 24 * 60 * 60 * 1000;
}

function topSpenderCustomers(customers: CustomerReport[]): CustomerReport[] {
  return customers
    .filter((customer) => safeCustomerNumber(customer.totalValue) > 0)
    .slice()
    .sort((left, right) => safeCustomerNumber(right.totalValue) - safeCustomerNumber(left.totalValue))
    .slice(0, TopSpenderLimit);
}

function hasUsableCustomerConsent(customer: CustomerReport): boolean {
  return customer.marketingConsent && Boolean(toComparablePhone(customer.customerWhatsApp));
}

function customerConsentLabel(customer: CustomerReport): string {
  if (!customer.customerWhatsApp?.trim()) {
    return "No number";
  }

  if (!toComparablePhone(customer.customerWhatsApp)) {
    return "Invalid number";
  }

  return customer.marketingConsent ? "Consent saved" : "No consent";
}

function safeCustomerNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function parseCustomerDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getFeedbackMetrics(feedback: AdminFeedback[]) {
  if (feedback.length === 0) {
    return { averageRating: 0 };
  }

  return {
    averageRating: feedback.reduce((total, item) => total + item.rating, 0) / feedback.length
  };
}

function shortId(id: string): string {
  return id.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function displayName(customer: CustomerReport): string {
  return customer.customerName || customer.customerWhatsApp || "Guest customer";
}

function feedbackDisplayName(item: AdminFeedback): string {
  return item.customerName || item.customerWhatsApp || "Guest customer";
}

function customerInitial(customer: CustomerReport): string {
  const source = customer.customerName || customer.customerWhatsApp || "?";
  return source.trim().charAt(0).toUpperCase() || "?";
}

function favoriteItem(customer: CustomerReport): string {
  if (!customer.favoriteItemName) {
    return "-";
  }

  return customer.favoriteVariantName ? `${customer.favoriteItemName} - ${customer.favoriteVariantName}` : customer.favoriteItemName;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatShortDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short"
  }).format(date);
}

function toComparablePhone(value: string | null): string | null {
  if (!value) {
    return null;
  }

  let digits = value.replace(/\D/g, "");
  while (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits.length >= 8 ? digits : null;
}

function normalizePhone(value: string | null): string {
  return toComparablePhone(value) ?? "";
}

function customerSearchTerm(customer: CustomerReport): string {
  return customer.customerWhatsApp || customer.customerName || customer.favoriteItemName || "";
}

function customerFeedback(customer: CustomerReport, feedback: AdminFeedback[]): AdminFeedback | null {
  const customerPhone = normalizePhone(customer.customerWhatsApp);
  const customerName = customer.customerName?.trim().toLowerCase() ?? "";
  const matches = feedback.filter((item) => {
    if (customer.customerId && item.customerId === customer.customerId) {
      return true;
    }

    if (customerPhone && normalizePhone(item.customerWhatsApp) === customerPhone) {
      return true;
    }

    return Boolean(customerName && item.customerName?.trim().toLowerCase() === customerName);
  });

  return matches.sort((left, right) => new Date(right.createdAtUtc).getTime() - new Date(left.createdAtUtc).getTime())[0] ?? null;
}

function validateOptionalDateRange(dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) {
    return valid();
  }

  if (!dateFrom || !dateTo) {
    return invalid("Choose both From and To dates, or leave both blank.");
  }

  if (dateFrom > dateTo) {
    return invalid("From date cannot be after To date.");
  }

  return valid();
}
