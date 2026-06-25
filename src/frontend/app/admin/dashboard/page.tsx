"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarDays,
  ClipboardList,
  Clock3,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingUp,
  Users
} from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  getAdminOrders,
  getBranchOrderSettings,
  getBranchTables,
  getCustomerReport,
  getItemReport,
  getMenuItems,
  getOrderReportOrders,
  getOrderReportSummary,
  getWaiterCalls,
  type AdminOrder,
  type BranchListItem,
  type BranchOrderSettings,
  type CustomerReport,
  type ItemReport,
  type OrderReportListItem,
  type OrderReportSummary,
  type WaiterCall
} from "../../../lib/api";
import { formatMoney, useAdminWorkspace } from "../../../lib/admin-workspace";

const AllBranchesScope = "__all__";

const ChartColors = ["#5d8fd8", "#64c7c4", "#f7a24b", "#99a6b8", "#20c77a", "#f4c542", "#8a7ccf"];
const ActiveOrderStatuses = ["Placed", "Accepted", "Preparing", "Ready", "Served"];
const ClosedOrderStatuses = ["Completed", "Cancelled"];

type DateRangeKey = "today" | "7d" | "30d" | "month";

type DashboardData = {
  branchStats: BranchDashboardStats[];
  currentSummary: OrderReportSummary;
  previousSummary: OrderReportSummary;
  orderReports: OrderReportListItem[];
  itemReports: ItemReport[];
  customerReports: CustomerReport[];
  activeOrders: EnrichedAdminOrder[];
  waiterCalls: EnrichedWaiterCall[];
};

type BranchDashboardStats = {
  branch: BranchListItem;
  currentSummary: OrderReportSummary;
  previousSummary: OrderReportSummary;
  orderReports: OrderReportListItem[];
  itemReports: ItemReport[];
  customerReports: CustomerReport[];
  activeOrders: AdminOrder[];
  waiterCalls: WaiterCall[];
  menuItems: number;
  tables: number;
  settings: BranchOrderSettings | null;
};

type EnrichedAdminOrder = AdminOrder & {
  branchName: string;
};

type EnrichedWaiterCall = WaiterCall & {
  branchName: string;
};

type TrendPoint = {
  label: string;
  orders: number;
  revenue: number;
};

type BarPoint = {
  label: string;
  value: number;
  helper?: string;
};

type DonutPoint = {
  label: string;
  value: number;
  color: string;
};

