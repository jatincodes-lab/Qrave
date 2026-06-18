"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { ApiError, getSuperAdminRestaurants, type SuperAdminRestaurant } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { SuperAdminShell, StatusPill, formatDate, formatMoney } from "../superadmin-common";

export default function SuperAdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<SuperAdminRestaurant[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      setRestaurants(await getSuperAdminRestaurants({ search, status, plan: plan || "all" }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load restaurants.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SuperAdminShell title="Restaurants">
      {error ? <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-bold text-destructive">{error}</div> : null}

      <Card className="border-outline-variant/50 bg-surface-container-lowest">
        <CardHeader>
          <CardTitle>Restaurant Tenants</CardTitle>
          <CardDescription>Search and manage all restaurants using Qrave.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={load} className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_12rem_10rem_auto]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search restaurant, owner, email..." className="pl-9" />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-input bg-white px-3 text-sm font-semibold">
              <option value="all">All statuses</option>
              <option value="Trialing">Trialing</option>
              <option value="Active">Active</option>
              <option value="ManualActive">Manual active</option>
              <option value="PastDue">Past due</option>
              <option value="Suspended">Suspended</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <Input value={plan} onChange={(event) => setPlan(event.target.value)} placeholder="Plan" />
            <Button type="submit" disabled={isLoading}>Apply</Button>
          </form>

          {isLoading ? (
            <div className="rounded-lg border border-dashed border-outline-variant/60 bg-white px-3 py-8 text-center text-sm font-semibold text-on-surface-variant">Loading restaurants...</div>
          ) : restaurants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-outline-variant/60 bg-white px-3 py-8 text-center text-sm font-semibold text-on-surface-variant">No restaurants found.</div>
          ) : (
            <div className="grid gap-3">
              {restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.tenantId} restaurant={restaurant} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </SuperAdminShell>
  );
}

function RestaurantCard({ restaurant }: { restaurant: SuperAdminRestaurant }) {
  return (
    <Link href={`/superadmin/restaurants/${restaurant.tenantId}`} className="block rounded-xl border border-outline-variant/50 bg-white p-4 shadow-sm hover:border-primary/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-lg font-black text-on-surface">{restaurant.name}</h2>
            <StatusPill value={restaurant.subscriptionStatusCode} />
          </div>
          <p className="mt-1 break-words text-sm font-semibold text-on-surface-variant">{restaurant.ownerName ?? "Owner"} - {restaurant.ownerEmail}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Created {formatDate(restaurant.createdAtUtc)} - Last order {formatDate(restaurant.lastOrderAtUtc)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:min-w-[34rem]">
          <Stat label="Plan" value={restaurant.planCode} />
          <Stat label="Branches" value={restaurant.branchCount} />
          <Stat label="Tables" value={restaurant.tableCount} />
          <Stat label="Orders" value={restaurant.orderCount} />
          <Stat label="Revenue" value={formatMoney(restaurant.revenueTotal)} />
        </div>

        <div className="hidden text-primary lg:block">
          <ArrowRight size={20} />
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface-container-low px-3 py-2">
      <p className="truncate text-sm font-black text-on-surface">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-on-surface-variant">{label}</p>
    </div>
  );
}
