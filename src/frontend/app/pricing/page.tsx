import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Lock, ShieldCheck, Store } from "lucide-react";
import { PageShell, SiteUrl } from "../marketing";

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
                Fixed monthly pricing for Bareilly restaurants.
              </h1>
            </div>
            <p className="max-w-2xl text-lg font-semibold leading-8 text-[#444]">
              No per-order commission. Start with QR menu and waiter calls, then add KOT, billing, offers, CRM, and multi-branch controls when the restaurant is ready.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1560px]">
          <div className="grid gap-4 rounded-xl border border-[#111] bg-[#111] p-4 text-white md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#d6f2bd]">Founding restaurant offer</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.03em]">Growth features at Rs 999/month for 6 months</h2>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/75">
                First month free, no setup fee, free onboarding, and free QR placard design for the first 20 restaurants.
              </p>
            </div>
            <Link href="/contact" className="inline-flex justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-black transition hover:bg-[#f7f6f2]">
              Claim founding offer
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-4">
            {Plans.map((plan) => (
              <article key={plan.name} className={`flex min-h-full flex-col rounded-xl border bg-white ${plan.highlight ? "border-black shadow-[0_16px_50px_rgba(0,0,0,0.12)]" : "border-[#d8d8d8]"}`}>
                <div className="border-b border-[#d8d8d8] p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#707070]">{plan.bestFor}</p>
                      <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#050505]">{plan.name}</h2>
                    </div>
                    {plan.highlight ? <span className="rounded-full bg-black px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-normal text-white">Recommended</span> : null}
                  </div>
                  <p className="mt-5 text-4xl font-extrabold tracking-[-0.05em] text-[#050505]">{plan.price}</p>
                  <p className="mt-2 text-sm font-bold text-[#707070]">{plan.priceNote}</p>
                  <p className="mt-5 text-sm font-semibold leading-6 text-[#555]">{plan.description}</p>
                </div>

                <div className="grid flex-1 gap-5 p-6">
                  <FeatureGroup title="Includes" items={plan.includes} />
                  <FeatureGroup title="Limits" items={plan.limits} muted />
                  <FeatureGroup title="Pages shown" items={plan.pages} compact />
                  {plan.locked.length > 0 ? <LockedGroup items={plan.locked} /> : null}
                </div>

                <div className="border-t border-[#d8d8d8] p-6">
                  <Link href={plan.highlight ? "/contact" : "/admin/register"} className={`inline-flex w-full justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold transition ${plan.highlight ? "bg-black text-white hover:bg-[#1f1f1f]" : "border border-black text-black hover:bg-[#f7f6f2]"}`}>
                    {plan.cta}
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_0.55fr]">
            <article className="overflow-hidden rounded-xl border border-[#d8d8d8] bg-white">
              <div className="grid gap-8 border-b border-[#d8d8d8] p-7 md:grid-cols-[1fr_0.6fr] md:p-10">
                <div>
                  <span className="rounded-full bg-black px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-white">Trial rules</span>
                  <h2 className="mt-7 text-4xl font-extrabold tracking-[-0.04em] text-[#050505] md:text-5xl">14-day Growth trial</h2>
                  <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-[#555]">
                    New restaurants get Growth features during trial so they can test QR ordering, KOT, billing, offers, and staff workflow before paying.
                  </p>
                </div>
                <div className="rounded-xl bg-[#f7f6f2] p-6">
                  <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#707070]">After trial</p>
                  <p className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-[#050505]">Choose plan or pause</p>
                  <p className="mt-4 text-sm font-semibold leading-6 text-[#555]">Expired or suspended accounts are controlled by super admin and can show the QR menu as temporarily unavailable.</p>
                </div>
              </div>
              <div className="grid gap-px bg-[#d8d8d8] md:grid-cols-2">
                {TrialRules.map((item) => (
                  <div key={item} className="flex gap-3 bg-white p-6">
                    <Check className="mt-0.5 shrink-0 text-[#0b7a37]" size={20} />
                    <p className="text-sm font-extrabold leading-6 text-[#050505]">{item}</p>
                  </div>
                ))}
              </div>
            </article>

            <aside className="grid gap-4">
              {[
                [Store, "No commission", "Restaurants keep every order value and pay one predictable monthly fee."],
                [Clock3, "Built for service", "Plans grow from QR menu to live ordering, kitchen workflow, and staff operations."],
                [ShieldCheck, "Super admin ready", "Trials, suspensions, plan changes, and manual payments can be controlled internally."]
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
        </div>
      </section>
    </PageShell>
  );
}

const Plans = [
  {
    name: "Starter",
    price: "Rs 799",
    priceNote: "per outlet / month",
    bestFor: "Small cafes and food shops",
    description: "For restaurants that mainly need a clean QR menu, table codes, and waiter call without advanced operations.",
    includes: ["QR menu", "Table-wise QR codes", "Menu images and variants", "Waiter call", "Basic orders", "QR placard download"],
    limits: ["1 outlet", "15 tables", "100 menu items", "3 staff users", "Basic reports"],
    pages: ["Dashboard", "Branches", "Tables / QR", "Menu", "Orders", "Waiter Calls", "Basic Reports", "Subscription"],
    locked: ["KOT", "Offers", "Customer CRM", "Campaigns", "Advanced reports", "Multi-branch"],
    cta: "Start Starter"
  },
  {
    name: "Growth",
    price: "Rs 1,499",
    priceNote: "per outlet / month",
    bestFor: "Main Bareilly plan",
    description: "The recommended plan for cafes and restaurants that want QR ordering, kitchen workflow, billing, offers, and staff roles.",
    includes: ["Everything in Starter", "Direct QR ordering", "KOT / kitchen workflow", "Bill generation", "Tax, discount, service charge", "Offers", "Customer history"],
    limits: ["1 outlet", "40 tables", "300 menu items", "10 staff users", "5 active offers"],
    pages: ["Dashboard", "Branches", "Tables / QR", "Menu", "Orders", "Kitchen / KOT", "Billing", "Waiter Calls", "Offers", "Customers", "Reports", "Staff"],
    locked: ["WhatsApp campaigns", "Advanced segmentation", "Multi-branch dashboard", "Advanced analytics"],
    cta: "Choose Growth",
    highlight: true
  },
  {
    name: "Pro",
    price: "Rs 2,499",
    priceNote: "per outlet / month",
    bestFor: "Busy restaurants",
    description: "For outlets that need deeper customer tracking, feedback, WhatsApp follow-up links, and advanced performance reports.",
    includes: ["Everything in Growth", "Advanced CRM", "Repeat customer tracking", "Customer feedback", "WhatsApp follow-up links", "Advanced reports", "Priority support"],
    limits: ["1 outlet", "100 tables", "1,000 menu items", "25 staff users", "20 active offers"],
    pages: ["All Growth pages", "Feedback", "Campaigns / WhatsApp Follow-up", "Advanced Reports", "Settings"],
    locked: ["Multi-branch consolidated reporting", "Branch-wise staff permissions"],
    cta: "Start Pro"
  },
  {
    name: "Multi-Branch",
    price: "Rs 3,999",
    priceNote: "first 2 outlets / month",
    bestFor: "Small chains",
    description: "For owners running multiple locations who need branch-wise permissions, consolidated reports, and central control.",
    includes: ["Everything in Pro", "Multiple branches", "Central owner dashboard", "Branch-wise staff access", "Consolidated reports", "Branch-wise menus and offers"],
    limits: ["2 outlets included", "Rs 1,000 per extra outlet", "50 staff users", "Higher table and menu limits"],
    pages: ["Owner Dashboard", "All Branches", "Branch Dashboard", "Staff Permissions", "Consolidated Reports", "Customers by Branch"],
    locked: [],
    cta: "Talk to sales"
  }
];

const TrialRules = [
  "14-day free trial includes Growth Plan features",
  "Trial banner shows how many days are left",
  "Super admin can extend trial days",
  "Expired accounts are guided to subscription actions",
  "Suspended restaurants show QR menu as temporarily unavailable",
  "Plan upgrades unlock pages without changing restaurant data"
];

function FeatureGroup({ compact = false, items, muted = false, title }: { compact?: boolean; items: string[]; muted?: boolean; title: string }) {
  return (
    <div>
      <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#707070]">{title}</h3>
      <ul className={`mt-3 grid ${compact ? "gap-2" : "gap-3"}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm font-bold leading-5 text-[#050505]">
            <Check className={`mt-0.5 shrink-0 ${muted ? "text-[#707070]" : "text-[#0b7a37]"}`} size={16} />
            <span className={muted ? "text-[#555]" : undefined}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LockedGroup({ items }: { items: string[] }) {
  return (
    <div className="rounded-lg border border-[#d8d8d8] bg-[#f7f6f2] p-4">
      <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#707070]">
        <Lock size={14} />
        Locked until upgrade
      </h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#555]">{items.join(", ")}</p>
    </div>
  );
}
