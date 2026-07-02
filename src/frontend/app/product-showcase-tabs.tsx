"use client";

import { useState } from "react";
import { BarChart3, Check, ChefHat, MessageCircle, QrCode, Store, Users } from "lucide-react";

const tabs = [
  {
    id: "menu",
    label: "Menu Management",
    title: "Publish a menu your team can actually control",
    text: "Categories, items, prices, images, variants, and availability stay live without printing another menu.",
    icon: QrCode
  },
  {
    id: "orders",
    label: "Live Orders & Kitchen",
    title: "Move table orders through a clean kitchen workflow",
    text: "Track placed, preparing, ready, and served statuses while waiter calls remain visible.",
    icon: ChefHat
  },
  {
    id: "customers",
    label: "WhatsApp Customers",
    title: "Bring customers back after the visit",
    text: "Use visit history, last order context, campaigns, and redeemed offers to drive repeat visits.",
    icon: MessageCircle
  }
];

const menuRows = [
  ["Starters", "Paneer Tikka", "Rs. 240", "Available"],
  ["Pizza", "Veg Farm House", "Rs. 350", "Available"],
  ["Coffee", "Cold Coffee", "Rs. 160", "Low stock"],
  ["Dessert", "Chocolate Brownie", "Rs. 180", "Hidden"]
];

const orderRows = [
  ["Table 4", "Paneer tikka bowl x2", "Placed"],
  ["Table 9", "Veg thali, cold coffee x2", "Preparing"],
  ["Table 2", "White sauce pasta x1", "Ready"],
  ["Table 7", "Veg burger combo x2", "Served"]
];

const customerRows = [
  ["Priya Sharma", "Last visit today", "Campaign sent", "Offer redeemed"],
  ["Aarav Patel", "4 visits", "Birthday offer", "Pending"],
  ["Neha Jain", "Rs. 3,850 spend", "Win-back sent", "Clicked"]
];

export function ProductShowcaseTabs() {
  const [active, setActive] = useState(tabs[0].id);
  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];
  const ActiveIcon = activeTab.icon;

  return (
    <div data-landing-reveal className="landing-scroll-reveal rounded-3xl border border-white/10 bg-white/8 p-3 shadow-[0_30px_90px_rgba(0,0,0,0.26)] backdrop-blur">
      <div className="grid gap-4 rounded-2xl bg-[#F8FAFC] p-4 text-[#0F172A] lg:grid-cols-[18rem_1fr] lg:p-5">
        <div className="rounded-2xl bg-[#0B1020] p-3 text-white">
          <div role="tablist" aria-label="Qrave product dashboard tabs" className="grid gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = tab.id === active;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  className={selected ? "flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-left text-sm font-extrabold text-[#0F172A]" : "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-extrabold text-slate-300 transition hover:bg-white/8 hover:text-white"}
                  onClick={() => setActive(tab.id)}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/7 p-4">
            <p className="text-sm font-extrabold text-orange-200">Shift summary</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["42", "orders"],
                ["18", "tables"],
                ["9", "calls"],
                ["128", "messages"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl bg-white/8 p-3">
                  <p className="text-2xl font-extrabold">{value}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section
          role="tabpanel"
          id={`panel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
          className="min-h-[31rem] rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-100 text-[#C2410C]">
                <ActiveIcon size={22} />
              </div>
              <h3 className="mt-5 text-3xl font-extrabold leading-tight text-[#0F172A]">{activeTab.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#64748B]">{activeTab.text}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-[#F8FAFC] p-3 text-center">
              {[
                [Store, "Branches"],
                [Users, "Guests"],
                [BarChart3, "Reports"]
              ].map(([Icon, label]) => {
                const MetricIcon = Icon as typeof Store;
                return (
                  <div key={label as string} className="rounded-xl bg-white p-3">
                    <MetricIcon className="mx-auto text-[#F97316]" size={19} />
                    <p className="mt-2 text-xs font-extrabold text-[#475569]">{label as string}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-7">
            {active === "menu" ? <MenuPanel /> : null}
            {active === "orders" ? <OrdersPanel /> : null}
            {active === "customers" ? <CustomersPanel /> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function MenuPanel() {
  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {menuRows.map(([category, item, price, status]) => (
          <div key={item} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-xs font-extrabold text-[#64748B]">{category}</p>
            <p className="mt-2 text-base font-extrabold text-[#0F172A]">{item}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm font-extrabold text-[#0F172A]">{price}</span>
              <StatusPill status={status} />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-2xl border border-[#E2E8F0] sm:block">
        <div className="grid grid-cols-[1fr_1.1fr_0.7fr_0.8fr] bg-[#F8FAFC] px-4 py-3 text-xs font-extrabold text-[#64748B]">
          <span>Category</span>
          <span>Item</span>
          <span>Price</span>
          <span>Status</span>
        </div>
        {menuRows.map(([category, item, price, status]) => (
          <div key={item} className="grid grid-cols-[1fr_1.1fr_0.7fr_0.8fr] items-center border-t border-[#E2E8F0] px-4 py-4 text-sm">
            <span className="font-bold text-[#64748B]">{category}</span>
            <span className="font-extrabold text-[#0F172A]">{item}</span>
            <span className="font-extrabold text-[#0F172A]">{price}</span>
            <StatusPill status={status} />
          </div>
        ))}
      </div>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={status === "Hidden" ? "w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-[#475569]" : status === "Low stock" ? "w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-extrabold text-[#C2410C]" : "w-fit rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-extrabold text-[#166534]"}>
      {status}
    </span>
  );
}

function OrdersPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {["Placed", "Preparing", "Ready", "Served"].map((status) => (
        <div key={status} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <p className="text-sm font-extrabold text-[#0F172A]">{status}</p>
          <div className="mt-3 grid gap-3">
            {orderRows
              .filter((row) => row[2] === status)
              .map(([table, item]) => (
                <div key={`${table}-${item}`} className="rounded-xl bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                  <p className="text-sm font-extrabold text-[#0F172A]">{table}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[#64748B]">{item}</p>
                </div>
              ))}
            {orderRows.filter((row) => row[2] === status).length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] p-3 text-xs font-bold text-[#94A3B8]">No tickets</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomersPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0]">
        {customerRows.map(([name, visit, campaign, offer]) => (
          <div key={name} className="grid gap-3 border-b border-[#E2E8F0] p-4 last:border-b-0 sm:grid-cols-[0.9fr_1fr_1fr_1fr] sm:items-center">
            <p className="font-extrabold text-[#0F172A]">{name}</p>
            <p className="text-sm font-bold text-[#64748B]">{visit}</p>
            <p className="text-sm font-bold text-[#64748B]">{campaign}</p>
            <span className={offer === "Offer redeemed" ? "w-fit rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-extrabold text-[#166534]" : "w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-extrabold text-[#C2410C]"}>
              {offer}
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-[#0B1020] p-5 text-white">
        <MessageCircle size={24} className="text-[#86EFAC]" />
        <h4 className="mt-6 text-2xl font-extrabold leading-tight">Repeat visit campaign</h4>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">Send opted-in customers a weekday lunch offer after their last visit.</p>
        <div className="mt-5 grid gap-2">
          {["Segment: 30-day visitors", "Offer: 10% lunch combo", "Channel: WhatsApp"].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-xl bg-white/8 p-3 text-sm font-bold text-slate-200">
              <Check size={16} className="text-[#86EFAC]" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
