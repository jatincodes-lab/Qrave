"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, IndianRupee, MessageCircle, PackageCheck, RefreshCw, Search, Send, ShoppingBag, SlidersHorizontal, Star, UserRound, Users, X } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
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

type WhatsAppTemplateId = "repeatVisit" | "inactiveCustomer" | "favoriteItem";

type WhatsAppTemplate = {
  id: WhatsAppTemplateId;
  label: string;
  description: string;
  buildMessage: (customer: CustomerReport, branchName: string) => string;
};

const WhatsAppTemplates: WhatsAppTemplate[] = [
  {
    id: "repeatVisit",
    label: "Invite again",
    description: "Invite loyal customers back with a simple thank-you message.",
    buildMessage: (customer, branchName) =>
      `Hi ${customerFirstName(customer)}, thanks for visiting ${branchName}. We would love to serve you again. Reply here or scan our QR menu when you are nearby.`
  },
  {
    id: "inactiveCustomer",
    label: "Come back offer",
    description: "Reach customers who have not visited recently.",
    buildMessage: (customer, branchName) =>
      `Hi ${customerFirstName(customer)}, we miss you at ${branchName}. Visit us again this week and ask our team about today's special offer.`
  },
  {
    id: "favoriteItem",
    label: "Favorite item",
    description: "Mention the item this customer orders most often.",
    buildMessage: (customer, branchName) =>
      `Hi ${customerFirstName(customer)}, your favorite ${favoriteItem(customer).toLowerCase() === "-" ? "order" : favoriteItem(customer)} is waiting at ${branchName}. Visit us again soon.`
  }
];

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<WhatsAppTemplateId>("repeatVisit");
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

  const metrics = getCustomerMetrics(customers);
  const feedbackMetrics = getFeedbackMetrics(feedback);
  const branchName = workspace.selectedBranch?.name ?? "Customers";
  const selectedTemplate = WhatsAppTemplates.find((template) => template.id === selectedTemplateId) ?? WhatsAppTemplates[0];
  const optedInCustomers = customers.filter((customer) => customer.marketingConsent && toWhatsAppPhone(customer.customerWhatsApp)).length;

  return (
    <AdminShell
      active="customers"
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
              <Users size={14} />
              Customers
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Customers</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              See saved customers and message them on WhatsApp.
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
            <Card className="bg-surface-container-low/70">
              <CardContent className="px-5 py-5 sm:px-6">
                <form onSubmit={applyFilters} className="grid w-full gap-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_auto_auto] lg:items-end">
                    <label className="grid gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                        <Search size={13} />
                        Search customer
                      </span>
                      <Input className="h-11 bg-white" value={form.search} onChange={(event) => setForm({ ...form, search: event.target.value })} placeholder="Name, WhatsApp number, favorite item" />
                    </label>
                    <Button type="button" variant="outline" className="h-11 px-4" onClick={() => setShowMoreFilters((current) => !current)}>
                      <SlidersHorizontal size={17} />
                      {showMoreFilters ? "Hide filters" : "More filters"}
                    </Button>
                    <Button type="submit" disabled={isLoading} className="h-11 px-5">
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

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={<Users size={20} />} label="Customers" value={isLoading ? "..." : String(customers.length)} />
              <MetricCard icon={<RefreshCw size={20} />} label="Repeat customers" value={isLoading ? "..." : String(metrics.repeatCustomers)} />
              <MetricCard icon={<MessageCircle size={20} />} label="Can message" value={isLoading ? "..." : String(optedInCustomers)} />
              <MetricCard icon={<Star size={20} />} label="Total spent" value={isLoading ? "..." : formatMoney(metrics.totalValue)} />
            </section>

            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
              <CardContent>
                <FeedbackList feedback={feedback} />
              </CardContent>
            </Card>

            <Card className="bg-surface-container-low/70">
              <CardContent className="grid min-h-[7.5rem] gap-5 px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(18rem,1fr)_auto] lg:items-center">
                <label className="grid gap-2.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    <MessageCircle size={13} />
                    WhatsApp message
                  </span>
                  <select
                    value={selectedTemplateId}
                    onChange={(event) => setSelectedTemplateId(event.target.value as WhatsAppTemplateId)}
                    className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-ring/20"
                  >
                    {WhatsAppTemplates.map((template) => (
                      <option key={template.id} value={template.id}>{template.label}</option>
                    ))}
                  </select>
                </label>
                <div className="min-w-0 rounded-lg border border-outline-variant/70 bg-white px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Preview</p>
                  <p className="mt-1 truncate text-sm font-semibold text-on-surface">
                    {selectedTemplate.buildMessage(customers[0] ?? EmptyPreviewCustomer, branchName)}
                  </p>
                </div>
                <Badge variant="outline" className="h-10 justify-center px-3">{optedInCustomers} can message</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Saved customers</CardTitle>
                  <p className="mt-1 text-sm text-on-surface-variant">{customers.length} customers found.</p>
                </div>
                <Badge variant="outline">{workspace.selectedBranch.name}</Badge>
              </CardHeader>
              <CardContent>
                {isLoading ? <PageLoading /> : <CustomerList branchName={branchName} customers={customers} onOpenCustomer={openCustomerQuickView} template={selectedTemplate} />}
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

function CustomerList({ branchName, customers, onOpenCustomer, template }: { branchName: string; customers: CustomerReport[]; onOpenCustomer: (customer: CustomerReport) => void; template: WhatsAppTemplate }) {
  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
        <UserRound size={28} className="mx-auto text-on-surface-variant/70" />
        <p className="mt-3 text-sm font-extrabold text-on-surface">No customers yet</p>
        <p className="mt-1 text-sm text-on-surface-variant">Customers will appear here after they order with a WhatsApp number.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 lg:hidden">
        {customers.map((customer) => (
          <CustomerCard key={customer.customerId ?? customer.customerKey} branchName={branchName} customer={customer} onOpenCustomer={onOpenCustomer} template={template} />
        ))}
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-outline-variant/70 text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Visits</th>
              <th className="py-2 pr-4">Total spent</th>
              <th className="py-2 pr-4">Favorite</th>
              <th className="py-2 pr-4">Last visit</th>
              <th className="py-2 pr-4">WhatsApp</th>
              <th className="py-2 pr-0 text-right">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/50">
            {customers.map((customer) => (
              <tr key={customer.customerId ?? customer.customerKey} className="cursor-pointer transition-colors hover:bg-primary/5" onClick={() => onOpenCustomer(customer)}>
                <td className="py-4 pr-4">
                  <p className="max-w-[18rem] truncate font-extrabold text-on-surface">{displayName(customer)}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{customer.customerWhatsApp ?? "No WhatsApp number"}</p>
                </td>
                <td className="py-4 pr-4 font-semibold text-on-surface">{customer.visitCount}</td>
                <td className="py-4 pr-4 font-extrabold text-primary">{formatMoney(customer.totalValue)}</td>
                <td className="py-4 pr-4">
                  <p className="max-w-[14rem] truncate font-semibold text-on-surface">{favoriteItem(customer)}</p>
                </td>
                <td className="py-4 pr-4 text-on-surface-variant">{formatDateTime(customer.lastVisitAtUtc ?? customer.lastOrderAtUtc)}</td>
                <td className="py-4 pr-4" onClick={(event) => event.stopPropagation()}>
                  <WhatsAppButton branchName={branchName} customer={customer} template={template} />
                </td>
                <td className="py-4 pr-0 text-right text-primary">
                  <ChevronRight size={18} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
  const canMessage = customer.marketingConsent && Boolean(toWhatsAppPhone(customer.customerWhatsApp));

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
                    <p className="mt-1 truncate text-sm font-semibold text-white/70">{customer.customerWhatsApp ?? "No WhatsApp number"}</p>
                  </div>
                </div>
              </div>
              <Badge variant={canMessage ? "success" : "outline"} className={canMessage ? "w-fit bg-brand-mint text-primary" : "w-fit border-white/20 bg-white/10 text-white"}>
                {canMessage ? "Marketing consent" : "No campaign consent"}
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

function FeedbackList({ feedback }: { feedback: AdminFeedback[] }) {
  if (feedback.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
        <Star size={28} className="mx-auto text-on-surface-variant/70" />
        <p className="mt-3 text-sm font-extrabold text-on-surface">No feedback yet</p>
        <p className="mt-1 text-sm text-on-surface-variant">Customers can rate their experience after an order is completed.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {feedback.slice(0, 8).map((item) => (
        <article key={item.orderFeedbackId} className="rounded-xl border border-outline-variant/60 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-primary">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star key={index} size={15} className={index < item.rating ? "fill-current" : "text-on-surface-variant/35"} />
                ))}
              </div>
              <p className="mt-2 text-sm font-extrabold text-on-surface">{item.customerName || item.customerWhatsApp || "Guest customer"}</p>
              <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                {item.tableName} - #{shortId(item.orderId)} - {formatDateTime(item.createdAtUtc)}
              </p>
            </div>
            <Badge variant={item.rating >= 4 ? "success" : "outline"} className={item.rating <= 2 ? "border-red-200 bg-red-50 text-red-800" : undefined}>{item.rating}/5</Badge>
          </div>
          {item.comment ? <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-sm font-semibold leading-6 text-on-surface-variant">{item.comment}</p> : null}
        </article>
      ))}
    </div>
  );
}

function CustomerCard({ branchName, customer, onOpenCustomer, template }: { branchName: string; customer: CustomerReport; onOpenCustomer: (customer: CustomerReport) => void; template: WhatsAppTemplate }) {
  return (
    <article className="rounded-xl border border-outline-variant/60 bg-white p-4 transition-colors hover:border-primary/30 hover:bg-primary/5" role="button" tabIndex={0} onClick={() => onOpenCustomer(customer)} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpenCustomer(customer);
      }
    }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-on-surface">{displayName(customer)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{customer.customerWhatsApp ?? "No WhatsApp number"}</p>
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <WhatsAppButton branchName={branchName} customer={customer} template={template} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <MiniStat label="Visits" value={String(customer.visitCount)} />
        <MiniStat label="Spent" value={formatMoney(customer.totalValue)} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <InfoRow label="Favorite" value={favoriteItem(customer)} />
        <InfoRow label="Last visit" value={formatDateTime(customer.lastVisitAtUtc ?? customer.lastOrderAtUtc)} />
      </div>
    </article>
  );
}

function WhatsAppButton({ branchName, customer, template }: { branchName: string; customer: CustomerReport; template: WhatsAppTemplate }) {
  const phone = toWhatsAppPhone(customer.customerWhatsApp);
  const disabledReason = whatsAppDisabledReason(customer, phone);
  const isEnabled = disabledReason === null;

  function openWhatsApp() {
    if (!phone || !customer.marketingConsent) {
      return;
    }

    const message = template.buildMessage(customer, branchName);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <Button type="button" size="sm" variant={isEnabled ? "secondary" : "outline"} disabled={!isEnabled} onClick={openWhatsApp} title={disabledReason ?? "Send WhatsApp message"}>
      {isEnabled ? <Send size={15} /> : <MessageCircle size={15} />}
      {disabledReason ?? "WhatsApp"}
    </Button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low px-2 py-2">
      <p className="truncate text-xs text-on-surface-variant">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold text-on-surface">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-on-surface-variant">{label}</span>
      <span className="min-w-0 truncate text-right font-semibold text-on-surface">{value}</span>
    </div>
  );
}

function getCustomerMetrics(customers: CustomerReport[]) {
  return customers.reduce(
    (metrics, customer) => ({
      repeatCustomers: metrics.repeatCustomers + (customer.visitCount > 1 || customer.orderCount > 1 ? 1 : 0),
      optedInCustomers: metrics.optedInCustomers + (customer.marketingConsent ? 1 : 0),
      totalValue: metrics.totalValue + customer.totalValue
    }),
    { repeatCustomers: 0, optedInCustomers: 0, totalValue: 0 }
  );
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

function customerInitial(customer: CustomerReport): string {
  const source = customer.customerName || customer.customerWhatsApp || "?";
  return source.trim().charAt(0).toUpperCase() || "?";
}

function customerFirstName(customer: CustomerReport): string {
  const name = customer.customerName?.trim();
  if (!name) {
    return "there";
  }

  return name.split(/\s+/)[0];
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

function toWhatsAppPhone(value: string | null): string | null {
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
  return toWhatsAppPhone(value) ?? "";
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

function whatsAppDisabledReason(customer: CustomerReport, phone: string | null): string | null {
  if (!phone) {
    return "No number";
  }

  if (!customer.marketingConsent) {
    return "No consent";
  }

  return null;
}

const EmptyPreviewCustomer: CustomerReport = {
  customerId: null,
  customerKey: "preview",
  customerName: "Priya",
  customerWhatsApp: null,
  marketingConsent: true,
  visitCount: 1,
  orderCount: 1,
  totalValue: 0,
  firstVisitAtUtc: null,
  lastVisitAtUtc: null,
  lastOrderAtUtc: null,
  branchesVisited: 1,
  firstBranchName: null,
  lastBranchName: null,
  favoriteItemName: "coffee",
  favoriteVariantName: null,
  favoriteItemQuantity: 1
};

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
