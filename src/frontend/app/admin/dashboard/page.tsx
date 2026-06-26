"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MoreHorizontal,
  RefreshCw,
  Store
} from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  ApiError,
  getAdminOrders,
  getCustomerReport,
  getItemReport,
  getOrderReportOrders,
  getOrderReportSummary,
  getWaiterCalls,
  type AdminOrder,
  type BranchListItem,
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
  previousOrderReports: OrderReportListItem[];
  itemReports: ItemReport[];
  customerReports: CustomerReport[];
  activeOrders: AdminOrder[];
  waiterCalls: WaiterCall[];
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

type SparklinePoint = {
  label: string;
  value: number;
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
  const [branchScopeId, setBranchScopeId] = useState("");
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("7d");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const activeBranches = workspace.activeBranches;
  const canCompareBranches = activeBranches.length > 1;
  const effectiveBranchScopeId = branchScopeId || activeBranches[0]?.branchId || "";
  const scopedBranches = useMemo(() => {
    if (effectiveBranchScopeId === AllBranchesScope) {
      return activeBranches;
    }

    return activeBranches.filter((branch) => branch.branchId === effectiveBranchScopeId);
  }, [activeBranches, effectiveBranchScopeId]);

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
        return canCompareBranches ? AllBranchesScope : activeBranches[0].branchId;
      }

      if (activeBranches.some((branch) => branch.branchId === current)) {
        return current;
      }

      return activeBranches[0].branchId;
    });
  }, [activeBranches, canCompareBranches, workspace.isLoadingBranches]);

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

  const branchScopeLabel = effectiveBranchScopeId === AllBranchesScope
    ? "All assigned branches"
    : activeBranches.find((branch) => branch.branchId === effectiveBranchScopeId)?.name ?? workspace.selectedBranch?.name ?? "Restaurant workspace";
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
  const newCustomerTrendData = useMemo(() => buildCustomerTrendData(dashboardData?.customerReports ?? [], range, dateRangeKey), [dashboardData?.customerReports, dateRangeKey, range]);

  return (
    <AdminShell
      active="dashboard"
      branchName={branchScopeLabel}
      branches={activeBranches}
      onLogout={workspace.logout}
      onSelectedBranchChange={workspace.setSelectedBranchId}
      selectedBranchId={workspace.selectedBranchId}
    >
      <div className="mx-auto max-w-[88rem] space-y-5">
        <header className="rounded-md border border-outline-variant/70 bg-white px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <Badge variant="secondary" className="mb-3 w-fit bg-secondary-container text-primary">
                <Store size={14} />
                {branchScopeLabel}
              </Badge>
              <h1 className="text-2xl font-semibold tracking-normal text-on-surface sm:text-[1.75rem]">Service dashboard</h1>
              <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-on-surface-variant">
                Revenue, active orders, customer flow, and branch exceptions for the selected service window.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-md border border-outline-variant/70 bg-surface-container-low p-2 sm:flex-row sm:items-center">
              <DashboardPillSelect
                icon={<CalendarDays size={16} />}
                value={dateRangeKey}
                onChange={(value) => setDateRangeKey(value as DateRangeKey)}
                options={[
                  { label: "Today", value: "today" },
                  { label: "Last 7 days", value: "7d" },
                  { label: "Last 30 days", value: "30d" },
                  { label: "This month", value: "month" }
                ]}
              />
              <DashboardPillSelect
                icon={<Store size={16} />}
                value={effectiveBranchScopeId}
                onChange={setBranchScopeId}
                options={[
                  ...(canCompareBranches ? [{ label: "All assigned", value: AllBranchesScope }] : []),
                  ...activeBranches.map((branch) => ({ label: branch.name, value: branch.branchId }))
                ]}
              />
              <Button type="button" variant="outline" onClick={() => setReloadKey((current) => current + 1)} disabled={isLoadingDashboard || !hasBranchData} className="h-10 rounded-md border-outline-variant/70 bg-white px-3 text-sm shadow-none">
                <RefreshCw size={16} className={isLoadingDashboard ? "animate-spin" : ""} />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <PageError message={workspace.workspaceError} />

        {workspace.isLoadingBranches ? (
          <PageLoading />
        ) : !hasBranchData ? (
          <EmptyBranchState />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-on-surface-variant">
              <span className="rounded-md border border-outline-variant/70 bg-white px-3 py-1.5">{formatDisplayDate(range.dateFrom)} - {formatDisplayDate(range.dateTo)}</span>
              <span className="rounded-md border border-outline-variant/70 bg-white px-3 py-1.5">{branchScopeLabel}</span>
              <span className="rounded-md border border-outline-variant/70 bg-white px-3 py-1.5">{lastUpdatedAt ? `Updated ${formatTime(lastUpdatedAt)}` : "Waiting for data"}</span>
            </div>

            {isLoadingDashboard && !dashboardData ? (
              <DashboardSkeleton />
            ) : (
              <>
                <section className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                  <KpiCard
                    label="Total Sales"
                    value={formatMoney(dashboardData?.currentSummary.totalOrderValue ?? 0)}
                    change={formatChange(dashboardData?.currentSummary.totalOrderValue ?? 0, dashboardData?.previousSummary.totalOrderValue ?? 0)}
                    sparkline={trendData.map((point) => ({ label: point.label, value: point.revenue }))}
                    sparklineFormatter={formatMoney}
                    tone="blue"
                  />
                  <KpiCard
                    label="Active Orders"
                    value={formatNumber(openOrders)}
                    note={`${formatNumber(dashboardData?.currentSummary.totalOrders ?? 0)} total orders`}
                    sparkline={trendData.map((point) => ({ label: point.label, value: point.orders }))}
                    sparklineFormatter={formatNumber}
                    tone="teal"
                  />
                  <BranchPerformanceCard data={branchPerformanceData.slice(0, 4)} />
                  <KpiCard
                    label="New Customers"
                    value={formatNumber(newCustomerCount)}
                    note={`${formatNumber(customerCount)} total in range`}
                    sparkline={newCustomerTrendData}
                    sparklineFormatter={formatNumber}
                    tone="green"
                  />
                </section>

                <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]">
                  <Card className="overflow-hidden rounded-md border-outline-variant/70 bg-white shadow-sm">
                    <CardHeader className="flex flex-col gap-3 border-b border-outline-variant/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-base">Sales movement</CardTitle>
                        <CardDescription>Daily revenue and order volume - {formatShortRange(range)}</CardDescription>
                      </div>
                      <Badge variant="outline" className="w-fit rounded-md">{getRangeLabel(dateRangeKey)}</Badge>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-5">
                      <LineTrendChart data={trendData} />
                    </CardContent>
                  </Card>
                  <div className="space-y-4">
                    <Card className="rounded-md border-outline-variant/70 bg-primary text-white shadow-sm">
                      <CardHeader className="px-5 py-4">
                        <CardTitle className="text-base text-white">Service snapshot</CardTitle>
                        <CardDescription className="text-white/65">Live pressure for the selected branch scope.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 px-5 pb-5 pt-0 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <SnapshotMetric icon={<Clock3 size={18} />} label="Avg ready time" value={`${Math.round(dashboardData?.currentSummary.averageReadyMinutes ?? 0)} min`} />
                        <SnapshotMetric icon={<ClipboardList size={18} />} label="Open orders" value={formatNumber(openOrders)} />
                        <SnapshotMetric icon={<BellRing size={18} />} label="Waiter calls" value={formatNumber(pendingWaiterCalls)} />
                        <SnapshotMetric icon={<AlertTriangle size={18} />} label="Branch alerts" value={formatNumber(healthWarnings.length)} />
                      </CardContent>
                    </Card>
                    <AlertCards
                      items={healthWarnings.slice(0, 4).map((warning) => ({
                        key: `${warning.branchId}-${warning.label}`,
                        title: warning.label,
                        meta: warning.branchName,
                        href: warning.href,
                        tone: warning.label.toLowerCase().includes("30m") || warning.label.toLowerCase().includes("cancellation") ? "error" : "warning"
                      }))}
                    />
                  </div>
                </section>

                <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <Card className="rounded-md border-outline-variant/70 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Top selling items</CardTitle>
                      <CardDescription>Ranked by revenue for the selected range.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <HorizontalBarChart data={topItemData} valueFormatter={formatCompactMoney} emptyLabel="No item sales yet" />
                    </CardContent>
                  </Card>

                  <Card className="rounded-md border-outline-variant/70 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">{effectiveBranchScopeId === AllBranchesScope ? "Branch performance" : "Orders by status"}</CardTitle>
                      <CardDescription>
                        {effectiveBranchScopeId === AllBranchesScope ? "Revenue by assigned branch." : "Current range order mix."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {effectiveBranchScopeId === AllBranchesScope ? (
                        <VerticalBarChart data={branchPerformanceData} valueFormatter={formatCompactMoney} />
                      ) : (
                        <DonutChart data={statusData} centerLabel={formatNumber(dashboardData?.currentSummary.totalOrders ?? 0)} centerCaption="orders" />
                      )}
                    </CardContent>
                  </Card>
                </section>

                <section className="grid gap-4">
                  <Card className="rounded-md border-outline-variant/70 bg-white shadow-sm">
                    <CardHeader className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-base">Recent orders</CardTitle>
                        <CardDescription>Latest from {effectiveBranchScopeId === AllBranchesScope ? "all branches" : branchScopeLabel}.</CardDescription>
                      </div>
                      <Link href="/admin/reports" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-outline-variant/70 bg-surface-container-low px-3 text-xs font-bold text-on-surface-variant hover:bg-surface-container">
                        View all
                        <ArrowRight size={15} />
                      </Link>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0">
                      <RecentOrdersTable orders={recentOrders} showBranch={effectiveBranchScopeId === AllBranchesScope} />
                    </CardContent>
                  </Card>
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
    previousOrderReports,
    itemReports,
    customerReports,
    activeOrders,
    waiterCalls
  ] = await Promise.all([
    safeDashboardRequest(() => getOrderReportSummary(currentFilter), emptyOrderReportSummary()),
    safeDashboardRequest(() => getOrderReportSummary(previousFilter), emptyOrderReportSummary()),
    safeDashboardRequest(() => getOrderReportOrders(currentFilter), []),
    safeDashboardRequest(() => getOrderReportOrders(previousFilter), []),
    safeDashboardRequest(() => getItemReport(currentFilter), []),
    safeDashboardRequest(() => getCustomerReport(currentFilter), []),
    safeDashboardRequest(() => getAdminOrders(branch.branchId, false), []),
    safeDashboardRequest(() => getWaiterCalls(branch.branchId, false), [])
  ]);

  return {
    branch,
    currentSummary,
    previousSummary,
    orderReports,
    previousOrderReports,
    itemReports,
    customerReports,
    activeOrders,
    waiterCalls
  };
}

async function safeDashboardRequest<T>(factory: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await factory();
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 401) {
      throw caught;
    }

    return fallback;
  }
}

function emptyOrderReportSummary(): OrderReportSummary {
  return {
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalOrderValue: 0,
    averageOrderValue: 0,
    averageReadyMinutes: 0
  };
}

function combineBranchDashboardData(branchStats: BranchDashboardStats[]): DashboardData {
  const normalizedBranchStats = branchStats.map((branch) => ({
    ...branch,
    currentSummary: buildAccurateOrderSummary(branch.orderReports, branch.currentSummary),
    previousSummary: buildAccurateOrderSummary(branch.previousOrderReports, branch.previousSummary)
  }));
  const orderReports = normalizedBranchStats.flatMap((branch) => branch.orderReports);
  const previousOrderReports = normalizedBranchStats.flatMap((branch) => branch.previousOrderReports);

  return {
    branchStats: normalizedBranchStats,
    currentSummary: buildAccurateOrderSummary(orderReports, sumSummaries(normalizedBranchStats.map((branch) => branch.currentSummary))),
    previousSummary: buildAccurateOrderSummary(previousOrderReports, sumSummaries(normalizedBranchStats.map((branch) => branch.previousSummary))),
    orderReports,
    itemReports: mergeItemReports(normalizedBranchStats.flatMap((branch) => branch.itemReports)),
    customerReports: mergeCustomerReports(normalizedBranchStats.flatMap((branch) => branch.customerReports)),
    activeOrders: normalizedBranchStats
      .flatMap((branch) => branch.activeOrders.map((order) => ({ ...order, branchName: branch.branch.name })))
      .sort(sortAdminOrdersByCreatedDesc),
    waiterCalls: normalizedBranchStats
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

function buildAccurateOrderSummary(orders: OrderReportListItem[], fallback: OrderReportSummary): OrderReportSummary {
  if (orders.length === 0) {
    return fallback.totalOrders > 0 ? fallback : emptyOrderReportSummary();
  }

  const billableOrders = orders.filter((order) => order.orderStatusCode !== "Cancelled");
  const totalOrderValue = billableOrders.reduce((total, order) => total + order.totalAmount, 0);
  const completedOrders = orders.filter((order) => order.orderStatusCode === "Completed").length;
  const cancelledOrders = orders.filter((order) => order.orderStatusCode === "Cancelled").length;

  return {
    totalOrders: orders.length,
    completedOrders,
    cancelledOrders,
    totalOrderValue,
    averageOrderValue: billableOrders.length > 0 ? totalOrderValue / billableOrders.length : 0,
    averageReadyMinutes: fallback.averageReadyMinutes
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

function buildCustomerTrendData(customers: CustomerReport[], range: DateRange, rangeKey: DateRangeKey): SparklinePoint[] {
  const points = createTrendBuckets(range, rangeKey);
  const pointMap = new Map(points.map((point) => [point.key, point]));

  for (const customer of customers) {
    if (!customer.firstVisitAtUtc) {
      continue;
    }

    const date = new Date(customer.firstVisitAtUtc);
    const key = rangeKey === "today" ? `${Math.floor(date.getHours() / 3) * 3}` : toDateInputValue(date);
    const point = pointMap.get(key);
    if (point) {
      point.orders += 1;
    }
  }

  return points.map((point) => ({ label: point.label, value: point.orders }));
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
    const pendingWaiterCalls = branch.waiterCalls.filter((call) => !["Resolved", "Cancelled"].includes(call.statusCode)).length;
    const activeOrders = branch.activeOrders.filter((order) => !ClosedOrderStatuses.includes(order.orderStatusCode));
    const staleOrders = activeOrders.filter((order) => minutesSince(order.createdAtUtc) >= 30).length;
    const cancellationRate = branch.currentSummary.totalOrders > 0 ? branch.currentSummary.cancelledOrders / branch.currentSummary.totalOrders : 0;

    if (pendingWaiterCalls > 0) {
      warnings.push({
        branchId: branch.branch.branchId,
        branchName: branch.branch.name,
        href: "/admin/orders",
        label: `${pendingWaiterCalls} waiter call${pendingWaiterCalls === 1 ? "" : "s"} pending`
      });
    }

    if (staleOrders > 0) {
      warnings.push({
        branchId: branch.branch.branchId,
        branchName: branch.branch.name,
        href: "/admin/orders",
        label: `${staleOrders} order${staleOrders === 1 ? "" : "s"} waiting 30m+`
      });
    }

    if (branch.currentSummary.totalOrders >= 5 && cancellationRate >= 0.25) {
      warnings.push({
        branchId: branch.branch.branchId,
        branchName: branch.branch.name,
        href: "/admin/reports",
        label: "High cancellation rate"
      });
    }

    return warnings;
  });
}

function DashboardPillSelect({
  icon,
  onChange,
  options,
  value
}: {
  icon: ReactNode;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <label className="block min-w-[10rem]">
      <span className="sr-only">Dashboard filter</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">{icon}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-md border border-outline-variant/70 bg-white py-1 pl-9 pr-8 text-sm font-semibold text-on-surface outline-none transition-colors hover:bg-surface-container-low focus:border-primary/30 focus:ring-2 focus:ring-ring/15"
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
  label,
  note,
  sparkline,
  sparklineFormatter = formatNumber,
  tone = "blue",
  value
}: {
  change?: { label: string; tone: "up" | "down" | "neutral" };
  label: string;
  note?: string;
  sparkline?: SparklinePoint[];
  sparklineFormatter?: (value: number) => string;
  tone?: "blue" | "green" | "teal";
  value: string;
}) {
  const toneClass = change?.tone === "up"
    ? "bg-emerald-50 text-emerald-700"
    : change?.tone === "down"
      ? "bg-red-50 text-red-700"
      : "bg-surface-container text-on-surface-variant";

  return (
    <Card className="overflow-hidden rounded-md border-outline-variant/70 bg-white shadow-sm">
      <CardContent className="flex min-h-[7.75rem] flex-col px-4 pb-2 pt-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0">
            <span className="block truncate text-[0.95rem] font-semibold leading-5 text-on-surface">{label}</span>
            <span className="mt-1 block truncate text-2xl font-extrabold leading-none text-on-surface">{value}</span>
          </p>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {change ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${toneClass}`}>{change.label}</span> : null}
            {note ? <span className="max-w-[7.5rem] truncate text-right text-[11px] font-semibold text-on-surface-variant">{note}</span> : null}
          </div>
        </div>
        <Sparkline data={sparkline ?? []} tone={tone} valueFormatter={sparklineFormatter} />
      </CardContent>
    </Card>
  );
}

function BranchPerformanceCard({ data }: { data: BarPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1);
  const visibleData = data.length > 0 ? data : [
    { label: "Branch 1", value: 0 },
    { label: "Branch 2", value: 0 },
    { label: "Branch 3", value: 0 },
    { label: "Branch 4", value: 0 }
  ];

  return (
    <Card className="overflow-hidden rounded-md border-outline-variant/70 bg-white shadow-sm">
      <CardContent className="flex min-h-[7.75rem] flex-col px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[0.95rem] font-semibold leading-5 text-on-surface">Branch Performance</p>
            <p className="mt-1 truncate text-[11px] font-semibold text-on-surface-variant">Revenue by location</p>
          </div>
          <button type="button" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container" aria-label="Branch performance options">
            <MoreHorizontal size={17} />
          </button>
        </div>
        <div className="mt-auto grid h-[4.25rem] grid-cols-4 items-end gap-3">
          {visibleData.slice(0, 4).map((point, index) => {
            const height = Math.max(10, (point.value / max) * 46);
            return (
              <div key={`${point.label}-${index}`} className="flex min-w-0 flex-col items-center gap-1.5">
                <div className="flex h-12 w-full max-w-[2.6rem] items-end justify-center gap-1">
                  {[0.62, 1, 0.72].map((scale, barIndex) => (
                    <span
                      key={scale}
                      className="w-2 rounded-t-sm bg-emerald-600/85"
                      style={{ height: `${Math.max(8, height * scale - barIndex * 2)}px` }}
                    />
                  ))}
                </div>
                <span className="w-full truncate text-center text-[11px] font-semibold text-on-surface-variant">{point.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SnapshotMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.07] p-3">
      <div className="flex items-center gap-2 text-white/65">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/10 text-brand-lime">{icon}</span>
        <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold leading-none text-white">{value}</p>
    </div>
  );
}

function Sparkline({ data, tone, valueFormatter }: { data: SparklinePoint[]; tone: "blue" | "green" | "teal"; valueFormatter: (value: number) => string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const safeData = data.length > 0 ? data : [{ label: "No data", value: 0 }, { label: "No data", value: 0 }];
  const points = buildSvgPoints(safeData.map((point) => point.value), 180, 54, 5);
  const activePoint = activeIndex === null ? null : points.coordinates[activeIndex];
  const activeData = activeIndex === null ? null : safeData[activeIndex];
  const color = tone === "green" ? "#1f9d61" : tone === "teal" ? "#178f8d" : "#1f66c2";
  const fill = tone === "green" ? "#dff4e8" : tone === "teal" ? "#d8f1ef" : "#e6f0ff";

  return (
    <svg className="mt-auto h-14 w-full" viewBox="0 0 180 54" role="img" aria-label="Trend" onMouseLeave={() => setActiveIndex(null)}>
      <path d={`${points.areaPath} L 175 52 L 5 52 Z`} fill={fill} opacity="0.95" />
      <polyline points={points.polyline} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.coordinates.map((point, index) => (
        <g key={`${safeData[index]?.label ?? index}-${index}`}>
          <rect
            x={index === 0 ? 0 : (points.coordinates[index - 1].x + point.x) / 2}
            y="0"
            width={
              index === points.coordinates.length - 1
                ? 180 - (points.coordinates[index - 1]?.x ? (points.coordinates[index - 1].x + point.x) / 2 : 0)
                : ((points.coordinates[index + 1].x + point.x) / 2) - (index === 0 ? 0 : (points.coordinates[index - 1].x + point.x) / 2)
            }
            height="54"
            fill="transparent"
            tabIndex={0}
            role="button"
            aria-label={`${safeData[index].label}: ${valueFormatter(safeData[index].value)}`}
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
          />
        </g>
      ))}
      {activePoint && activeData ? (
        <g pointerEvents="none">
          <line x1={activePoint.x} y1="4" x2={activePoint.x} y2="51" stroke={color} strokeOpacity="0.22" strokeWidth="1" />
          <circle cx={activePoint.x} cy={activePoint.y} r="3.5" fill="#ffffff" stroke={color} strokeWidth="2" />
          <g transform={`translate(${Math.min(Math.max(activePoint.x, 28), 152)} 4)`}>
            <rect x="-27" y="-2" width="54" height="17" rx="5" fill="#1f2933" />
            <text x="0" y="10" textAnchor="middle" className="fill-white text-[8px] font-bold">
              {valueFormatter(activeData.value)}
            </text>
          </g>
        </g>
      ) : null}
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
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-bold text-on-surface-variant">
        <LegendDot color="#5d8fd8" label="Revenue" />
        <LegendDot color="#64c7c4" label="Orders" />
        <span className="ml-auto">Peak {formatCompactMoney(maxRevenue)}</span>
      </div>
        <svg className="h-48 w-full sm:h-56" viewBox="0 0 720 280" role="img" aria-label="Sales trend chart">
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
  );
}

function VerticalBarChart({ data, valueFormatter }: { data: BarPoint[]; valueFormatter: (value: number) => string }) {
  const max = Math.max(...data.map((point) => point.value), 1);

  if (data.length === 0 || data.every((point) => point.value === 0)) {
    return <EmptyChart label="No branch revenue yet" />;
  }

  return (
    <div className="h-56">
      <div className="flex h-40 items-end gap-3 border-b border-outline-variant/70 px-2">
        {data.map((point, index) => (
          <div key={point.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
            <div className="text-center text-xs font-bold text-on-surface">{valueFormatter(point.value)}</div>
            <div
              className="mx-auto w-full max-w-14 rounded-t-xl"
              style={{
                height: `${Math.max(8, (point.value / max) * 118)}px`,
                backgroundColor: `${ChartColors[index % ChartColors.length]}26`,
                border: `1px solid ${ChartColors[index % ChartColors.length]}`
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

function RecentOrdersTable({ orders, showBranch: _showBranch }: { orders: OrderReportListItem[]; showBranch: boolean }) {
  if (orders.length === 0) {
    return <EmptyChart label="No recent orders for this range" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead>
          <tr className="border-b border-outline-variant/70 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
            <th className="pb-3 pr-3">Order</th>
            <th className="px-3 pb-3">Customer</th>
            <th className="px-3 pb-3">Status</th>
            <th className="pb-3 pl-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.orderId} className="border-b border-outline-variant/50 last:border-0">
              <td className="py-3 pr-3 font-mono text-xs font-semibold text-on-surface-variant">#{shortId(order.orderId)}</td>
              <td className="px-3 py-3 text-on-surface-variant">{order.customerName || `Table ${order.tableName}`}</td>
              <td className="px-3 py-3">
                <StatusBadge status={order.orderStatusCode} />
              </td>
              <td className="py-3 pl-3 text-right font-extrabold text-on-surface">{formatMoney(order.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertCards({
  items
}: {
  items: { href: string; key: string; meta: string; title: string; tone: "error" | "warning" }[];
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-outline-variant/70 bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-on-surface">No branch alerts</p>
            <p className="mt-0.5 text-xs font-medium text-on-surface-variant">Current orders and waiter calls look stable.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className="flex items-start gap-3 rounded-md border border-outline-variant/70 bg-white p-3 shadow-sm transition-colors hover:border-primary/25 hover:bg-surface-container-low"
        >
          <span className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-md ${item.tone === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
            <AlertTriangle size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-on-surface">{item.title}</span>
            <span className="mt-1 block truncate text-xs font-medium text-on-surface-variant">{item.meta}</span>
          </span>
          <span className="shrink-0 rounded-md border border-outline-variant/70 bg-surface-container-low px-2.5 py-1 text-xs font-bold text-on-surface-variant">Open</span>
        </Link>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item}>
            <CardContent className="space-y-4 p-5">
              <div className="h-10 w-10 rounded-md bg-surface-container" />
              <div className="h-4 w-28 rounded bg-surface-container" />
              <div className="h-8 w-32 rounded bg-surface-container" />
              <div className="h-10 rounded bg-surface-container" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="h-96 rounded-md border border-outline-variant/70 bg-white" />
        <div className="h-96 rounded-md border border-outline-variant/70 bg-white" />
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-md border border-dashed border-outline-variant/80 bg-surface-container-low px-4 text-center text-sm font-semibold text-on-surface-variant">
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

function formatShortRange(range: DateRange): string {
  const from = parseLocalDate(range.dateFrom).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const to = parseLocalDate(range.dateTo).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${from}-${to}`;
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function minutesSince(value: string): number {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
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
