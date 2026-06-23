"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, Download, History, IndianRupee, PackageCheck, RefreshCw, Search, SlidersHorizontal, Timer, UserRound, X, XCircle } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import {
  getCustomerReport,
  getItemReport,
  getOrderReportDetail,
  getOrderReportOrders,
  getOrderReportSummary,
  type CustomerReport,
  type ItemReport,
  type OrderReportDetail,
  type OrderReportListItem,
  type OrderReportSummary,
  type OrderStatusCode,
  type ReportFilterInput
} from "../../../lib/api";
import { formatMoney, useAdminWorkspace } from "../../../lib/admin-workspace";
import { firstInvalid, validateDateRange, validateOptionalText } from "../../../lib/validation";

type ReportForm = {
  dateFrom: string;
  dateTo: string;
  status: string;
  search: string;
};

const EmptyForm: ReportForm = {
  dateFrom: todayInputValue(-6),
  dateTo: todayInputValue(),
  status: "",
  search: ""
};

const StatusOptions: Array<"" | OrderStatusCode> = ["", "Placed", "Accepted", "Preparing", "Ready", "Served", "Completed", "Cancelled"];

export default function AdminReportsPage() {
  const workspace = useAdminWorkspace();
  const [form, setForm] = useState<ReportForm>(EmptyForm);
  const [summary, setSummary] = useState<OrderReportSummary | null>(null);
  const [orders, setOrders] = useState<OrderReportListItem[]>([]);
  const [items, setItems] = useState<ItemReport[]>([]);
  const [customers, setCustomers] = useState<CustomerReport[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderReportDetail | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const filter = useMemo<ReportFilterInput>(() => ({
    branchId: workspace.selectedBranchId || undefined,
    dateFrom: form.dateFrom || undefined,
    dateTo: form.dateTo || undefined,
    status: form.status || undefined,
    search: form.search.trim() || undefined
  }), [form, workspace.selectedBranchId]);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setSummary(null);
      setOrders([]);
      setItems([]);
      setCustomers([]);
      setSelectedOrder(null);
      return;
    }

    void loadReports(filter);
  }, [workspace.selectedBranch?.branchId]);

  async function loadReports(nextFilter: ReportFilterInput) {
    setIsLoading(true);
    try {
      const [summaryResponse, orderResponse, itemResponse, customerResponse] = await Promise.all([
        getOrderReportSummary(nextFilter),
        getOrderReportOrders(nextFilter),
        getItemReport(nextFilter),
        getCustomerReport(nextFilter)
      ]);

      setSummary(summaryResponse);
      setOrders(orderResponse);
      setItems(itemResponse);
      setCustomers(customerResponse);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = firstInvalid(
      validateDateRange(form.dateFrom, form.dateTo),
      validateOptionalText(form.search, "Search", 120)
    );
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    void loadReports(filter);
  }

  function exportCsv() {
    if (orders.length === 0) {
      return;
    }

    const rows = [
      ["Order", "Table", "Customer", "WhatsApp", "Status", "Placed At", "Status Time", "Reason", "Items", "Value"],
      ...orders.map((order) => [
        shortOrderCode(order.orderId),
        order.tableName,
        order.customerName || "Guest",
        order.customerWhatsApp || "",
        order.orderStatusCode,
        formatDateTime(order.createdAtUtc),
        formatOrderStatusTime(order),
        order.latestReason || "",
        String(order.itemCount),
        String(order.totalAmount)
      ])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qrave-orders-${form.dateFrom}-to-${form.dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function openOrderDetail(orderId: string) {
    setIsLoadingOrder(true);
    setSelectedOrder(null);
    try {
      setSelectedOrder(await getOrderReportDetail(orderId));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingOrder(false);
    }
  }

  const branchName = workspace.selectedBranch?.name ?? "Reports";

  return (
    <AdminShell
      active="reports"
      branchName={branchName}
      branches={workspace.activeBranches}
      onLogout={workspace.logout}
      onSelectedBranchChange={workspace.setSelectedBranchId}
      selectedBranchId={workspace.selectedBranchId}
    >
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <ClipboardList size={14} />
              Reports
            </Badge>
            <h1 className="mt-2 text-2xl font-black tracking-normal text-on-surface sm:text-3xl">Order history & customer reports</h1>
            <p className="mt-1 text-sm font-semibold text-on-surface-variant">Track QR orders by status, timing, customer details, and top items.</p>
          </div>
          <Button type="button" onClick={exportCsv} disabled={orders.length === 0} className="h-10 w-fit bg-primary px-4">
            <Download size={16} />
            Export CSV
          </Button>
        </header>

        <PageError message={workspace.workspaceError} />

        {workspace.isLoadingBranches ? (
          <PageLoading />
        ) : !workspace.selectedBranch ? (
          <EmptyBranchState />
        ) : (
          <>
            <Card className="border-outline-variant/70 bg-surface-container-low/70 shadow-sm">
              <CardContent className="px-5 pb-5 pt-7 sm:px-6 sm:pt-8">
                <form onSubmit={applyFilters} className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-[minmax(10rem,0.8fr)_minmax(10rem,0.8fr)_minmax(12rem,0.9fr)_minmax(18rem,1.4fr)_auto] xl:items-end">
                  <ReportField icon={<CalendarDays size={13} />} label="From">
                    <Input className="h-11 bg-white text-sm font-semibold" type="date" value={form.dateFrom} onChange={(event) => setForm({ ...form, dateFrom: event.target.value })} />
                  </ReportField>
                  <ReportField icon={<CalendarDays size={13} />} label="To">
                    <Input className="h-11 bg-white text-sm font-semibold" type="date" value={form.dateTo} onChange={(event) => setForm({ ...form, dateTo: event.target.value })} />
                  </ReportField>
                  <ReportField icon={<SlidersHorizontal size={13} />} label="Status">
                    <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-ring/20">
                      {StatusOptions.map((status) => (
                        <option key={status || "all"} value={status}>{status || "All statuses"}</option>
                      ))}
                    </select>
                  </ReportField>
                  <ReportField icon={<Search size={13} />} label="Search">
                    <Input className="h-11 bg-white text-sm font-semibold" value={form.search} onChange={(event) => setForm({ ...form, search: event.target.value })} placeholder="Order ID, table, phone..." />
                  </ReportField>
                  <Button type="submit" disabled={isLoading} className="h-11 px-5 md:col-span-2 xl:col-span-1">
                    {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                    Apply
                  </Button>
                </form>
              </CardContent>
            </Card>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <ReportMetric icon={<ClipboardList size={18} />} label="Orders" value={isLoading ? "..." : String(summary?.totalOrders ?? 0)} />
              <ReportMetric icon={<CheckCircle2 size={18} />} label="Completed" value={isLoading ? "..." : String(summary?.completedOrders ?? 0)} />
              <ReportMetric icon={<XCircle size={18} />} label="Cancelled" value={isLoading ? "..." : String(summary?.cancelledOrders ?? 0)} />
              <ReportMetric icon={<IndianRupee size={18} />} label="Order value" value={isLoading ? "..." : formatMoney(summary?.totalOrderValue ?? 0)} />
              <ReportMetric icon={<Timer size={18} />} label="Avg ready" value={isLoading ? "..." : `${Math.round(summary?.averageReadyMinutes ?? 0)} min`} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.45fr)]">
              <Card className="overflow-hidden border-outline-variant/70 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-outline-variant/70 px-4 py-3">
                  <div>
                    <h2 className="text-base font-black text-on-surface">Order history</h2>
                    <p className="text-xs font-semibold text-on-surface-variant">Status timings and customer details</p>
                  </div>
                  <Badge variant="outline">{orders.length} orders</Badge>
                </div>
                <CardContent className="p-0">
                  {isLoading ? <div className="p-6"><PageLoading /></div> : <OrderHistoryTable orders={orders} onOpenOrder={openOrderDetail} />}
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <TopItemsCard items={items} />
                <CustomersCard customers={customers} />
              </div>
            </section>

            {isLoadingOrder || selectedOrder ? (
              <OrderDetailDialog
                detail={selectedOrder}
                isLoading={isLoadingOrder}
                onClose={() => {
                  setSelectedOrder(null);
                  setIsLoadingOrder(false);
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </AdminShell>
  );
}

function ReportField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-3">
      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-on-surface-variant">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function ReportMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/70 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-on-surface-variant">{label}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-black leading-none text-on-surface">{value}</p>
    </div>
  );
}

function OrderHistoryTable({ orders, onOpenOrder }: { orders: OrderReportListItem[]; onOpenOrder: (orderId: string) => void }) {
  if (orders.length === 0) {
    return <EmptyReport text="No orders match the selected filters." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-xs">
        <thead className="bg-surface-container-low text-[11px] uppercase text-on-surface-variant">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-3 py-3">Table</th>
            <th className="px-3 py-3">Customer</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Placed</th>
            <th className="px-3 py-3">Status time</th>
            <th className="px-3 py-3">Reason</th>
            <th className="px-3 py-3 text-right">Items</th>
            <th className="px-4 py-3 text-right">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/50">
          {orders.map((order) => (
            <tr key={order.orderId} className="align-top transition-colors hover:bg-surface-container-low/70">
              <td className="px-4 py-3">
                <button
                  type="button"
                  className="rounded-md font-black text-primary underline-offset-4 transition hover:text-primary/80 hover:underline focus:outline-none focus:ring-2 focus:ring-ring/20"
                  onClick={() => onOpenOrder(order.orderId)}
                  title="View ordered items and details"
                >
                  #{shortOrderCode(order.orderId)}
                </button>
              </td>
              <td className="px-3 py-3 font-black text-on-surface">{order.tableName}</td>
              <td className="px-3 py-3">
                <p className="max-w-[9rem] truncate font-black text-on-surface">{order.customerName || "Guest"}</p>
                <p className="mt-1 max-w-[9rem] truncate text-[11px] font-semibold text-on-surface-variant">{order.customerWhatsApp || "No WhatsApp"}</p>
              </td>
              <td className="px-3 py-3"><StatusBadge status={order.orderStatusCode} /></td>
              <td className="px-3 py-3 font-semibold text-on-surface-variant">{formatDateTime(order.createdAtUtc)}</td>
              <td className="px-3 py-3 font-semibold text-on-surface-variant">{formatOrderStatusTime(order)}</td>
              <td className="px-3 py-3">
                <p className="max-w-[14rem] break-words font-semibold leading-5 text-on-surface-variant">{order.latestReason || "-"}</p>
              </td>
              <td className="px-3 py-3 text-right font-black text-on-surface">{order.itemCount}</td>
              <td className="px-4 py-3 text-right font-black text-on-surface">{formatMoney(order.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderDetailDialog({ detail, isLoading, onClose }: { detail: OrderReportDetail | null; isLoading: boolean; onClose: () => void }) {
  const order = detail?.order;
  const itemTotal = detail?.items.reduce((total, item) => total + item.lineTotal, 0) ?? 0;
  const adjustmentsTotal = Math.max(0, (order?.totalAmount ?? 0) - itemTotal);

  return (
    <Dialog>
      <DialogContent className="max-w-3xl border-outline-variant/70 bg-white p-0 shadow-modal">
        <div className="sticky top-0 z-10 border-b border-outline-variant/70 bg-surface-container-low px-5 py-4">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-black text-on-surface">
                  <ClipboardList size={19} className="text-primary" />
                  Order details
                </DialogTitle>
                <DialogDescription className="mt-1 font-semibold">
                  {order ? "Ordered items, totals, customer notes, and status timeline." : "Loading ordered items and status timeline."}
                </DialogDescription>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close order details">
                <X size={18} />
              </Button>
            </div>
          </DialogHeader>
        </div>

        {isLoading || !detail || !order ? (
          <div className="p-6">
            <PageLoading />
          </div>
        ) : (
          <div className="mx-auto max-w-2xl py-4">
            <section className="overflow-hidden rounded-lg border border-outline-variant/70 bg-white">
              <div className="flex flex-col gap-3 border-b border-outline-variant/70 bg-surface-container-low px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ClipboardList size={16} className="text-on-surface-variant" />
                    <span className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant">Order</span>
                    <span className="font-mono text-sm font-black text-on-surface">#{shortOrderCode(order.orderId)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-on-surface-variant">{order.tableName} - {formatDateTime(order.createdAtUtc)}</p>
                </div>
                <StatusBadge status={order.orderStatusCode} />
              </div>

              <div className="grid divide-y divide-outline-variant/70 border-b border-outline-variant/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <ReceiptMetric icon={<UserRound size={15} />} label="Customer" value={order.customerName || "Guest"} note={order.customerWhatsApp || "No WhatsApp"} />
                <ReceiptMetric icon={<PackageCheck size={15} />} label="Items" value={`${order.itemCount} item${order.itemCount === 1 ? "" : "s"}`} note={`${detail.items.length} line ${detail.items.length === 1 ? "item" : "items"}`} />
                <ReceiptMetric icon={<IndianRupee size={15} />} label="Total" value={formatMoney(order.totalAmount)} note={`Items ${formatMoney(itemTotal)}`} />
              </div>

              {(order.notes || order.latestReason) ? (
                <div className="grid gap-3 border-b border-outline-variant/70 bg-surface-container-low/45 px-5 py-4 sm:grid-cols-2">
                  {order.notes ? <InfoBox title="Customer note" text={order.notes} /> : null}
                  {order.latestReason ? <InfoBox title="Latest reason" text={order.latestReason} /> : null}
                </div>
              ) : null}

              <section className="px-5 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant">Ordered items</p>
                  <Badge variant="outline">{detail.items.length} lines</Badge>
                </div>
                <div className="divide-y divide-outline-variant/70">
                  {detail.items.length === 0 ? (
                    <EmptyReport text="No item details found for this order." />
                  ) : detail.items.map((item) => (
                    <div key={item.orderItemId} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary-container text-primary">
                          <PackageCheck size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-on-surface">{item.variantName ? `${item.menuItemName} - ${item.variantName}` : item.menuItemName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-[10px] font-black text-primary">{item.dietTypeCode}</span>
                            {item.itemNote ? <span className="max-w-[14rem] truncate text-xs font-semibold text-on-surface-variant">Note: {item.itemNote}</span> : null}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-on-surface">{formatMoney(item.lineTotal)}</p>
                        <p className="mt-0.5 text-xs font-semibold text-on-surface-variant">{formatMoney(item.unitPrice)} x {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-t border-outline-variant/70 bg-surface-container-low">
                <ReceiptTotalRow label="Items total" value={formatMoney(itemTotal)} />
                <ReceiptTotalRow label="Taxes, charges, discounts" value={formatMoney(adjustmentsTotal)} />
                <ReceiptTotalRow label="Order total" value={formatMoney(order.totalAmount)} strong />
              </section>

              <section className="border-t border-outline-variant/70 px-5 py-4">
                <div className="mb-3 flex items-center gap-2">
                  <History size={15} className="text-primary" />
                  <p className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant">Status timeline</p>
                </div>
                {detail.statusHistory.length === 0 ? (
                  <p className="text-sm font-semibold text-on-surface-variant">No status changes found.</p>
                ) : (
                  <div>
                    {detail.statusHistory.map((entry, index) => (
                      <TimelineEntry
                        key={entry.orderStatusHistoryId}
                        entry={entry}
                        isLast={index === detail.statusHistory.length - 1}
                      />
                    ))}
                  </div>
                )}
              </section>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReceiptMetric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5">
        <span className="text-on-surface-variant">{icon}</span>
        <p className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant">{label}</p>
      </div>
      <p className="mt-2 truncate text-[15px] font-black text-on-surface">{value}</p>
      <p className="mt-1 truncate text-xs font-semibold text-on-surface-variant">{note}</p>
    </div>
  );
}

function InfoBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/70 bg-surface-container-low/40 p-4">
      <p className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-5 text-on-surface">{text}</p>
    </div>
  );
}

function ReceiptTotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 border-t border-outline-variant/70 px-5 ${strong ? "py-4" : "py-3"}`}>
      <span className={`${strong ? "text-sm font-black text-on-surface" : "text-sm font-semibold text-on-surface-variant"}`}>{label}</span>
      <span className={`${strong ? "text-xl font-black text-primary" : "text-sm font-black text-on-surface"}`}>{value}</span>
    </div>
  );
}

function TimelineEntry({ entry, isLast }: { entry: OrderReportDetail["statusHistory"][number]; isLast: boolean }) {
  return (
    <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3">
      <div className="flex flex-col items-center">
        <span className="mt-1 h-3 w-3 rounded-full border-2 border-primary-fixed bg-primary shadow-[0_0_0_3px_rgba(32,199,122,0.12)]" />
        {!isLast ? <span className="h-9 w-px bg-outline-variant" /> : null}
      </div>
      <div className={isLast ? "pb-0" : "pb-4"}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-on-surface">
              {entry.oldStatusCode ? `${entry.oldStatusCode} -> ${entry.newStatusCode}` : entry.newStatusCode}
            </p>
            {entry.reason ? <p className="mt-1 text-xs font-semibold leading-5 text-on-surface-variant">{entry.reason}</p> : null}
          </div>
          <p className="shrink-0 text-xs font-semibold text-on-surface-variant">{formatDateTime(entry.createdAtUtc)}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatusCode }) {
  const className = status === "Cancelled"
    ? "border-red-200 bg-red-50 text-red-700"
    : status === "Completed" || status === "Served"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${className}`}>{status}</span>;
}

function TopItemsCard({ items }: { items: ItemReport[] }) {
  const maxValue = Math.max(...items.map((item) => item.totalValue), 1);

  return (
    <Card className="border-outline-variant/70 bg-white shadow-sm">
      <div className="border-b border-outline-variant/70 px-5 py-4">
        <h2 className="text-base font-black text-on-surface">Top items</h2>
        <p className="mt-1 text-xs font-semibold text-on-surface-variant">By revenue</p>
      </div>
      <CardContent className="grid gap-3 px-5 pb-5 pt-6">
        {items.length === 0 ? <EmptyReport text="No item data yet." /> : items.slice(0, 6).map((item) => (
          <div key={`${item.itemName}-${item.variantName ?? ""}`} className="rounded-lg border border-outline-variant/70 bg-surface-container-low/40 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-on-surface">{item.variantName ? `${item.itemName} - ${item.variantName}` : item.itemName}</p>
                <p className="mt-1.5 text-[11px] font-semibold text-on-surface-variant">{item.quantity} sold - {item.orderCount} {item.orderCount === 1 ? "order" : "orders"}</p>
              </div>
              <p className="shrink-0 text-xs font-black text-primary">{formatMoney(item.totalValue)}</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-outline-variant/50">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (item.totalValue / maxValue) * 100)}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CustomersCard({ customers }: { customers: CustomerReport[] }) {
  return (
    <Card className="border-outline-variant/70 bg-white shadow-sm">
      <div className="border-b border-outline-variant/70 px-5 py-4">
        <h2 className="text-base font-black text-on-surface">Customer activity</h2>
        <p className="mt-1 text-xs font-semibold text-on-surface-variant">Repeat and high-value guests</p>
      </div>
      <CardContent className="grid gap-3 px-5 pb-5 pt-6">
        {customers.length === 0 ? <EmptyReport text="No customer data yet." /> : customers.slice(0, 5).map((customer) => (
          <div key={customer.customerKey} className="rounded-lg border border-outline-variant/70 bg-surface-container-low/40 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-on-surface">{customer.customerName || customer.customerWhatsApp || "Guest"}</p>
                <p className="mt-1.5 text-[11px] font-semibold text-on-surface-variant">{customer.orderCount} {customer.orderCount === 1 ? "order" : "orders"} - Last {formatDateTime(customer.lastOrderAtUtc)}</p>
              </div>
              <p className="shrink-0 text-xs font-black text-primary">{formatMoney(customer.totalValue)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyReport({ text }: { text: string }) {
  return <div className="m-4 rounded-lg border border-dashed border-outline-variant/70 bg-surface-container-low p-6 text-center text-sm font-semibold text-on-surface-variant">{text}</div>;
}

function shortOrderCode(orderId: string): string {
  return orderId.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatOrderStatusTime(order: OrderReportListItem): string {
  let statusTime: string | null;
  switch (order.orderStatusCode) {
    case "Accepted":
      statusTime = order.acceptedAtUtc;
      break;
    case "Preparing":
      statusTime = order.preparingAtUtc;
      break;
    case "Ready":
      statusTime = order.readyAtUtc;
      break;
    case "Served":
      statusTime = order.servedAtUtc;
      break;
    case "Completed":
      statusTime = order.completedAtUtc;
      break;
    case "Cancelled":
      statusTime = order.cancelledAtUtc;
      break;
    default:
      statusTime = order.createdAtUtc;
      break;
  }

  return formatDateTime(statusTime ?? order.updatedAtUtc ?? order.createdAtUtc);
}

function todayInputValue(offsetDays = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function csvCell(value: string): string {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}
