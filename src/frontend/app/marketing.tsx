import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  Check,
  ChefHat,
  Clock3,
  MessageCircle,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Store,
  Users
} from "lucide-react";
import { MarketingHeader } from "./marketing-header";

export const SiteUrl = "https://qrave.app";

export const Features = [
  {
    title: "QR menu ordering",
    text: "Customers scan, browse your live menu, and place table orders from their phone.",
    icon: QrCode
  },
  {
    title: "Live order flow",
    text: "Staff can see new orders, update kitchen status, and keep service moving during busy hours.",
    icon: ChefHat
  },
  {
    title: "Customer list",
    text: "Qrave remembers customers, visits, total spend, favorite items, and last order activity.",
    icon: Users
  },
  {
    title: "WhatsApp follow-up",
    text: "Message opted-in customers with repeat visit reminders, offers, and favorite item prompts.",
    icon: MessageCircle
  },
  {
    title: "Branch-wise control",
    text: "Manage menus, tables, QR codes, reports, and customer data for each restaurant branch.",
    icon: Store
  },
  {
    title: "Simple reports",
    text: "Track orders, repeat customers, customer value, and menu performance without spreadsheets.",
    icon: BarChart3
  }
];

export const FaqItems = [
  {
    question: "What is Qrave?",
    answer:
      "Qrave is QR menu software for restaurants and cafes. It helps owners create digital menus, accept table orders, manage live orders, capture customer WhatsApp numbers, and bring customers back with simple marketing messages."
  },
  {
    question: "Is Qrave a QR menu ordering system?",
    answer: "Yes. Qrave lets restaurants print QR codes for tables so customers can scan, view the menu, and place orders from their own phone."
  },
  {
    question: "Do customers need to install an app?",
    answer: "No. Customers open the QR menu in their browser after scanning the table QR code."
  },
  {
    question: "Can Qrave help with WhatsApp marketing?",
    answer:
      "Yes. Qrave can save opted-in customer WhatsApp numbers and help restaurant teams send simple follow-up messages for offers and repeat visits."
  },
  {
    question: "Can I manage multiple branches?",
    answer: "Yes. Qrave is designed for branch-wise menus, tables, orders, customers, and reports."
  },
  {
    question: "Can I update menu items anytime?",
    answer: "Yes. Restaurant teams can update item names, prices, availability, images, offers, and table QR settings from the admin panel."
  },
  {
    question: "Is Qrave useful for cafes and cloud kitchens?",
    answer: "Yes. Qrave works for restaurants, cafes, cloud kitchens, quick-service restaurants, food courts, and hotel restaurants."
  }
];

export const UseCases = ["Restaurants", "Cafes", "Cloud kitchens", "Food courts", "QSR brands", "Hotel restaurants"];

export const HowItWorks = [
  "Create your menu",
  "Print QR codes for tables",
  "Customers scan and order",
  "Staff manage live orders",
  "Qrave saves customers for repeat visits"
];

