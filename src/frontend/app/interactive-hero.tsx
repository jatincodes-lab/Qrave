"use client";

import { useMemo, useState } from "react";
import { BellRing, ChefHat, MessageCircle, QrCode, ScanLine, Smartphone } from "lucide-react";

const flowStates = [
  {
    id: "scan",
    label: "Scan",
    eyebrow: "Table 4",
    title: "Guest opens the live menu",
    detail: "The table QR opens a browser menu with current items, photos, variants, and availability.",
    phoneTitle: "House specials",
    primaryMetric: "15 min",
    metricLabel: "menu setup",
    status: "QR active",
    color: "#F97316",
    icon: ScanLine,
    cards: ["Table QR verified", "Menu available", "No app install"]
  },
  {
    id: "order",
    label: "Order",
    eyebrow: "Guest order",
    title: "Order lands without waiting",
    detail: "Guests add items, notes, and variants from the table. Staff see a clean ticket instantly.",
    phoneTitle: "Cart ready",
    primaryMetric: "Rs. 920",
    metricLabel: "new order",
    status: "Placed",
    color: "#22C55E",
    icon: Smartphone,
    cards: ["Paneer bowl x2", "Extra naan", "No onion note"]
  },
  {
    id: "kitchen",
    label: "Kitchen",
    eyebrow: "Prep board",
    title: "Kitchen moves the ticket",
    detail: "Orders move from placed to preparing to ready, while waiter calls stay visible beside service.",
    phoneTitle: "Order tracking",
    primaryMetric: "7 open",
    metricLabel: "kitchen tickets",
    status: "Preparing",
    color: "#3B82F6",
    icon: ChefHat,
    cards: ["Placed", "Preparing", "Ready"]
  },
  {
    id: "retain",
    label: "Retain",
    eyebrow: "Customer profile",
    title: "The visit becomes a return signal",
    detail: "Qrave records customer context and supports WhatsApp follow-up for opted-in guests.",
    phoneTitle: "Return offer",
    primaryMetric: "4th visit",
    metricLabel: "repeat guest",
    status: "Campaign sent",
    color: "#A855F7",
    icon: MessageCircle,
    cards: ["Last visit today", "Favorite: cold coffee", "WhatsApp opt-in"]
  }
];

const queue = [
  ["Table 4", "Paneer bowl x2", "Preparing"],
  ["Table 9", "Veg thali x1", "Placed"],
  ["Table 2", "Water refill", "Waiter call"]
];

export function InteractiveHero() {
  const [active, setActive] = useState(flowStates[0].id);
  const current = useMemo(() => flowStates.find((item) => item.id === active) ?? flowStates[0], [active]);
  const Icon = current.icon;

  return (
    <div className="landing-reveal relative w-full min-w-0 lg:max-w-full" style={{ animationDelay: "220ms", width: "min(100%, calc(100vw - 2rem))" }}>
      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/[0.06] p-2 shadow-[0_32px_100px_rgba(0,0,0,0.42)] backdrop-blur">
        <div className="grid min-h-[34rem] overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#F8FAFC] text-[#0F172A] lg:grid-cols-[17rem_1fr]">
          <aside className="bg-[#0B1020] p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#0B1020]">
                <QrCode size={19} />
              </div>
              <div>
                <p className="text-sm font-extrabold">Qrave Flow</p>
                <p className="text-xs font-semibold text-slate-400">Interactive service demo</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-1">
              {flowStates.map((item) => {
                const selected = item.id === active;
                const ItemIcon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={selected ? "flex items-center gap-3 rounded-xl bg-white px-3 py-3 text-left text-sm font-extrabold text-[#0F172A]" : "flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-extrabold text-slate-300 transition hover:bg-white/8 hover:text-white"}
                    onClick={() => setActive(item.id)}
                    aria-pressed={selected}
                  >
                    <ItemIcon size={17} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-bold text-slate-400">Live shift</p>
              <p className="mt-2 text-3xl font-extrabold">42</p>
              <p className="text-xs font-bold text-slate-400">QR orders today</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: active === "scan" ? "28%" : active === "order" ? "52%" : active === "kitchen" ? "74%" : "92%", backgroundColor: current.color }} />
              </div>
            </div>
          </aside>

          <div className="relative overflow-hidden p-4 sm:p-6">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full blur-3xl transition-colors duration-500" style={{ backgroundColor: `${current.color}24` }} />
            <div className="relative grid gap-5 2xl:grid-cols-[1fr_18rem]">
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-extrabold" style={{ color: current.color }}>
                      {current.eyebrow}
                    </p>
                    <h2 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight text-[#0F172A]">{current.title}</h2>
                    <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-[#64748B]">{current.detail}</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: current.color }}>
                    <Icon size={22} />
                  </div>
                </div>

                <div className="mt-6 grid gap-3 2xl:grid-cols-3">
                  {current.cards.map((card, index) => (
                    <div key={card} className="qrave-flow-card rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4" style={{ animationDelay: `${index * 90}ms` }}>
                      <p className="text-sm font-extrabold text-[#0F172A]">{card}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 2xl:grid-cols-[1fr_0.75fr]">
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-[#0F172A]">Service queue</p>
                      <span className="rounded-full px-3 py-1 text-xs font-extrabold text-white" style={{ backgroundColor: current.color }}>
                        {current.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {queue.map(([table, item, status]) => (
                        <div key={table} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[0.55fr_1fr_auto] sm:items-center">
                          <p className="text-sm font-extrabold text-[#0F172A]">{table}</p>
                          <p className="text-xs font-semibold text-[#64748B]">{item}</p>
                          <p className={status === "Waiter call" ? "text-xs font-extrabold text-[#C2410C]" : "text-xs font-extrabold text-[#166534]"}>{status}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#0B1020] p-4 text-white">
                    <p className="text-sm font-bold text-slate-400">{current.metricLabel}</p>
                    <p className="mt-3 text-4xl font-extrabold">{current.primaryMetric}</p>
                    <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/8 p-3">
                      <BellRing size={18} style={{ color: current.color }} />
                      <p className="text-sm font-bold text-slate-200">Updated in real time</p>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="relative mx-auto hidden w-full max-w-[18rem] 2xl:block 2xl:max-w-none">
                <div className="mx-auto h-[31rem] overflow-hidden rounded-[2rem] border-[10px] border-[#0B1020] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
                  <div className="bg-[#0B1020] px-5 py-4 text-white">
                    <p className="text-xs font-bold text-slate-400">Qrave Menu</p>
                    <h3 className="mt-2 text-xl font-extrabold">{current.phoneTitle}</h3>
                  </div>
                  <div className="grid gap-3 p-4">
                    {["Paneer tikka bowl", "Veg Farm House Pizza", "Cold coffee"].map((item, index) => (
                      <div key={item} className="qrave-menu-item rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3" style={{ animationDelay: `${index * 110}ms` }}>
                        <div className="flex gap-3">
                          <div className="h-14 w-14 rounded-xl" style={{ background: `linear-gradient(135deg, ${current.color}33, #fff7ed)` }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-[#0F172A]">{item}</p>
                            <p className="mt-1 text-xs font-semibold text-[#64748B]">Freshly prepared</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-extrabold text-[#0F172A]">Rs. {index === 0 ? "240" : index === 1 ? "350" : "160"}</span>
                          <span className="rounded-full px-3 py-1 text-xs font-extrabold text-white" style={{ backgroundColor: current.color }}>
                            Add
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-slate-400">Click each stage to preview the restaurant workflow.</p>
    </div>
  );
}
