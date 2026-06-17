import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Check,
  ChefHat,
  Clock3,
  CreditCard,
  Megaphone,
  MessageCircle,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Store,
  TabletSmartphone,
  Utensils,
  Users
} from "lucide-react";
import { FaqItems, PageShell, SiteUrl } from "./marketing";
import { LandingMotion } from "./landing-motion";

export const metadata: Metadata = {
  title: "Qrave | QR Menu Ordering for Real Restaurant Service",
  description:
    "Qrave helps restaurants run QR menus, table orders, waiter calls, live kitchen status, and customer follow-up from one practical workspace.",
  alternates: { canonical: SiteUrl },
  keywords: [
    "restaurant QR ordering",
    "QR menu software",
    "digital menu for restaurants",
    "restaurant customer CRM",
    "restaurant ordering software"
  ],
  openGraph: {
    title: "Qrave | QR Menu Ordering for Real Restaurant Service",
    description: "QR menus, live table orders, waiter calls, and customer history for restaurants that need service to run cleanly.",
    url: SiteUrl,
    siteName: "Qrave",
    type: "website"
  }
};

// Add your real assets under src/frontend/public/landing and replace these paths.
const landingImages = {
  hero: "",
  quickService: "",
  fullService: "",
  cafe: "",
  cloudKitchen: "",
  menu: "",
  operations: "",
  customers: ""
};

const businessTypes = [
  {
    title: "Quick-service",
    text: "Keep dine-in QR orders, pickup orders, and counter tickets in one queue.",
    image: landingImages.quickService,
    accent: "bg-[#d8f1df]"
  },
  {
    title: "Full-service",
    text: "Let guests order from the table while staff handle requests and kitchen status.",
    image: landingImages.fullService,
    accent: "bg-[#f6e1bf]"
  },
  {
    title: "Cafes",
    text: "Update combos, seasonal specials, item photos, and repeat-visit offers fast.",
    image: landingImages.cafe,
    accent: "bg-[#d9e8ff]"
  },
  {
    title: "Cloud kitchens",
    text: "Control menu availability, pickup flow, customer records, and outlet reports.",
    image: landingImages.cloudKitchen,
    accent: "bg-[#efe4ff]"
  }
];

const productTools = [
  {
    title: "QR menu ordering",
    text: "Table-specific QR pages with categories, photos, add-ons, notes, and live availability.",
    icon: QrCode
  },
  {
    title: "Live order board",
    text: "Tickets move from new to preparing to ready, with waiter calls visible beside orders.",
    icon: ChefHat
  },
  {
    title: "Guest records",
    text: "Store visit count, spend, favorites, feedback, and consent for follow-up.",
    icon: Users
  },
  {
    title: "Owner view",
    text: "Track orders, unavailable items, repeat customers, and branch-level performance.",
    icon: BarChart3
  }
];

const stats = [
  { value: "00", label: "apps guests need to install" },
  { value: "12", label: "sample table QR codes ready from setup" },
  { value: "04", label: "service views: menu, orders, kitchen, guests" },
  { value: "01", label: "workspace for branch owners and staff" }
];

const featureRows = [
  {
    eyebrow: "Digital ordering",
    title: "A table QR menu that still feels managed by your team",
    text:
      "Guests see the current menu, not yesterday's PDF. Staff can mark items unavailable, add offers, and receive table-aware orders without asking customers to download an app.",
    image: landingImages.menu,
    visual: "menu" as const,
    icon: Smartphone,
    bullets: ["Separate QR per table", "Item availability switch", "Add-ons, notes, and offers"]
  },
  {
    eyebrow: "Restaurant operations",
    title: "One board for orders, prep, and waiter calls",
    text:
      "During rush hour, staff need fewer places to check. Qrave keeps new orders, kitchen status, ready items, and table requests in one operational view.",
    image: landingImages.operations,
    visual: "operations" as const,
    icon: BellRing,
    bullets: ["Live table tickets", "Kitchen status updates", "Open waiter calls"],
    reverse: true
  },
  {
    eyebrow: "Repeat customers",
    title: "Remember guests after they leave the table",
    text:
      "Every order can become useful customer context: visit count, favorite items, total spend, feedback, and WhatsApp consent for practical follow-up.",
    image: landingImages.customers,
    visual: "customers" as const,
    icon: MessageCircle,
    bullets: ["Visit and spend history", "Favorite item signals", "Consent-first follow-up"]
  }
];