export const PricingBullets = [
  "Digital QR menu and table QR codes",
  "Live orders and kitchen status",
  "Customer list with visit and spend history",
  "WhatsApp-ready customer follow-up",
  "Branch-wise menu, table, and report management"
];

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main id="top" className="min-h-screen bg-surface text-on-surface">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </main>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-black px-5 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1560px] py-20">
        <div className="grid gap-10 border-b border-white/10 pb-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/50">Qrave for restaurants</p>
            <h2 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.92] tracking-[-0.04em] md:text-7xl">
              A cleaner way to run QR orders after the scan.
            </h2>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-white/60">
              Give guests a fast menu, give staff a live order board, and keep customer history ready for the next visit.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/admin/register" className="inline-flex justify-center rounded-full bg-white px-6 py-3 text-sm font-extrabold text-black transition hover:bg-[#d8f1df]">
                Start free
              </Link>
              <Link href="/contact" className="inline-flex justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-extrabold text-white transition hover:border-white hover:bg-white/[0.08]">
                Contact sales
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <QrCode size={24} className="text-[#d8f1df]" />
              <p className="mt-8 text-3xl font-extrabold tracking-[-0.04em]">QR</p>
              <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.12em] text-white/40">menu ordering</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <Clock3 size={24} className="text-[#f6e1bf]" />
              <p className="mt-8 text-3xl font-extrabold tracking-[-0.04em]">Live</p>
              <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.12em] text-white/40">service board</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <Users size={24} className="text-[#d9e8ff]" />
              <p className="mt-8 text-3xl font-extrabold tracking-[-0.04em]">CRM</p>
              <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.12em] text-white/40">guest records</p>
            </div>
          </div>
        </div>

        <div className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.15fr_0.7fr_0.7fr_0.7fr]">
          <div>
            <div className="flex items-center gap-3">
              <QraveMark compact className="h-11 w-11 shrink-0" />
              <span className="text-2xl font-extrabold text-white">Qrave</span>
            </div>
            <p className="mt-5 max-w-md text-sm font-semibold leading-7 text-white/60">
              QR menu ordering, live restaurant operations, and customer follow-up software for restaurants, cafes, QSR teams, and cloud kitchens.
            </p>
            <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-white/40">Built for table service, counters, cafes, and cloud kitchens.</p>
          </div>
          <FooterColumn title="Restaurant" links={[["Overview", "/#overview"], ["Food businesses", "/#businesses"], ["Operations", "/#operations"], ["FAQ", "/#faq"]]} />
          <FooterColumn title="Product" links={[["QR tools", "/#tools"], ["Pricing", "/pricing"], ["Create account", "/admin/register"], ["Admin login", "/admin/login"]]} />
          <FooterColumn title="Company" links={[["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["Back to top", "#top"]]} />
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-6 text-xs font-bold text-white/40 md:flex-row md:items-center md:justify-between">
          <p>Copyright 2026 Qrave. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ links, title }: { links: Array<[string, string]>; title: string }) {
  return (
    <div>
      <p className="text-sm font-extrabold text-white">{title}</p>
      <div className="mt-5 grid gap-3 text-sm font-semibold text-white/60">
        {links.map(([label, href]) => (
          <Link key={label} href={href} className="transition hover:text-white">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function QraveMark({ className = "h-11 w-11 shrink-0", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <img
      src={compact ? "/brand/qrave-icon-mark-transparent.png" : "/brand/qrave-icon-mark-transparent.png"}
      alt="Qrave logo mark"
      className={className}
    />
  );
}

export function SectionHeader({ eyebrow, title, text }: { eyebrow?: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? <p className="text-sm font-extrabold uppercase text-secondary">{eyebrow}</p> : null}
      <h2 className="mt-3 text-3xl font-extrabold text-primary md:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-on-surface-variant">{text}</p>
    </div>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-on-surface-variant">
          <Check className="mt-0.5 shrink-0 text-secondary" size={18} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function FeatureGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Features.map((feature) => {
        const Icon = feature.icon;
        return (
          <article key={feature.title} className="rounded-lg border border-outline-variant bg-white p-5 shadow-soft-saas">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary-container text-secondary">
              <Icon size={20} />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-primary">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{feature.text}</p>
          </article>
        );
      })}
    </div>
  );
}

export function ProductVisual() {
  return (
    <div className="rounded-lg border border-outline-variant bg-white p-4 shadow-soft-saas">
      <div className="flex items-center justify-between border-b border-outline-variant/70 pb-3">
        <div>
          <p className="text-xs font-bold uppercase text-on-surface-variant">Live orders</p>
          <p className="mt-1 text-lg font-extrabold text-primary">Table service dashboard</p>
        </div>
        <span className="rounded-md bg-secondary-container px-3 py-1 text-xs font-extrabold text-on-secondary-container">12 active</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.82fr]">
        <div className="grid gap-3">
          {["Table 4", "Table 8", "Pickup"].map((table, index) => (
            <div key={table} className="rounded-lg border border-outline-variant/70 bg-surface-container-low p-3">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-on-surface">{table}</p>
                <span className="text-xs font-bold text-primary">{index === 0 ? "Preparing" : index === 1 ? "New" : "Ready"}</span>
              </div>
              <p className="mt-2 text-sm text-on-surface-variant">{index === 0 ? "2 masala dosa, 1 cold coffee" : index === 1 ? "Paneer wrap, fries" : "Veg burger combo"}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-primary p-4 text-white">
          <div className="mx-auto grid h-28 w-28 grid-cols-5 gap-1 rounded-md bg-white p-2">
            {Array.from({ length: 25 }).map((_, index) => (
              <span key={index} className={index % 3 === 0 || index === 6 || index === 18 ? "rounded-[2px] bg-primary" : "rounded-[2px] bg-surface-container"} />
            ))}
          </div>
          <p className="mt-4 text-center text-sm font-bold">Scan. Order. Return.</p>
        </div>
      </div>
    </div>
  );
}

export function HeroCollage() {
  return <ProductVisual />;
}

export function TrustStrip() {
  return (
    <section className="border-y border-outline-variant bg-white">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="flex items-center gap-3 text-sm font-bold text-on-surface">
          <ScanLine className="text-secondary" size={20} />
          Built for table QR ordering
        </div>
        <div className="flex items-center gap-3 text-sm font-bold text-on-surface">
          <Smartphone className="text-secondary" size={20} />
          No customer app needed
        </div>
        <div className="flex items-center gap-3 text-sm font-bold text-on-surface">
          <ShieldCheck className="text-secondary" size={20} />
          Consent-first WhatsApp follow-up
        </div>
      </div>
    </section>
  );
}

export function ClockNote() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-outline-variant bg-white px-3 py-2 text-sm font-bold text-on-surface-variant">
      <Clock3 size={16} className="text-secondary" />
      Launch with a simple setup, improve every week.
    </div>
  );
}
