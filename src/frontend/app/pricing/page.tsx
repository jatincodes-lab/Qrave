import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Clock3, ShieldCheck, Store } from "lucide-react";
import { PageShell, PricingBullets, SiteUrl } from "../marketing";

export const metadata: Metadata = {
  title: "Pricing | Qrave QR Menu Software",
  description: "Simple pricing for Qrave, QR menu ordering and customer CRM software for restaurants, cafes, cloud kitchens, and food service teams.",
  alternates: { canonical: `${SiteUrl}/pricing` },
  openGraph: {
    title: "Qrave Pricing",
    description: "Start with QR menus, live orders, customer history, and WhatsApp-ready follow-up tools.",
    url: `${SiteUrl}/pricing`,
    siteName: "Qrave",
    type: "website"
  }
};

export default function PricingPage() {
  return (
    <PageShell>
      <section className="bg-[#f7f6f2] px-5 pb-20 pt-32 text-[#050505] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1560px]">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#707070]">Pricing</p>
              <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.92] tracking-[-0.04em] md:text-7xl">
                Start simple. Add more when the restaurant is ready.
              </h1>
            </div>
            <p className="max-w-2xl text-lg font-semibold leading-8 text-[#444]">
              Launch QR ordering with the practical tools restaurant teams need first: table codes, live orders, menu control, and customer history.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1560px] gap-6 lg:grid-cols-[0.95fr_0.55fr]">
          <article className="overflow-hidden rounded-xl border border-[#d8d8d8] bg-white">
            <div className="grid gap-8 border-b border-[#d8d8d8] p-7 md:grid-cols-[1fr_0.6fr] md:p-10">
              <div>
                <span className="rounded-full bg-black px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-white">Launch plan</span>
                <h2 className="mt-7 text-4xl font-extrabold tracking-[-0.04em] text-[#050505] md:text-6xl">Restaurant Starter</h2>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-[#555]">
                  For cafes, restaurants, and cloud kitchens that want a serious QR ordering setup without a long rollout.
                </p>
              </div>
              <div className="rounded-xl bg-[#f7f6f2] p-6">
                <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#707070]">Today</p>
                <p className="mt-4 text-5xl font-extrabold tracking-[-0.05em] text-[#050505]">Start free</p>
                <p className="mt-4 text-sm font-semibold leading-6 text-[#555]">Upgrade options can be added when you need more branches, reports, or messaging.</p>
              </div>
            </div>
            <div className="grid gap-px bg-[#d8d8d8] md:grid-cols-2">
              {PricingBullets.map((item) => (
                <div key={item} className="flex gap-3 bg-white p-6">
                  <Check className="mt-0.5 shrink-0 text-[#0b7a37]" size={20} />
                  <p className="text-sm font-extrabold leading-6 text-[#050505]">{item}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-[#d8d8d8] p-7 sm:flex-row md:p-10">
              <Link href="/admin/register" className="inline-flex justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#1f1f1f]">
                Start free
                <ArrowRight size={17} />
              </Link>
              <Link href="/contact" className="inline-flex justify-center rounded-full border border-black px-6 py-3 text-sm font-extrabold text-black transition hover:bg-[#f7f6f2]">
                Talk to sales
              </Link>
            </div>
          </article>

          <aside className="grid gap-4">
            {[
              [Store, "Branch-ready", "Create branch menus, table QR codes, and staff views from one workspace."],
              [Clock3, "Rush-hour useful", "Keep new orders, kitchen status, and waiter calls visible during service."],
              [ShieldCheck, "Consent-aware", "Save customer details and WhatsApp consent for responsible follow-up."]
            ].map(([Icon, title, text]) => {
              const ItemIcon = Icon as typeof Store;
              return (
                <div key={title as string} className="rounded-xl border border-[#d8d8d8] bg-[#f7f6f2] p-6">
                  <ItemIcon size={24} />
                  <h3 className="mt-8 text-2xl font-extrabold tracking-[-0.03em] text-[#050505]">{title as string}</h3>
                  <p className="mt-4 text-sm font-semibold leading-6 text-[#555]">{text as string}</p>
                </div>
              );
            })}
          </aside>
        </div>
      </section>
    </PageShell>
  );
}