const operatingStack = [
  ["Menu manager", "Categories, items, photos, prices, offers, add-ons, and availability."],
  ["Table QR setup", "Printable table codes tied to the correct branch and table number."],
  ["Order desk", "A staff-friendly board for new, preparing, ready, and completed tickets."],
  ["Guest profiles", "Customer names, phone consent, visits, spend, favorites, and feedback."],
  ["Branch reports", "Daily revenue, order status mix, repeat guests, and menu activity."],
  ["Staff access", "Focused views for owners, managers, waiters, and kitchen teams."]
];

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Qrave",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "QR menu ordering, live operations, and customer CRM software for food service businesses.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "Start free"
  }
};

export default function LandingPage() {
  return (
    <PageShell>
      <LandingMotion />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <section className="relative overflow-hidden bg-[#f7f6f2] pt-28 text-[#050505]">
        <div className="absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(circle_at_50%_20%,#e1f3d5_0%,#f3e0b9_34%,#f7f6f2_72%)]" />
        <div className="relative mx-auto max-w-[1560px] px-5 pb-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl text-center">
            <p className="landing-reveal text-xs font-extrabold uppercase tracking-[0.22em] text-[#4b4b4b]" style={{ animationDelay: "40ms" }}>
              Built for QR-first restaurant service
            </p>
            <h1 className="landing-reveal mx-auto mt-7 max-w-6xl text-[4.4rem] font-extrabold leading-[0.85] tracking-[-0.04em] sm:text-[6.5rem] lg:text-[9rem]" style={{ animationDelay: "140ms" }}>
              Power your restaurant with Qrave
            </h1>
            <p className="landing-reveal mx-auto mt-8 max-w-3xl text-lg font-semibold leading-8 text-[#3f3f3f] md:text-xl" style={{ animationDelay: "260ms" }}>
              Manage QR orders, keep kitchen and waiter teams in sync, update menus, and bring guests back with customer history built from every visit.
            </p>
            <div className="landing-reveal mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "360ms" }}>
              <Link href="/contact" className="inline-flex min-w-36 items-center justify-center rounded-full border border-[#050505] bg-white px-6 py-3 text-sm font-extrabold text-[#050505] transition hover:bg-[#f0eee8]">
                Contact sales
              </Link>
              <Link href="/admin/register" className="inline-flex min-w-36 items-center justify-center rounded-full bg-[#050505] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#1e5636]">
                Get started
              </Link>
            </div>
          </div>

          <div data-hero-wake="" className="landing-hero-wake relative mx-auto mt-14 max-w-7xl overflow-hidden rounded-[1.4rem] border border-black/10 bg-black p-2 shadow-[0_28px_100px_rgba(0,0,0,0.22)]">
            <ImageReadyFrame src={landingImages.hero} alt="Qrave restaurant operations dashboard" className="h-[28rem] rounded-[1rem] border-0 bg-[#0b0d0c] shadow-none md:h-[42rem]">
              <HeroProductVisual />
            </ImageReadyFrame>
          </div>
        </div>
      </section>

      <section id="overview" className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div data-landing-reveal="" className="landing-scroll-reveal mx-auto grid max-w-[1560px] gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#707070]">Overview</p>
            <h2 className="mt-5 max-w-3xl text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-7xl">
              Built around what happens during a shift
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              "A customer at Table 8 scans, orders two items, and asks for water from the same page.",
              "Kitchen sees the ticket as new, marks it preparing, then ready for the waiter.",
              "Owner changes an item price or marks a dish unavailable before lunch service.",
              "Customer details, consent, spend, and favorite items are saved for later follow-up."
            ].map((item) => (
              <div key={item} data-landing-reveal="" className="landing-scroll-reveal border-t border-[#cfcfcf] pt-5 text-lg font-semibold leading-7 text-[#333]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="businesses" className="bg-[#f7f6f2] px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1560px]">
          <div data-landing-reveal="" className="landing-scroll-reveal">
            <SectionHeading eyebrow="Food businesses" title="Different service styles, the same operating core" />
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {businessTypes.map((item) => (
              <BusinessCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section id="tools" className="bg-black px-5 py-24 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1560px]">
          <div data-landing-reveal="" className="landing-scroll-reveal grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#bdbdbd]">Qrave tools</p>
              <h2 className="mt-5 max-w-3xl text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] text-white md:text-7xl">
                The parts restaurant teams open every day
              </h2>
            </div>
            <p className="max-w-2xl text-lg font-semibold leading-8 text-white/70">
              Qrave is not just a prettier menu. It gives owners and staff the working screens they need before, during, and after service.
            </p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-white/12 bg-white/12 md:grid-cols-2 lg:grid-cols-4">
            {productTools.map((tool) => (
              <ProductTool key={tool.title} {...tool} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1560px] gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.value} data-landing-reveal="" className="landing-scroll-reveal landing-count-card border-t border-[#cfcfcf] pt-6">
              <p className="relative text-6xl font-extrabold leading-none tracking-[-0.05em] text-[#050505] md:text-8xl">{stat.value}</p>
              <p className="mt-4 max-w-xs text-base font-extrabold leading-6 text-[#444]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white px-5 pb-24 sm:px-8 lg:px-12">
        <div data-landing-reveal="" className="landing-scroll-reveal mx-auto grid max-w-[1560px] overflow-hidden rounded-xl border border-[#d8d8d8] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-[#f7f6f2] p-7 md:p-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#707070]">First week setup</p>
            <h2 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-6xl">
              Start with one branch, one menu, and the tables you already have
            </h2>
            <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-[#555]">
              The page should feel real because the product flow is real: configure branch details, publish menu items, print table QR codes, and let staff work from the order board.
            </p>
          </div>
          <div className="grid gap-px bg-[#d8d8d8] md:grid-cols-2">
            {[
              ["Day 1", "Add branch profile, logo, GST/tax notes, and order settings."],
              ["Day 2", "Create categories, upload food photos, and set item availability."],
              ["Day 3", "Print table QR codes and test the customer ordering flow."],
              ["Day 4", "Train staff on new orders, kitchen status, and waiter calls."]
            ].map(([day, text]) => (
              <article key={day} data-landing-reveal="" className="landing-scroll-reveal bg-white p-7">
                <p className="text-sm font-extrabold text-[#707070]">{day}</p>
                <p className="mt-3 text-lg font-extrabold leading-7 text-[#050505]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="operations" className="bg-[#f7f6f2] px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1560px]">
          <div data-landing-reveal="" className="landing-scroll-reveal">
            <SectionHeading eyebrow="Operations" title="Restaurant workflows, built for the rush" centered />
          </div>
          <div className="mt-12 grid gap-8">
            {featureRows.map((feature) => (
              <FeatureRow key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1560px] gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div data-landing-reveal="" className="landing-scroll-reveal">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#707070]">Platform stack</p>
            <h2 className="mt-5 max-w-2xl text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-7xl">
              Start with QR. Grow into a complete restaurant system.
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[#d8d8d8] bg-[#d8d8d8] md:grid-cols-2">
            {operatingStack.map(([title, text]) => (
              <article key={title} data-landing-reveal="" className="landing-scroll-reveal bg-white p-7">
                <h3 className="text-2xl font-extrabold tracking-[-0.02em] text-[#050505]">{title}</h3>
                <p className="mt-4 text-sm font-semibold leading-6 text-[#555]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#f7f6f2] px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1080px]">
          <div data-landing-reveal="" className="landing-scroll-reveal">
            <SectionHeading eyebrow="FAQ" title="Questions restaurant teams ask" centered />
          </div>
          <div className="mt-10 divide-y divide-[#cfcfcf] border-y border-[#cfcfcf]">
            {FaqItems.slice(0, 5).map((item) => (
              <article key={item.question} data-landing-reveal="" className="landing-scroll-reveal grid gap-4 py-7 md:grid-cols-[0.42fr_0.58fr]">
                <h3 className="text-xl font-extrabold tracking-[-0.02em] text-[#050505]">{item.question}</h3>
                <p className="text-base font-semibold leading-7 text-[#4b4b4b]">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black px-5 py-24 text-white sm:px-8 lg:px-12">
        <div data-landing-reveal="" className="landing-scroll-reveal mx-auto grid max-w-[1560px] gap-10 lg:grid-cols-[0.95fr_0.75fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#bdbdbd]">Ready for service?</p>
            <h2 className="mt-5 max-w-5xl text-5xl font-extrabold leading-[0.9] tracking-[-0.04em] md:text-8xl">
              See what your first Qrave branch would look like.
            </h2>
            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-white/68">
              Start with a real branch setup: tables, menu categories, sample order flow, and the staff screens your team would use during service.
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 text-black md:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#707070]">Demo setup checklist</p>
            <div className="mt-5 grid gap-3">
              {[
                ["Restaurant name", "Urban Tadka"],
                ["Branch", "Civil Lines"],
                ["Tables", "12 QR codes"],
                ["Menu sample", "32 active items"]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-[#d8d8d8] px-4 py-3">
                  <span className="text-sm font-extrabold text-[#707070]">{label}</span>
                  <span className="text-sm font-extrabold text-[#050505]">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href="/admin/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#1f1f1f]">
                Create account
                <ArrowRight size={17} />
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center rounded-full border border-black px-6 py-3 text-sm font-extrabold text-black transition hover:bg-[#f7f6f2]">
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function BusinessCard({ accent, image, text, title }: { accent: string; image: string; text: string; title: string }) {
  return (
    <article data-landing-reveal="" className="landing-scroll-reveal landing-hover-lift group overflow-hidden rounded-xl border border-[#d8d8d8] bg-white">
      <ImageReadyFrame src={image} alt={`${title} restaurant setup`} className={`h-[24rem] rounded-none border-0 shadow-none ${accent}`}>
        <BusinessVisual title={title} />
      </ImageReadyFrame>
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-2xl font-extrabold tracking-[-0.03em] text-[#050505]">{title}</h3>
          <ArrowRight size={20} className="transition group-hover:translate-x-1" />
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-[#555]">{text}</p>
      </div>
    </article>
  );
}

function ProductTool({ icon: Icon, text, title }: { icon: LucideIcon; text: string; title: string }) {
  return (
    <article data-landing-reveal="" className="landing-scroll-reveal landing-hover-lift bg-[#111] p-7">
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-white text-black">
        <Icon size={22} />
      </div>
      <h3 className="mt-8 text-2xl font-extrabold tracking-[-0.03em] text-white">{title}</h3>
      <p className="mt-4 text-sm font-semibold leading-6 text-white/62">{text}</p>
    </article>
  );
}

function FeatureRow({
  bullets,
  eyebrow,
  icon: Icon,
  image,
  reverse = false,
  text,
  title,
  visual
}: {
  bullets: string[];
  eyebrow: string;
  icon: LucideIcon;
  image: string;
  reverse?: boolean;
  text: string;
  title: string;
  visual: "menu" | "operations" | "customers";
}) {
  return (
    <article data-landing-reveal="" className="landing-scroll-reveal grid overflow-hidden rounded-xl border border-[#d8d8d8] bg-white lg:grid-cols-2">
      <div className={reverse ? "lg:order-2" : ""}>
        <ImageReadyFrame src={image} alt={`${title} screenshot`} className="h-[34rem] rounded-none border-0 bg-[#e8efe7] shadow-none lg:h-full">
          <FeatureVisual visual={visual} />
        </ImageReadyFrame>
      </div>
      <div className={`flex min-h-[34rem] flex-col justify-center p-7 md:p-12 ${reverse ? "lg:order-1" : ""}`}>
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-black text-white">
          <Icon size={22} />
        </div>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-[#707070]">{eyebrow}</p>
        <h3 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[0.98] tracking-[-0.04em] md:text-6xl">{title}</h3>
        <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-[#555]">{text}</p>
        <div className="mt-8 grid gap-3">
          {bullets.map((bullet) => (
            <div key={bullet} className="flex items-center gap-3 text-sm font-extrabold text-[#050505]">
              <Check size={18} />
              {bullet}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function ImageReadyFrame({
  alt,
  children,
  className = "",
  src
}: {
  alt: string;
  children: ReactNode;
  className?: string;
  src: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-[#d8d8d8] shadow-[0_18px_60px_rgba(0,0,0,0.08)] ${className}`}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : children}
    </div>
  );
}

function HeroProductVisual() {
  return (
    <div className="relative h-full bg-[#101312] p-5 text-white md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(136,226,173,0.28),transparent_36%),radial-gradient(circle_at_10%_80%,rgba(246,225,191,0.2),transparent_32%)]" />
      <div className="relative grid h-full gap-5 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="rounded-xl bg-white p-4 text-black md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#d8d8d8] pb-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#707070]">Urban Tadka - Civil Lines</p>
              <h3 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Saturday dinner board</h3>
            </div>
            <div className="flex gap-2">
              {["Orders", "Menu", "Tables"].map((tab, index) => (
                <span key={tab} className={index === 0 ? "rounded-full bg-black px-4 py-2 text-xs font-extrabold text-white" : "rounded-full bg-[#f0eee8] px-4 py-2 text-xs font-extrabold text-[#555]"}>
                  {tab}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              ["#184", "Table 4", "Preparing", "Paneer tikka bowl x2, butter naan x4", "12 min"],
              ["#185", "Table 9", "New", "Veg thali x1, cold coffee x2", "now"],
              ["#186", "Table 2", "Waiter call", "Water refill requested", "2 min"],
              ["#187", "Pickup", "Ready", "Veg burger combo x1", "ready"]
            ].map(([id, table, status, order, time], index) => (
              <div key={id} className="landing-live-ticket grid gap-3 rounded-lg border border-[#d8d8d8] p-4 sm:grid-cols-[0.16fr_0.2fr_0.22fr_1fr_0.16fr] sm:items-center" style={{ animationDelay: `${index * 180}ms` }}>
                <p className="font-extrabold text-[#707070]">{id}</p>
                <p className="font-extrabold">{table}</p>
                <p className={status === "New" || status === "Waiter call" ? "text-sm font-extrabold text-[#cc4b00]" : "text-sm font-extrabold text-[#0b7a37]"}>{status}</p>
                <p className="text-sm font-semibold text-[#555]">{order}</p>
                <p className="text-xs font-extrabold text-[#707070]">{time}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 border-t border-[#d8d8d8] pt-4 sm:grid-cols-3">
            {[
              ["Rs. 18,420", "today's QR orders"],
              ["6", "open tickets"],
              ["3", "items unavailable"]
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg bg-[#f7f6f2] p-4">
                <p className="text-2xl font-extrabold tracking-[-0.04em]">{value}</p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.12em] text-[#707070]">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden grid-rows-[1fr_1fr] gap-5 lg:grid">
          <div className="rounded-xl bg-[#d8f1df] p-6 text-black">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#31573b]">Guest profile</p>
              <MessageCircle size={22} />
            </div>
            <p className="mt-6 text-3xl font-extrabold tracking-[-0.04em]">Priya Sharma</p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {["4 visits", "Rs. 3.8k", "Opt-in"].map((item) => (
                <span key={item} className="rounded-md bg-white px-2 py-2 text-center text-xs font-extrabold text-[#31573b]">
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm font-extrabold text-[#31573b]">Favorite item: Cold coffee</p>
          </div>
          <div className="rounded-xl bg-[#f6e1bf] p-6 text-black">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b4618]">Table 12 QR</p>
              <QrCode size={24} />
            </div>
            <QrPattern />
            <p className="mt-5 text-sm font-extrabold text-[#6b4618]">Printed once. Menu updates anytime.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessVisual({ title }: { title: string }) {
  const Icon = title === "Cafes" ? CreditCard : title === "Cloud kitchens" ? Store : title === "Full-service" ? Utensils : ScanLine;
  return (
    <div data-scroll-float="" className="landing-scroll-float relative flex h-full flex-col justify-between p-6">
      <div className="absolute inset-x-6 top-6 h-36 rounded-t-[2rem] bg-black/10" />
      <div className="relative mx-auto mt-2 h-48 w-36 overflow-hidden rounded-[2rem] border-[8px] border-black bg-white shadow-xl">
        <div className="bg-black px-3 py-3 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/60">{title}</p>
          <p className="mt-2 text-sm font-extrabold leading-tight">{title === "Cafes" ? "Today specials" : title === "Cloud kitchens" ? "Pickup queue" : "Table orders"}</p>
        </div>
        <div className="grid gap-2 p-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="rounded-md border border-black/10 p-2">
              <div className="h-2 w-16 rounded-full bg-black/70" />
              <div className="mt-2 h-2 w-20 rounded-full bg-black/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="relative rounded-xl bg-white/88 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={18} />
            <p className="text-sm font-extrabold text-[#050505]">{title}</p>
          </div>
          <span className="rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">Live</span>
        </div>
        <p className="mt-3 text-xs font-bold leading-5 text-[#555]">{title === "Full-service" ? "8 active tables" : title === "Quick-service" ? "14 tickets today" : title === "Cafes" ? "5 combos live" : "9 pickups queued"}</p>
      </div>
    </div>
  );
}

function FeatureVisual({ visual }: { visual: "menu" | "operations" | "customers" }) {
  if (visual === "operations") {
    return (
      <div data-scroll-float="" className="landing-scroll-float flex h-full items-center bg-[#d9e8ff] p-6">
        <div className="mx-auto w-full max-w-xl rounded-xl bg-white p-5">
          <div className="flex items-center justify-between border-b border-[#d8d8d8] pb-4">
            <h4 className="text-2xl font-extrabold tracking-[-0.03em]">Kitchen board</h4>
            <Clock3 size={22} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {["New", "Preparing", "Ready"].map((column, columnIndex) => (
              <div key={column} className="rounded-lg bg-[#f7f6f2] p-3">
                <p className="text-sm font-extrabold">{column}</p>
                <div className="mt-3 grid gap-2">
                  {Array.from({ length: columnIndex === 0 ? 3 : 2 }).map((_, index) => (
                    <div key={`${column}-${index}`} className="rounded-md bg-white p-3 text-sm font-extrabold">
                      Table {index + columnIndex + 2}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (visual === "customers") {
    return (
      <div data-scroll-float="" className="landing-scroll-float grid h-full place-items-center bg-[#f6e1bf] p-6">
        <div className="grid w-full max-w-xl gap-4 sm:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl bg-black p-5 text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/58">Guest profile</p>
            <div className="mt-6 grid h-16 w-16 place-items-center rounded-full bg-white text-2xl font-extrabold text-black">P</div>
            <h4 className="mt-5 text-2xl font-extrabold">Priya Sharma</h4>
            <p className="mt-2 text-sm font-semibold text-white/62">4 visits - WhatsApp opt-in</p>
          </div>
          <div className="grid gap-3">
            {[
              [MessageCircle, "Return offer ready"],
              [Megaphone, "Favorite item campaign"],
              [ShieldCheck, "Consent captured"]
            ].map(([Icon, label]) => {
              const ItemIcon = Icon as LucideIcon;
              return (
                <div key={label as string} className="flex items-center gap-3 rounded-xl bg-white p-4">
                  <ItemIcon size={22} />
                  <span className="text-sm font-extrabold">{label as string}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-scroll-float="" className="landing-scroll-float grid h-full place-items-center bg-[#d8f1df] p-6">
      <div className="h-[28rem] w-[16rem] overflow-hidden rounded-[2rem] border-[10px] border-black bg-white shadow-2xl">
        <div className="bg-black p-4 text-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/56">Table 12</p>
          <h4 className="mt-4 text-2xl font-extrabold tracking-[-0.03em]">House specials</h4>
        </div>
        <div className="grid gap-3 p-4">
          {["Paneer bowl", "Veg burger", "Cold coffee"].map((item) => (
            <div key={item} className="grid grid-cols-[3rem_1fr] gap-3 rounded-lg border border-[#d8d8d8] p-2">
              <div className="rounded-md bg-[#f6e1bf]" />
              <div>
                <p className="text-sm font-extrabold">{item}</p>
                <div className="mt-2 h-2 w-20 rounded-full bg-black/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QrPattern() {
  return (
    <div className="landing-scan-line mt-7 grid h-28 w-28 grid-cols-5 gap-1 rounded-lg bg-white p-2">
      {Array.from({ length: 25 }).map((_, index) => (
        <span key={index} className={index % 3 === 0 || index === 7 || index === 18 ? "rounded-[2px] bg-black" : "rounded-[2px] bg-black/10"} />
      ))}
    </div>
  );
}

function SectionHeading({ centered = false, eyebrow, title }: { centered?: boolean; eyebrow: string; title: string }) {
  return (
    <div className={centered ? "mx-auto max-w-5xl text-center" : "max-w-5xl"}>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#707070]">{eyebrow}</p>
      <h2 className="mt-5 text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] text-[#050505] md:text-7xl">{title}</h2>
    </div>
  );
}