export default function AdminDashboardPage() {
  const workspace = useAdminWorkspace();
  const [branchScopeId, setBranchScopeId] = useState(AllBranchesScope);
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("7d");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const activeBranches = workspace.activeBranches;
  const canCompareBranches = activeBranches.length > 1;
  const scopedBranches = useMemo(() => {
    if (branchScopeId === AllBranchesScope) {
      return activeBranches;
    }

    return activeBranches.filter((branch) => branch.branchId === branchScopeId);
  }, [activeBranches, branchScopeId]);

  const range = useMemo(() => getDateRange(dateRangeKey), [dateRangeKey]);
  const previousRange = useMemo(() => getPreviousDateRange(range), [range]);

  useEffect(() => {
    if (workspace.isLoadingBranches) {
      return;
    }

    if (activeBranches.length === 0) {
      setBranchScopeId(AllBranchesScope);
      return;
    }

    setBranchScopeId((current) => {
      if (current === AllBranchesScope) {
        return activeBranches.length > 1 ? AllBranchesScope : activeBranches[0].branchId;
      }

      return activeBranches.some((branch) => branch.branchId === current) ? current : activeBranches[0].branchId;
    });
  }, [activeBranches, workspace.isLoadingBranches]);

  useEffect(() => {
    if (workspace.isLoadingBranches || scopedBranches.length === 0) {
      setDashboardData(null);
      return;
    }

    let isCurrent = true;
    setIsLoadingDashboard(true);
    workspace.setWorkspaceError(null);

    Promise.all(scopedBranches.map((branch) => loadBranchDashboardData(branch, range, previousRange)))
      .then((branchStats) => {
        if (!isCurrent) {
          return;
        }

        setDashboardData(combineBranchDashboardData(branchStats));
        setLastUpdatedAt(new Date());
      })
      .catch((caught) => {
        if (isCurrent) {
          setDashboardData(null);
          workspace.handleApiError(caught);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingDashboard(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [dateRangeKey, previousRange, range, reloadKey, scopedBranches, workspace.isLoadingBranches]);

  const branchScopeLabel = branchScopeId === AllBranchesScope
    ? "All assigned branches"
    : activeBranches.find((branch) => branch.branchId === branchScopeId)?.name ?? workspace.selectedBranch?.name ?? "Restaurant workspace";
  const hasBranchData = activeBranches.length > 0;
  const trendData = useMemo(() => buildTrendData(dashboardData?.orderReports ?? [], range, dateRangeKey), [dashboardData?.orderReports, dateRangeKey, range]);
  const branchPerformanceData = useMemo(() => buildBranchPerformanceData(dashboardData?.branchStats ?? []), [dashboardData?.branchStats]);
  const topItemData = useMemo(() => buildTopItemData(dashboardData?.itemReports ?? []), [dashboardData?.itemReports]);
  const statusData = useMemo(() => buildStatusBreakdown(dashboardData?.orderReports ?? []), [dashboardData?.orderReports]);
  const customerCount = dashboardData?.customerReports.length ?? 0;
  const newCustomerCount = useMemo(() => countNewCustomers(dashboardData?.customerReports ?? [], range), [dashboardData?.customerReports, range]);
  const openOrders = dashboardData?.activeOrders.filter((order) => !ClosedOrderStatuses.includes(order.orderStatusCode)).length ?? 0;
  const pendingWaiterCalls = dashboardData?.waiterCalls.filter((call) => !["Resolved", "Cancelled"].includes(call.statusCode)).length ?? 0;
  const recentOrders = useMemo(() => [...(dashboardData?.orderReports ?? [])].sort(sortByCreatedDesc).slice(0, 6), [dashboardData?.orderReports]);
  const healthWarnings = useMemo(() => buildHealthWarnings(dashboardData?.branchStats ?? []), [dashboardData?.branchStats]);

  return (
    <AdminShell
      active="dashboard"
      branchName={branchScopeLabel}
      branches={activeBranches}
      onLogout={workspace.logout}
      onSelectedBranchChange={workspace.setSelectedBranchId}
      selectedBranchId={workspace.selectedBranchId}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <BarChart3 size={14} />
              Sales dashboard
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Branch performance</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Revenue, orders, customers, and live operations for the branches assigned to this account.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <DashboardSelect
              icon={<CalendarDays size={16} />}
              label="Date range"
              value={dateRangeKey}
              onChange={(value) => setDateRangeKey(value as DateRangeKey)}
              options={[
                { label: "Today", value: "today" },
                { label: "Last 7 days", value: "7d" },
                { label: "Last 30 days", value: "30d" },
                { label: "This month", value: "month" }
              ]}
            />
            <DashboardSelect
              icon={<Store size={16} />}
              label="Branch"
              value={branchScopeId}
              onChange={setBranchScopeId}
              options={[
                ...(canCompareBranches ? [{ label: "All assigned", value: AllBranchesScope }] : []),
                ...activeBranches.map((branch) => ({ label: branch.name, value: branch.branchId }))
              ]}
            />
            <Button type="button" variant="outline" onClick={() => setReloadKey((current) => current + 1)} disabled={isLoadingDashboard || !hasBranchData} className="h-11">
              <RefreshCw size={16} className={isLoadingDashboard ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </header>

        <PageError message={workspace.workspaceError} />

        {workspace.isLoadingBranches ? (
          <PageLoading />
        ) : !hasBranchData ? (
          <EmptyBranchState />
        ) : (
          <>
            <div className="flex flex-col gap-2 rounded-xl border border-outline-variant/70 bg-white px-4 py-3 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {branchScopeLabel} from {formatDisplayDate(range.dateFrom)} to {formatDisplayDate(range.dateTo)}
              </span>
              <span className="font-semibold">{lastUpdatedAt ? `Updated ${formatTime(lastUpdatedAt)}` : "Waiting for data"}</span>
            </div>

            {isLoadingDashboard && !dashboardData ? (
              <DashboardSkeleton />
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    icon={<TrendingUp size={20} />}
                    label="Total revenue"
                    value={formatMoney(dashboardData?.currentSummary.totalOrderValue ?? 0)}
                    change={formatChange(dashboardData?.currentSummary.totalOrderValue ?? 0, dashboardData?.previousSummary.totalOrderValue ?? 0)}
                    sparkline={trendData.map((point) => point.revenue)}
                  />
                  <KpiCard
                    icon={<ShoppingBag size={20} />}
                    label="Total orders"
                    value={formatNumber(dashboardData?.currentSummary.totalOrders ?? 0)}
                    change={formatChange(dashboardData?.currentSummary.totalOrders ?? 0, dashboardData?.previousSummary.totalOrders ?? 0)}
                    sparkline={trendData.map((point) => point.orders)}
                  />
                  <KpiCard
                    icon={<ClipboardList size={20} />}
                    label="Average order value"
                    value={formatMoney(dashboardData?.currentSummary.averageOrderValue ?? 0)}
                    change={formatChange(dashboardData?.currentSummary.averageOrderValue ?? 0, dashboardData?.previousSummary.averageOrderValue ?? 0)}
                    sparkline={trendData.map((point) => point.revenue / Math.max(point.orders, 1))}
                  />
                  <KpiCard
                    icon={<Users size={20} />}
                    label="New customers"
                    value={formatNumber(newCustomerCount)}
                    note={`${formatNumber(customerCount)} total in range`}
                    sparkline={dashboardData?.customerReports.slice(0, 8).map((customer) => customer.totalValue) ?? []}
                  />
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MiniMetric icon={<Clock3 size={18} />} label="Avg ready time" value={`${Math.round(dashboardData?.currentSummary.averageReadyMinutes ?? 0)} min`} />
                  <MiniMetric icon={<ClipboardList size={18} />} label="Open orders" value={formatNumber(openOrders)} />
                  <MiniMetric icon={<BellRing size={18} />} label="Waiter calls" value={formatNumber(pendingWaiterCalls)} />
                  <MiniMetric icon={<AlertTriangle size={18} />} label="Branch alerts" value={formatNumber(healthWarnings.length)} />
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
                  <Card className="overflow-hidden">
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle>Sales trends over time</CardTitle>
                        <CardDescription>Revenue and order volume for the selected range.</CardDescription>
                      </div>
                      <Badge variant="outline">{getRangeLabel(dateRangeKey)}</Badge>
                    </CardHeader>
                    <CardContent>
                      <LineTrendChart data={trendData} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{branchScopeId === AllBranchesScope ? "Branch performance" : "Orders by status"}</CardTitle>
                      <CardDescription>
                        {branchScopeId === AllBranchesScope ? "Revenue by assigned branch." : "Current range order mix."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {branchScopeId === AllBranchesScope ? (
                        <VerticalBarChart data={branchPerformanceData} valueFormatter={formatCompactMoney} />
                      ) : (
                        <DonutChart data={statusData} centerLabel={formatNumber(dashboardData?.currentSummary.totalOrders ?? 0)} centerCaption="orders" />
                      )}
                    </CardContent>
                  </Card>
                </section>

                <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top selling items</CardTitle>
                      <CardDescription>Ranked by revenue in the selected range.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <HorizontalBarChart data={topItemData} valueFormatter={formatCompactMoney} emptyLabel="No item sales yet" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle>Recent sales orders</CardTitle>
                        <CardDescription>Latest orders from the selected branch scope.</CardDescription>
                      </div>
                      <Link href="/admin/reports" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-container">
                        View reports
                        <ArrowRight size={15} />
                      </Link>
                    </CardHeader>
                    <CardContent>
                      <RecentOrdersTable orders={recentOrders} showBranch={branchScopeId === AllBranchesScope} />
                    </CardContent>
                  </Card>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <AttentionPanel
                    title="Live orders"
                    description="Active kitchen and service flow."
                    emptyLabel="No active orders"
                    items={(dashboardData?.activeOrders ?? []).slice(0, 5).map((order) => ({
                      key: order.orderId,
                      title: `Table ${order.tableName}`,
                      meta: `${order.branchName} - ${order.orderStatusCode}`,
                      value: formatMoney(order.totalAmount),
                      href: "/admin/orders"
                    }))}
                  />
                  <AttentionPanel
                    title="Waiter calls"
                    description="Requests still needing action."
                    emptyLabel="No pending waiter calls"
                    items={(dashboardData?.waiterCalls ?? []).slice(0, 5).map((call) => ({
                      key: call.waiterCallId,
                      title: `Table ${call.tableName}`,
                      meta: `${call.branchName} - ${call.statusCode}`,
                      value: formatRelativeTime(call.createdAtUtc),
                      href: "/admin/orders"
                    }))}
                  />
                  <AttentionPanel
                    title="Branch health"
                    description="Configuration issues to resolve."
                    emptyLabel="All selected branches look ready"
                    items={healthWarnings.slice(0, 6).map((warning) => ({
                      key: `${warning.branchId}-${warning.label}`,
                      title: warning.label,
                      meta: warning.branchName,
                      value: "Fix",
                      href: warning.href
                    }))}
                  />
                </section>
              </>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}

async function loadBranchDashboardData(branch: BranchListItem, range: DateRange, previousRange: DateRange): Promise<BranchDashboardStats> {
  const currentFilter = { branchId: branch.branchId, dateFrom: range.dateFrom, dateTo: range.dateTo };
  const previousFilter = { branchId: branch.branchId, dateFrom: previousRange.dateFrom, dateTo: previousRange.dateTo };

  const [
    currentSummary,
    previousSummary,
    orderReports,
    itemReports,
    customerReports,
    activeOrders,
    waiterCalls,
    menuItems,
    tables,
    settings
  ] = await Promise.all([
    getOrderReportSummary(currentFilter),
    getOrderReportSummary(previousFilter),
    getOrderReportOrders(currentFilter),
    getItemReport(currentFilter),
    getCustomerReport(currentFilter),
    getAdminOrders(branch.branchId, false),
    getWaiterCalls(branch.branchId, false),
    getMenuItems(branch.branchId),
    getBranchTables(branch.branchId),
    getBranchOrderSettings(branch.branchId)
  ]);

  return {
    branch,
    currentSummary,
    previousSummary,
    orderReports,
    itemReports,
    customerReports,
    activeOrders,
    waiterCalls,
    menuItems: menuItems.length,
    tables: tables.length,
    settings
  };
}

function combineBranchDashboardData(branchStats: BranchDashboardStats[]): DashboardData {
  return {
    branchStats,
    currentSummary: sumSummaries(branchStats.map((branch) => branch.currentSummary)),
    previousSummary: sumSummaries(branchStats.map((branch) => branch.previousSummary)),
    orderReports: branchStats.flatMap((branch) => branch.orderReports),
    itemReports: mergeItemReports(branchStats.flatMap((branch) => branch.itemReports)),
    customerReports: mergeCustomerReports(branchStats.flatMap((branch) => branch.customerReports)),
    activeOrders: branchStats
      .flatMap((branch) => branch.activeOrders.map((order) => ({ ...order, branchName: branch.branch.name })))
      .sort(sortAdminOrdersByCreatedDesc),
    waiterCalls: branchStats
      .flatMap((branch) => branch.waiterCalls.map((call) => ({ ...call, branchName: branch.branch.name })))
      .filter((call) => !["Resolved", "Cancelled"].includes(call.statusCode))
      .sort(sortWaiterCallsByCreatedDesc)
  };
}

function sumSummaries(summaries: OrderReportSummary[]): OrderReportSummary {
  const totalOrders = summaries.reduce((total, summary) => total + summary.totalOrders, 0);
  const totalOrderValue = summaries.reduce((total, summary) => total + summary.totalOrderValue, 0);
  const completedOrders = summaries.reduce((total, summary) => total + summary.completedOrders, 0);
  const cancelledOrders = summaries.reduce((total, summary) => total + summary.cancelledOrders, 0);
  const readyTimeWeight = summaries.reduce((total, summary) => total + summary.averageReadyMinutes * Math.max(summary.completedOrders, 0), 0);

  return {
    totalOrders,
    completedOrders,
    cancelledOrders,
    totalOrderValue,
    averageOrderValue: totalOrders > 0 ? totalOrderValue / totalOrders : 0,
    averageReadyMinutes: completedOrders > 0 ? readyTimeWeight / completedOrders : 0
  };
}

function mergeItemReports(items: ItemReport[]): ItemReport[] {
  const map = new Map<string, ItemReport>();

  for (const item of items) {
    const key = `${item.itemName}::${item.variantName ?? ""}`;
    const current = map.get(key);
    if (!current) {
      map.set(key, { ...item });
      continue;
    }

    current.quantity += item.quantity;
    current.orderCount += item.orderCount;
    current.totalValue += item.totalValue;
  }

  return [...map.values()].sort((a, b) => b.totalValue - a.totalValue);
}

function mergeCustomerReports(customers: CustomerReport[]): CustomerReport[] {
  const map = new Map<string, CustomerReport>();

  for (const customer of customers) {
    const key = customer.customerId ?? customer.customerKey;
    const current = map.get(key);
    if (!current) {
      map.set(key, { ...customer });
      continue;
    }

    current.visitCount += customer.visitCount;
    current.orderCount += customer.orderCount;
    current.totalValue += customer.totalValue;
    current.branchesVisited = Math.max(current.branchesVisited, customer.branchesVisited);
    current.lastVisitAtUtc = maxDateString(current.lastVisitAtUtc, customer.lastVisitAtUtc);
    current.lastOrderAtUtc = maxDateString(current.lastOrderAtUtc, customer.lastOrderAtUtc);
    current.firstVisitAtUtc = minDateString(current.firstVisitAtUtc, customer.firstVisitAtUtc);
  }

  return [...map.values()].sort((a, b) => b.totalValue - a.totalValue);
}

type DateRange = {
  dateFrom: string;
  dateTo: string;
};

function getDateRange(key: DateRangeKey): DateRange {
  const today = startOfLocalDay(new Date());
  const dateTo = toDateInputValue(today);

  if (key === "today") {
    return { dateFrom: dateTo, dateTo };
  }

  if (key === "month") {
    return { dateFrom: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo };
  }

  const days = key === "30d" ? 29 : 6;
  const dateFrom = new Date(today);
  dateFrom.setDate(today.getDate() - days);
  return { dateFrom: toDateInputValue(dateFrom), dateTo };
}

function getPreviousDateRange(range: DateRange): DateRange {
  const from = parseLocalDate(range.dateFrom);
  const to = parseLocalDate(range.dateTo);
  const dayCount = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
  const previousTo = new Date(from);
  previousTo.setDate(from.getDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setDate(previousTo.getDate() - dayCount + 1);

  return {
    dateFrom: toDateInputValue(previousFrom),
    dateTo: toDateInputValue(previousTo)
  };
}

function buildTrendData(orders: OrderReportListItem[], range: DateRange, rangeKey: DateRangeKey): TrendPoint[] {
  const points = createTrendBuckets(range, rangeKey);
  const pointMap = new Map(points.map((point) => [point.key, point]));

  for (const order of orders) {
    if (order.orderStatusCode === "Cancelled") {
      continue;
    }

    const date = new Date(order.createdAtUtc);
    const key = rangeKey === "today" ? `${Math.floor(date.getHours() / 3) * 3}` : toDateInputValue(date);
    const point = pointMap.get(key);
    if (point) {
      point.orders += 1;
      point.revenue += order.totalAmount;
    }
  }

  return points.map(({ key: _key, ...point }) => point);
}

function createTrendBuckets(range: DateRange, rangeKey: DateRangeKey): (TrendPoint & { key: string })[] {
  if (rangeKey === "today") {
    return Array.from({ length: 8 }, (_, index) => {
      const hour = index * 3;
      return {
        key: String(hour),
        label: `${String(hour).padStart(2, "0")}:00`,
        orders: 0,
        revenue: 0
      };
    });
  }

  const buckets: (TrendPoint & { key: string })[] = [];
  const cursor = parseLocalDate(range.dateFrom);
  const end = parseLocalDate(range.dateTo);

  while (cursor <= end) {
    buckets.push({
      key: toDateInputValue(cursor),
      label: rangeKey === "30d" ? `${cursor.getDate()}/${cursor.getMonth() + 1}` : cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      orders: 0,
      revenue: 0
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

function buildBranchPerformanceData(branchStats: BranchDashboardStats[]): BarPoint[] {
  return branchStats
    .map((branch) => ({
      label: branch.branch.name,
      value: branch.currentSummary.totalOrderValue,
      helper: `${formatNumber(branch.currentSummary.totalOrders)} orders`
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function buildTopItemData(items: ItemReport[]): BarPoint[] {
  return items.slice(0, 8).map((item) => ({
    label: item.variantName ? `${item.itemName} - ${item.variantName}` : item.itemName,
    value: item.totalValue,
    helper: `${formatNumber(item.quantity)} sold`
  }));
}

function buildStatusBreakdown(orders: OrderReportListItem[]): DonutPoint[] {
  const statuses = ["Placed", "Accepted", "Preparing", "Ready", "Served", "Completed", "Cancelled"];
  return statuses
    .map((status, index) => ({
      label: status,
      value: orders.filter((order) => order.orderStatusCode === status).length,
      color: ChartColors[index % ChartColors.length]
    }))
    .filter((item) => item.value > 0);
}

function countNewCustomers(customers: CustomerReport[], range: DateRange): number {
  const from = parseLocalDate(range.dateFrom).getTime();
  const to = parseLocalDate(range.dateTo).getTime() + 86_399_999;

  return customers.filter((customer) => {
    if (!customer.firstVisitAtUtc) {
      return false;
    }

    const firstVisit = new Date(customer.firstVisitAtUtc).getTime();
    return firstVisit >= from && firstVisit <= to;
  }).length;
}

function buildHealthWarnings(branchStats: BranchDashboardStats[]) {
  return branchStats.flatMap((branch) => {
    const warnings: { branchId: string; branchName: string; href: string; label: string }[] = [];
    if (branch.menuItems === 0) {
      warnings.push({ branchId: branch.branch.branchId, branchName: branch.branch.name, href: "/admin/menu", label: "No active menu items" });
    }

    if (branch.tables === 0) {
      warnings.push({ branchId: branch.branch.branchId, branchName: branch.branch.name, href: `/admin/branches/${branch.branch.branchId}?tab=tables`, label: "No table QR codes" });
    }

    if (!branch.settings?.enableDirectQrOrdering) {
      warnings.push({ branchId: branch.branch.branchId, branchName: branch.branch.name, href: "/admin/settings", label: "QR ordering disabled" });
    }

    if (!branch.settings?.waiterCallEnabled) {
      warnings.push({ branchId: branch.branch.branchId, branchName: branch.branch.name, href: "/admin/settings", label: "Waiter calls disabled" });
    }

    return warnings;
  });
}

function DashboardSelect({
  icon,
  label,
  onChange,
  options,
  value
}: {
  icon: ReactNode;
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <label className="block min-w-[12rem]">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary/75">{icon}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-outline-variant/70 bg-white py-1 pl-10 pr-9 text-sm font-bold text-on-surface shadow-sm outline-none transition-colors hover:border-primary/25 focus:border-primary/30 focus:ring-2 focus:ring-ring/15"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function KpiCard({
  change,
  icon,
  label,
  note,
  sparkline,
  value
}: {
  change?: { label: string; tone: "up" | "down" | "neutral" };
  icon: ReactNode;
  label: string;
  note?: string;
  sparkline: number[];
  value: string;
}) {
  const toneClass = change?.tone === "up"
    ? "bg-emerald-100 text-emerald-800"
    : change?.tone === "down"
      ? "bg-orange-100 text-orange-800"
      : "bg-surface-container text-on-surface-variant";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-secondary-container text-primary">{icon}</div>
            <p className="truncate text-sm font-bold text-on-surface-variant">{label}</p>
            <p className="mt-2 truncate text-3xl font-extrabold text-on-surface">{value}</p>
            <p className="mt-1 truncate text-xs font-semibold text-on-surface-variant">{note ?? "vs previous period"}</p>
          </div>
          {change ? <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${toneClass}`}>{change.label}</span> : null}
        </div>
        <Sparkline values={sparkline} />
      </CardContent>
    </Card>
  );
}

function MiniMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-fixed text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
          <p className="mt-1 truncate text-xl font-extrabold text-on-surface">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const points = buildSvgPoints(values.length > 0 ? values : [0, 0], 130, 40, 5);

  return (
    <svg className="mt-4 h-10 w-full" viewBox="0 0 130 40" role="img" aria-label="Trend">
      <path d={`${points.areaPath} L 125 38 L 5 38 Z`} fill="#dfe9f8" opacity="0.9" />
      <polyline points={points.polyline} fill="none" stroke="#6f94c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LineTrendChart({ data }: { data: TrendPoint[] }) {
  const revenuePoints = buildSvgPoints(data.map((point) => point.revenue), 720, 280, 26);
  const orderPoints = buildSvgPoints(data.map((point) => point.orders), 720, 280, 26);
  const maxRevenue = Math.max(...data.map((point) => point.revenue), 0);

  if (data.every((point) => point.revenue === 0 && point.orders === 0)) {
    return <EmptyChart label="No sales data for this range" />;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[42rem]">
        <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-bold text-on-surface-variant">
          <LegendDot color="#5d8fd8" label="Revenue" />
          <LegendDot color="#64c7c4" label="Orders" />
          <span className="ml-auto">Peak {formatCompactMoney(maxRevenue)}</span>
        </div>
        <svg className="h-72 w-full" viewBox="0 0 720 280" role="img" aria-label="Sales trend chart">
          {[40, 90, 140, 190, 240].map((y) => (
            <line key={y} x1="36" y1={y} x2="700" y2={y} stroke="#d6dfd1" strokeWidth="1" />
          ))}
          <path d={`${revenuePoints.areaPath} L 694 254 L 26 254 Z`} fill="#dfe9f8" opacity="0.9" />
          <polyline points={revenuePoints.polyline} fill="none" stroke="#5d8fd8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={orderPoints.polyline} fill="none" stroke="#64c7c4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((point, index) => {
            const x = revenuePoints.coordinates[index]?.x ?? 0;
            return (
              <text key={`${point.label}-${index}`} x={x} y="274" textAnchor="middle" className="fill-on-surface-variant text-[12px] font-semibold">
                {index % Math.ceil(data.length / 8) === 0 ? point.label : ""}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function VerticalBarChart({ data, valueFormatter }: { data: BarPoint[]; valueFormatter: (value: number) => string }) {
  const max = Math.max(...data.map((point) => point.value), 1);

  if (data.length === 0 || data.every((point) => point.value === 0)) {
    return <EmptyChart label="No branch revenue yet" />;
  }

  return (
    <div className="h-80">
      <div className="flex h-64 items-end gap-3 border-b border-outline-variant/70 px-2">
        {data.map((point, index) => (
          <div key={point.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
            <div className="text-center text-xs font-bold text-on-surface">{valueFormatter(point.value)}</div>
            <div
              className="mx-auto w-full max-w-14 rounded-t-xl"
              style={{
                height: `${Math.max(8, (point.value / max) * 190)}px`,
                background: `linear-gradient(180deg, ${ChartColors[index % ChartColors.length]}, #c8d4e2)`
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 4)}, minmax(0, 1fr))` }}>
        {data.slice(0, 4).map((point) => (
          <div key={point.label} className="min-w-0 text-center">
            <p className="truncate text-xs font-bold text-on-surface">{point.label}</p>
            {point.helper ? <p className="truncate text-[11px] text-on-surface-variant">{point.helper}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarChart({ data, emptyLabel, valueFormatter }: { data: BarPoint[]; emptyLabel: string; valueFormatter: (value: number) => string }) {
  const max = Math.max(...data.map((point) => point.value), 1);

  if (data.length === 0) {
    return <EmptyChart label={emptyLabel} />;
  }

  return (
    <div className="space-y-4">
      {data.map((point, index) => (
        <div key={point.label}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-on-surface">{point.label}</p>
              {point.helper ? <p className="truncate text-xs text-on-surface-variant">{point.helper}</p> : null}
            </div>
            <span className="shrink-0 text-sm font-extrabold text-on-surface">{valueFormatter(point.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container">
            <div className="h-full rounded-full" style={{ width: `${Math.max(4, (point.value / max) * 100)}%`, backgroundColor: ChartColors[index % ChartColors.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ centerCaption, centerLabel, data }: { centerCaption: string; centerLabel: string; data: DonutPoint[] }) {
  const total = data.reduce((sum, point) => sum + point.value, 0);

  if (total === 0) {
    return <EmptyChart label="No orders in this range" />;
  }

  let cursor = 0;
  const gradient = data
    .map((point) => {
      const start = cursor;
      const end = cursor + (point.value / total) * 100;
      cursor = end;
      return `${point.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="grid gap-5 sm:grid-cols-[13rem_1fr] sm:items-center">
      <div className="relative mx-auto h-52 w-52 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-10 grid place-items-center rounded-full bg-white text-center shadow-sm">
          <div>
            <p className="text-2xl font-extrabold text-on-surface">{centerLabel}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{centerCaption}</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {data.map((point) => (
          <div key={point.label} className="flex items-center justify-between gap-3">
            <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-on-surface">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: point.color }} />
              <span className="truncate">{point.label}</span>
            </span>
            <span className="text-sm font-extrabold text-on-surface">{point.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentOrdersTable({ orders, showBranch }: { orders: OrderReportListItem[]; showBranch: boolean }) {
  if (orders.length === 0) {
    return <EmptyChart label="No recent orders for this range" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] text-left text-sm">
        <thead>
          <tr className="border-b border-outline-variant/70 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            <th className="py-3 pr-3">Order</th>
            <th className="px-3 py-3">Customer</th>
            {showBranch ? <th className="px-3 py-3">Branch</th> : null}
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Time</th>
            <th className="py-3 pl-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.orderId} className="border-b border-outline-variant/50 last:border-0">
              <td className="py-3 pr-3 font-bold text-on-surface">#{shortId(order.orderId)}</td>
              <td className="px-3 py-3 text-on-surface-variant">{order.customerName || `Table ${order.tableName}`}</td>
              {showBranch ? <td className="px-3 py-3 text-on-surface-variant">{order.branchName}</td> : null}
              <td className="px-3 py-3">
                <StatusBadge status={order.orderStatusCode} />
              </td>
              <td className="px-3 py-3 text-on-surface-variant">{formatRelativeTime(order.createdAtUtc)}</td>
              <td className="py-3 pl-3 text-right font-extrabold text-on-surface">{formatMoney(order.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttentionPanel({
  description,
  emptyLabel,
  items,
  title
}: {
  description: string;
  emptyLabel: string;
  items: { href: string; key: string; meta: string; title: string; value: string }[];
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link key={item.key} href={item.href} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/70 bg-white p-3 transition-colors hover:border-primary/25 hover:bg-secondary-container/40">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-on-surface">{item.title}</p>
                <p className="mt-1 truncate text-xs text-on-surface-variant">{item.meta}</p>
              </div>
              <span className="shrink-0 rounded-full bg-surface-container px-3 py-1 text-xs font-extrabold text-on-surface-variant">{item.value}</span>
            </Link>
          ))
        ) : (
          <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-outline-variant/80 bg-surface-container-low px-4 text-center text-sm font-semibold text-on-surface-variant">
            {emptyLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item}>
            <CardContent className="space-y-4 p-5">
              <div className="h-10 w-10 rounded-xl bg-surface-container" />
              <div className="h-4 w-28 rounded bg-surface-container" />
              <div className="h-8 w-32 rounded bg-surface-container" />
              <div className="h-10 rounded bg-surface-container" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="h-96 rounded-xl border border-outline-variant/70 bg-white" />
        <div className="h-96 rounded-xl border border-outline-variant/70 bg-white" />
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-outline-variant/80 bg-surface-container-low px-4 text-center text-sm font-semibold text-on-surface-variant">
      {label}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className = status === "Completed"
    ? "bg-emerald-100 text-emerald-800"
    : status === "Cancelled"
      ? "bg-red-100 text-red-800"
      : ActiveOrderStatuses.includes(status)
        ? "bg-primary-fixed text-primary"
        : "bg-surface-container text-on-surface-variant";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${className}`}>{status}</span>;
}

function buildSvgPoints(values: number[], width: number, height: number, padding: number) {
  const safeValues = values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0];
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const range = Math.max(max - min, 1);
  const xStep = (width - padding * 2) / Math.max(safeValues.length - 1, 1);
  const coordinates = safeValues.map((value, index) => ({
    x: padding + index * xStep,
    y: height - padding - ((value - min) / range) * (height - padding * 2)
  }));

  return {
    coordinates,
    polyline: coordinates.map((point) => `${point.x},${point.y}`).join(" "),
    areaPath: `M ${coordinates.map((point) => `${point.x} ${point.y}`).join(" L ")}`
  };
}

function formatChange(current: number, previous: number): { label: string; tone: "up" | "down" | "neutral" } {
  if (previous === 0 && current === 0) {
    return { label: "0%", tone: "neutral" };
  }

  if (previous === 0) {
    return { label: "New", tone: "up" };
  }

  const percent = ((current - previous) / previous) * 100;
  return {
    label: `${percent > 0 ? "+" : ""}${percent.toFixed(Math.abs(percent) >= 10 ? 0 : 1)}%`,
    tone: percent > 0 ? "up" : percent < 0 ? "down" : "neutral"
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

function formatCompactMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency"
  }).format(value);
}

function formatDisplayDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (diffMinutes < 1) {
    return "Now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return `${Math.floor(diffHours / 24)}d`;
}

function getRangeLabel(key: DateRangeKey): string {
  switch (key) {
    case "today":
      return "Hourly";
    case "30d":
      return "Daily";
    case "month":
      return "Month to date";
    default:
      return "Daily";
  }
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sortByCreatedDesc(a: OrderReportListItem, b: OrderReportListItem): number {
  return new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime();
}

function sortAdminOrdersByCreatedDesc(a: AdminOrder, b: AdminOrder): number {
  return new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime();
}

function sortWaiterCallsByCreatedDesc(a: WaiterCall, b: WaiterCall): number {
  return new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime();
}

function maxDateString(a: string | null, b: string | null): string | null {
  if (!a) {
    return b;
  }

  if (!b) {
    return a;
  }

  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function minDateString(a: string | null, b: string | null): string | null {
  if (!a) {
    return b;
  }

  if (!b) {
    return a;
  }

  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

function shortId(value: string): string {
  return value.replace(/-/g, "").slice(0, 8).toUpperCase();
}
