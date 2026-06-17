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
    <main className="min-h-screen bg-surface text-on-surface">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </main>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-[#121614] px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 border-b border-white/10 pb-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-extrabold uppercase text-[#88e2ad]">Ready for service?</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight md:text-6xl">Launch your QR ordering and guest platform</h2>
            <p className="mt-5 max-w-xl text-base font-medium leading-8 text-white/62">
              Give guests a faster ordering experience and give owners a clearer view of orders, tables, customers, and repeat visits.
            </p>
          </div>
          <div className="flex items-end md:justify-end">
            <Link href="/admin/register" className="inline-flex items-center justify-center rounded-full bg-[#88e2ad] px-6 py-3 text-sm font-extrabold text-[#06281c] transition hover:bg-white">
              Start free
            </Link>
          </div>
        </div>

        <div className="grid gap-8 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <QraveMark compact className="h-11 w-11 shrink-0" />
              <span className="text-2xl font-extrabold text-white">Qrave</span>
            </div>
            <p className="mt-4 max-w-md text-sm font-medium leading-6 text-white/58">
              QR ordering, live restaurant operations, and customer follow-up software for restaurants, cafes, QSR teams, and cloud kitchens.
            </p>
          </div>
          <FooterColumn title="Product" links={[["Use cases", "/#use-cases"], ["Features", "/#features"], ["Product", "/#product"], ["Results", "/#results"]]} />
          <FooterColumn title="Company" links={[["Pricing", "/pricing"], ["Contact", "/contact"], ["FAQ", "/faq"], ["Privacy", "/privacy"]]} />
          <FooterColumn title="Workspace" links={[["Login", "/admin/login"], ["Create account", "/admin/register"], ["Admin panel", "/admin"]]} />
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-xs font-bold text-white/40 md:flex-row md:items-center md:justify-between">
          <p>Copyright 2026 Qrave. Restaurant operations, QR menus, and customer CRM.</p>
          <div className="flex gap-4">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
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
      <div className="mt-4 grid gap-3 text-sm font-semibold text-white/54">
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
  if (compact) {
    return (
      <svg className={className} viewBox="0 0 120 120" role="img" aria-label="Qrave logo mark" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="16" y="16" width="88" height="88" rx="24" fill="#20c77a" />
        <path d="M38 38h14v14H38V38Zm30 0h14v14H68V38ZM38 68h14v14H38V68Zm30 0h6v6h8v8H68V68Z" fill="#06281c" />
        <path d="M56 56h8v8h-8v-8Zm20 0h6v6h-6v-6ZM56 76h6v6h-6v-6Z" fill="#06281c" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 120 120" role="img" aria-label="Qrave logo mark" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="12" width="96" height="96" rx="28" fill="#075335" />
      <path d="M34 34h18v18H34V34Zm34 0h18v18H68V34ZM34 68h18v18H34V68Zm34 0h8v8h10v10H68V68Z" fill="#ffffff" />
      <path d="M56 56h10v10H56V56Zm22 0h8v8h-8v-8ZM56 78h8v8h-8v-8Z" fill="#88e2ad" />
    </svg>
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
