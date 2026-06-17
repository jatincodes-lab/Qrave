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
  MessageCircle,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TabletSmartphone,
  Users,
  Utensils
} from "lucide-react";
import { FaqItems, PageShell, SiteUrl } from "./marketing";

export const metadata: Metadata = {
  title: "Qrave | QR Ordering and Restaurant Guest Platform",
  description:
    "Qrave helps restaurants launch QR menus, accept table orders, manage live service, and bring guests back with customer data and follow-up workflows.",
  alternates: { canonical: SiteUrl },
  keywords: [
    "restaurant QR ordering",
    "QR menu software",
    "digital menu for restaurants",
    "restaurant guest platform",
    "restaurant customer CRM",
    "table ordering system"
  ],
  openGraph: {
    title: "Qrave | QR Ordering and Restaurant Guest Platform",
    description:
      "A modern QR ordering, live operations, and guest CRM platform for restaurants, cafes, QSRs, and cloud kitchens.",
    url: SiteUrl,
    siteName: "Qrave",
    type: "website"
  }
};

// Add your real files in src/frontend/public/landing and replace these paths.
const landingImages = {
  hero: "",
  menu: "",
  operations: "",
  guests: "",
  tableService: ""
};

const impactStats = [
  { value: "12 min", label: "saved per table turn with faster ordering and service signals" },
  { value: "3.2x", label: "more customer data captured than a printed menu flow" },
  { value: "24/7", label: "menu, QR, and order access for every active branch" },
  { value: "0 apps", label: "required for guests to scan, browse, order, and return" }
];

const restaurantTypes = [
  "Full service",
  "Quick service",
  "Cafes",
  "Cloud kitchens",
  "Food courts",
  "Hotel restaurants",
  "Bars",
  "Catering"
];

const featureRows = [
  {
    eyebrow: "Guest ordering",
    title: "A QR menu that feels like your restaurant, not a PDF",
    text:
      "Guests scan the table QR, browse categories, see offers and item photos, add notes, and place orders from their own phone.",
    image: landingImages.menu,
    visual: "menu" as const,
    icon: ScanLine,
    bullets: ["Live item availability", "Table-aware ordering", "Offer-ready menu sections"]
  },
  {
    eyebrow: "Service operations",
    title: "Turn every scan into a live signal for your team",
    text:
      "New orders, waiter calls, kitchen status, table activity, and branch notifications stay in one focused owner workspace.",
    image: landingImages.operations,
    visual: "operations" as const,
    icon: BellRing,
    bullets: ["Live order board", "Kitchen and ready status", "Waiter-call notifications"],
    reverse: true
  },
  {
    eyebrow: "Guest platform",
    title: "Build a repeat-guest engine from normal service",
    text:
      "Qrave saves customer visits, favorite items, spending history, and WhatsApp consent so restaurants can bring people back with relevant follow-up.",
    image: landingImages.guests,
    visual: "guests" as const,
    icon: Users,
    bullets: ["Visit and spend history", "Favorite item signals", "WhatsApp follow-up ready"]
  }
];

const platformCards = [
  {
    title: "Digital Bill and QR ordering",
    text: "Give guests a faster way to view the menu, order from the table, and request service without waiting.",
    icon: QrCode,
    accent: "bg-[#dff7e9] text-[#063522]"
  },
  {
    title: "Restaurant command center",
    text: "Keep live orders, branch setup, staff actions, menu updates, and customer records in one workspace.",
    icon: ChefHat,
    accent: "bg-[#fff1d8] text-[#5c3707]"
  },
  {
    title: "Customer growth loop",
    text: "Use order history and consent-first WhatsApp data to improve repeat visits and future campaigns.",
    icon: MessageCircle,
    accent: "bg-[#e6f0ff] text-[#113766]"
  }
];

const operatingPoints = [
  "Create a branch, table map, and QR codes",
  "Publish menu categories, item photos, and offers",
  "Accept table orders and waiter calls in real time",
  "Track customers, repeat visits, and branch performance"
];

const testimonials = [
  {
    quote:
      "The QR menu looks premium for guests, but the real value is that our team sees table orders and customer details in one place.",
    name: "Aarav Mehta",
    role: "Cafe owner"
  },
  {
    quote:
      "We stopped treating QR as only a menu. Qrave made it part of service, kitchen flow, and repeat customer follow-up.",
    name: "Riya Sharma",
    role: "Restaurant manager"
  },
  {
    quote:
      "For multiple outlets, the branch-wise setup is practical. Menus, orders, customers, and reports stay separated cleanly.",
    name: "Kabir Sethi",
    role: "QSR operator"
  }
];

const trustLabels = ["Independent cafes", "QSR outlets", "Food courts", "Cloud kitchens", "Fine dining", "Hotel restaurants"];

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Qrave",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "QR menu ordering, live restaurant operations, and customer CRM software for restaurants, cafes, QSRs, and cloud kitchens.",
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />

      <section className="relative isolate overflow-hidden bg-[#f4f0e7] text-[#171514]">
        <HeroBackdrop />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(244,240,231,0.97)_0%,rgba(244,240,231,0.9)_42%,rgba(244,240,231,0.52)_72%,rgba(244,240,231,0.2)_100%)]" />
        <div className="relative mx-auto flex min-h-[82svh] max-w-7xl flex-col justify-center px-4 pb-14 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="landing-reveal inline-flex items-center gap-2 rounded-full border border-[#d7cec0] bg-white/80 px-4 py-2 text-sm font-extrabold text-[#075335] shadow-soft-saas backdrop-blur">
              <Sparkles size={16} />
              Qrave restaurant guest platform
            </div>
            <h1 className="landing-reveal mt-7 max-w-4xl text-5xl font-extrabold leading-[0.96] text-[#171514] sm:text-6xl lg:text-7xl xl:text-8xl">
              QR ordering for busy restaurants
            </h1>
            <p className="landing-reveal mt-7 max-w-2xl text-base font-semibold leading-8 text-[#514d48] sm:text-lg">
              Launch a polished QR menu, accept table orders, manage live service, and turn everyday diners into repeat guests.
            </p>
            <div className="landing-reveal mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#171514] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#075335]"
              >
                Start free
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#171514]/20 bg-white/74 px-6 py-3 text-sm font-extrabold text-[#171514] backdrop-blur transition hover:bg-white"
              >
                Get a demo
              </Link>
            </div>
            <div className="landing-reveal mt-10 lg:hidden">
              <MobileHeroPreview />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e6dfd4] bg-white">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          {impactStats.map((stat) => (
            <div key={stat.value} className="border-b border-[#e6dfd4] py-7 md:border-b-0 md:border-r md:last:border-r-0">
              <p className="text-4xl font-extrabold text-[#075335] md:text-5xl">{stat.value}</p>
              <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-[#5f5a53]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="use-cases" className="bg-[#f9fbf7] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <SectionIntro
              eyebrow="Built for food service"
              title="Designed for every service style"
              text="Qrave keeps the experience simple for guests and operationally useful for owners, whether service happens at tables, counters, hotels, food courts, or cloud kitchens."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {restaurantTypes.map((type) => (
                <div key={type} className="rounded-lg border border-[#dfe8da] bg-white px-4 py-4 text-sm font-extrabold text-[#171514] shadow-soft-saas">
                  {type}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="Platform"
            title="A modern restaurant stack after the QR scan"
            text="The layout is inspired by the strong product storytelling of Square and sunday, while the content and visuals are built around Qrave's restaurant workflow."
            centered
          />
          <div className="mt-14 grid gap-8">
            {featureRows.map((feature) => (
              <FeatureRow key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="bg-[#121614] px-4 py-24 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <SectionIntro
              eyebrow="One platform"
              title="Every check becomes a useful data point"
              text="Qrave connects ordering, service, and guest history so restaurants can move faster today and make smarter follow-up decisions tomorrow."
              dark
            />
            <div className="grid gap-4 md:grid-cols-3">
              {platformCards.map((card) => (
                <PlatformCard key={card.title} {...card} />
              ))}
            </div>
          </div>

          <div className="mt-14 grid gap-8 border-t border-white/12 pt-12 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
            <ImageReadyFrame src={landingImages.tableService} alt="Qrave table service dashboard screenshot" className="h-[34rem] bg-[#1a211e]">
              <CommandCenterVisual />
            </ImageReadyFrame>
            <div>
              <p className="text-sm font-extrabold uppercase text-[#88e2ad]">Operational setup</p>
              <h2 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">Print once, update every service</h2>
              <p className="mt-6 text-base font-semibold leading-8 text-white/68">
                Table QR cards can stay in the restaurant while menus, prices, item availability, offers, and workflows keep changing in the admin panel.
              </p>
              <div className="mt-8 grid gap-3">
                {operatingPoints.map((point, index) => (
                  <div key={point} className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm font-extrabold text-white">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#88e2ad] text-[#06281c]">{index + 1}</span>
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="results" className="bg-[#e8f4ff] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-extrabold uppercase text-[#113766]">Trusted restaurant workflows</p>
              <h2 className="mt-4 text-4xl font-extrabold leading-tight text-[#171514] md:text-6xl">
                Give guests speed and owners a clearer view
              </h2>
              <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-[#4b5b6c]">
                Qrave is designed for the two sides of restaurant growth: faster service in the moment and better customer memory after the visit.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {trustLabels.map((label) => (
                  <span key={label} className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[#113766] shadow-soft-saas">
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.map((item) => (
                <TestimonialCard key={item.name} {...item} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#f9fbf7] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.82fr] lg:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase text-[#075335]">Start free</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight text-[#171514] md:text-6xl">
              Launch the first table QR, then grow into the full platform
            </h2>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-[#5f5a53]">
              Start with QR menu ordering. Add live operations, customer CRM, analytics, and WhatsApp-ready follow-up as your restaurant expands.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#075335] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#171514]"
              >
                Create account
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-[#075335]/20 bg-white px-6 py-3 text-sm font-extrabold text-[#075335] transition hover:border-[#075335]/40"
              >
                View pricing
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-[#dfe8da] bg-white p-6 shadow-soft-saas">
            <p className="text-sm font-extrabold uppercase text-[#075335]">Included foundation</p>
            <div className="mt-5 grid gap-3">
              {[
                "Digital QR menu and table QR codes",
                "Live order board and waiter calls",
                "Branch-wise menu and table control",
                "Customer history and repeat guest signals",
                "Reports for orders, customers, and menu activity"
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-lg bg-[#f9fbf7] p-4 text-sm font-extrabold text-[#171514]">
                  <Check size={18} className="mt-0.5 shrink-0 text-[#0f8f57]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            eyebrow="FAQ"
            title="Questions restaurant teams ask"
            text="Short answers for owners deciding whether QR ordering and guest CRM fit their restaurant."
            centered
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {FaqItems.slice(0, 4).map((item) => (
              <article key={item.question} className="rounded-lg border border-[#dfe8da] bg-[#f9fbf7] p-6">
                <h3 className="text-lg font-extrabold text-[#171514]">{item.question}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#5f5a53]">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function MobileHeroPreview() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/70 bg-white/86 p-3 shadow-[0_20px_60px_rgba(15,35,26,0.16)] backdrop-blur">
      <div className="rounded-md bg-[#121614] p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase text-[#88e2ad]">Live table</p>
            <p className="mt-1 text-xl font-extrabold">Order #128</p>
          </div>
          <div className="grid h-12 w-12 grid-cols-4 gap-0.5 rounded-md bg-white p-1">
            {Array.from({ length: 16 }).map((_, index) => (
              <span key={index} className={index % 3 === 0 || index === 10 ? "rounded-[1px] bg-[#075335]" : "rounded-[1px] bg-[#dff7e9]"} />
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {["Paneer wrap", "Cold coffee", "Waiter call"].map((item, index) => (
            <div key={item} className="flex items-center justify-between rounded-md bg-white/[0.08] px-3 py-2">
              <span className="text-sm font-extrabold">{item}</span>
              <span className={index === 2 ? "text-xs font-extrabold text-[#f4c542]" : "text-xs font-extrabold text-[#88e2ad]"}>
                {index === 2 ? "open" : "sent"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] overflow-hidden lg:block" aria-hidden="true">
      <div className="absolute inset-0 bg-[#dff7e9]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[#cfe6f7]" />
      <div className="absolute left-12 top-28 h-[31rem] w-[49rem] rotate-[-3deg] rounded-lg border border-white/80 bg-white/78 p-4 shadow-[0_30px_90px_rgba(15,35,26,0.22)] backdrop-blur">
        <HeroDashboard />
      </div>
      <div className="absolute bottom-16 left-2 h-[24rem] w-[15rem] rotate-[6deg] rounded-[2rem] border-[10px] border-[#171514] bg-[#171514] shadow-[0_24px_70px_rgba(15,35,26,0.32)]">
        <MobileMenuVisual compact />
      </div>
      <div className="absolute bottom-20 right-14 w-72 rounded-lg border border-white/80 bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,35,26,0.18)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase text-[#075335]">Guest saved</p>
            <p className="mt-1 text-lg font-extrabold text-[#171514]">Priya Sharma</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[#dff7e9] text-[#075335]">
            <MessageCircle size={20} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {["4 visits", "Rs. 3.8k", "Opt-in"].map((item) => (
            <span key={item} className="rounded-md bg-[#f4f0e7] px-2 py-2 text-xs font-extrabold text-[#514d48]">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroDashboard() {
  return (
    <div className="h-full rounded-md bg-[#f9fbf7] p-4">
      <div className="flex items-center justify-between border-b border-[#dfe8da] pb-4">
        <div>
          <p className="text-xs font-extrabold uppercase text-[#075335]">Qrave live service</p>
          <p className="mt-1 text-2xl font-extrabold text-[#171514]">Orders, tables, and guests</p>
        </div>
        <div className="rounded-full bg-[#075335] px-4 py-2 text-xs font-extrabold text-white">18 active</div>
      </div>
      <div className="grid h-[calc(100%-4.5rem)] gap-4 pt-4 md:grid-cols-[1fr_0.72fr]">
        <div className="grid content-start gap-3">
          {[
            ["Table 4", "Preparing", "2 paneer wraps, fries, lime soda"],
            ["Table 9", "New", "1 thali, 2 cold coffees"],
            ["Pickup", "Ready", "Veg burger combo"]
          ].map(([table, status, order]) => (
            <div key={table} className="rounded-lg border border-[#dfe8da] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-[#171514]">{table}</p>
                <span className={status === "New" ? "text-xs font-extrabold text-[#c24f14]" : "text-xs font-extrabold text-[#0f8f57]"}>{status}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#5f5a53]">{order}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-[#121614] p-4 text-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase text-white/56">Today</p>
            <BarChart3 size={18} className="text-[#88e2ad]" />
          </div>
          <p className="mt-5 text-5xl font-extrabold">Rs. 42k</p>
          <p className="mt-2 text-sm font-semibold text-white/58">branch revenue tracked</p>
          <div className="mt-8 grid gap-3">
            {["Repeat guests", "Can message", "Avg. order"].map((label, index) => (
              <div key={label} className="flex items-center justify-between rounded-md bg-white/[0.07] px-3 py-2">
                <span className="text-xs font-semibold text-white/58">{label}</span>
                <span className="text-sm font-extrabold text-white">{index === 0 ? "184" : index === 1 ? "96" : "Rs. 420"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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
  visual: "menu" | "operations" | "guests";
}) {
  return (
    <article className="landing-rise grid overflow-hidden rounded-lg border border-[#dfe8da] bg-[#f9fbf7] shadow-soft-saas md:grid-cols-2">
      <div className={reverse ? "md:order-2" : ""}>
        <ImageReadyFrame src={image} alt={`${title} screenshot`} className="h-[30rem] rounded-none border-0 bg-[#eef6f1] shadow-none">
          <FallbackVisual visual={visual} />
        </ImageReadyFrame>
      </div>
      <div className={`flex flex-col justify-center p-6 md:p-10 ${reverse ? "md:order-1" : ""}`}>
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#dff7e9] text-[#075335]">
          <Icon size={22} />
        </div>
        <p className="mt-7 text-sm font-extrabold uppercase text-[#075335]">{eyebrow}</p>
        <h3 className="mt-3 text-3xl font-extrabold leading-tight text-[#171514] md:text-5xl">{title}</h3>
        <p className="mt-5 text-base font-semibold leading-8 text-[#5f5a53]">{text}</p>
        <div className="mt-7 grid gap-3">
          {bullets.map((bullet) => (
            <div key={bullet} className="flex items-center gap-3 text-sm font-extrabold text-[#171514]">
              <Check size={18} className="text-[#0f8f57]" />
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
    <div className={`relative overflow-hidden rounded-lg border border-[#dfe8da] shadow-soft-saas ${className}`}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : children}
    </div>
  );
}

function FallbackVisual({ visual }: { visual: "menu" | "operations" | "guests" }) {
  if (visual === "menu") {
    return <MobileMenuVisual />;
  }

  if (visual === "operations") {
    return <OperationsVisual />;
  }

  return <GuestLoopVisual />;
}

function MobileMenuVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${compact ? "h-full rounded-[1.35rem]" : "mx-auto flex h-full max-w-sm items-center p-6"} bg-[#dff7e9]`}>
      <div className={`${compact ? "h-full rounded-[1.35rem]" : "mx-auto h-[26rem] w-[15rem] rounded-[2rem] border-[10px] border-[#171514]"} overflow-hidden bg-white text-[#171514] shadow-[0_18px_50px_rgba(15,35,26,0.18)]`}>
        <div className="bg-[#075335] p-4 text-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase text-white/70">Table 12</p>
            <QrCode size={18} />
          </div>
          <h3 className="mt-4 text-2xl font-extrabold leading-tight">House specials</h3>
          <p className="mt-2 text-xs font-semibold text-white/72">Order now. Pay at counter or table.</p>
        </div>
        <div className="grid gap-3 p-4">
          {[
            ["Paneer tikka bowl", "Rs. 240"],
            ["Crispy veg burger", "Rs. 180"],
            ["Cold coffee", "Rs. 120"]
          ].map(([item, price], index) => (
            <div key={item} className="grid grid-cols-[3.25rem_1fr] gap-3 rounded-lg border border-[#dfe8da] p-2">
              <div className={["bg-[#fff1d8]", "bg-[#e8f4ff]", "bg-[#f1e6ff]"][index] + " rounded-md"} />
              <div>
                <p className="text-sm font-extrabold">{item}</p>
                <p className="mt-1 text-xs font-bold text-[#5f5a53]">{price}</p>
                <div className="mt-2 h-2 w-20 rounded-full bg-[#dff7e9]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OperationsVisual() {
  return (
    <div className="flex h-full items-center bg-[#e8f4ff] p-6">
      <div className="mx-auto w-full max-w-xl rounded-lg border border-[#cadff2] bg-white p-4 shadow-[0_20px_60px_rgba(17,55,102,0.16)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe8da] pb-4">
          <div>
            <p className="text-xs font-extrabold uppercase text-[#113766]">Kitchen view</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#171514]">Live order board</h3>
          </div>
          <span className="rounded-full bg-[#e8f4ff] px-4 py-2 text-xs font-extrabold text-[#113766]">7 new alerts</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {["New", "Preparing", "Ready"].map((column, columnIndex) => (
            <div key={column} className="rounded-lg bg-[#f9fbf7] p-3">
              <p className="text-sm font-extrabold text-[#171514]">{column}</p>
              <div className="mt-3 grid gap-2">
                {Array.from({ length: columnIndex === 0 ? 3 : 2 }).map((_, index) => (
                  <div key={`${column}-${index}`} className="rounded-md border border-[#dfe8da] bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#5f5a53]">Table {index + columnIndex + 3}</span>
                      <Clock3 size={14} className="text-[#c24f14]" />
                    </div>
                    <p className="mt-2 text-sm font-extrabold text-[#171514]">{index % 2 === 0 ? "2 items" : "4 items"}</p>
                    <div className="mt-2 h-2 rounded-full bg-[#dff7e9]">
                      <div className={columnIndex === 0 ? "h-2 w-1/3 rounded-full bg-[#c24f14]" : "h-2 w-2/3 rounded-full bg-[#0f8f57]"} />
                    </div>
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

function GuestLoopVisual() {
  return (
    <div className="flex h-full items-center bg-[#fff1d8] p-6">
      <div className="mx-auto grid w-full max-w-xl gap-4 md:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg bg-[#121614] p-5 text-white shadow-[0_20px_60px_rgba(92,55,7,0.16)]">
          <p className="text-xs font-extrabold uppercase text-[#f4c542]">Guest profile</p>
          <div className="mt-5 grid h-16 w-16 place-items-center rounded-full bg-[#dff7e9] text-2xl font-extrabold text-[#075335]">P</div>
          <h3 className="mt-5 text-2xl font-extrabold">Priya Sharma</h3>
          <p className="mt-2 text-sm font-semibold text-white/58">4 visits - favorite: cold coffee</p>
          <div className="mt-6 grid gap-3">
            {["Can message", "Last visit: 8 days", "Avg. order: Rs. 420"].map((item) => (
              <div key={item} className="rounded-md bg-white/[0.08] px-3 py-2 text-sm font-extrabold text-white/86">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="grid content-center gap-4">
          <div className="rounded-lg border border-[#ead7b4] bg-white p-5 shadow-soft-saas">
            <div className="flex items-center gap-3">
              <MessageCircle className="text-[#075335]" size={22} />
              <div>
                <p className="text-sm font-extrabold text-[#171514]">Repeat visit prompt</p>
                <p className="mt-1 text-xs font-semibold text-[#5f5a53]">Send a personalized offer after service.</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[#ead7b4] bg-white p-5 shadow-soft-saas">
            <div className="flex items-center gap-3">
              <Star className="text-[#c24f14]" size={22} />
              <div>
                <p className="text-sm font-extrabold text-[#171514]">Review signal</p>
                <p className="mt-1 text-xs font-semibold text-[#5f5a53]">Capture feedback while the visit is fresh.</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[#ead7b4] bg-white p-5 shadow-soft-saas">
            <div className="flex items-center gap-3">
              <CreditCard className="text-[#113766]" size={22} />
              <div>
                <p className="text-sm font-extrabold text-[#171514]">Spend history</p>
                <p className="mt-1 text-xs font-semibold text-[#5f5a53]">Know guest value branch by branch.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommandCenterVisual() {
  return (
    <div className="flex h-full items-center p-5">
      <div className="grid h-full w-full gap-4 rounded-md bg-[#f9fbf7] p-4 text-[#171514] md:grid-cols-[1fr_0.75fr]">
        <div className="grid content-start gap-3">
          <div className="rounded-lg bg-[#075335] p-5 text-white">
            <p className="text-xs font-extrabold uppercase text-white/64">Branch health</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                ["42", "orders"],
                ["18", "tables"],
                ["96", "opt-ins"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-md bg-white/10 p-3">
                  <p className="text-2xl font-extrabold">{value}</p>
                  <p className="mt-1 text-xs font-semibold text-white/62">{label}</p>
                </div>
              ))}
            </div>
          </div>
          {["Kitchen pressure", "Menu availability", "Waiter calls"].map((label, index) => (
            <div key={label} className="rounded-lg border border-[#dfe8da] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-extrabold">{label}</p>
                <span className="text-sm font-extrabold text-[#075335]">{index === 0 ? "Normal" : index === 1 ? "94%" : "3 open"}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#dfe8da]">
                <div className={index === 0 ? "h-2 w-2/5 rounded-full bg-[#f4c542]" : "h-2 w-4/5 rounded-full bg-[#0f8f57]"} />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-white p-4">
          <p className="text-sm font-extrabold text-[#171514]">Owner actions</p>
          <div className="mt-4 grid gap-3">
            {[
              [Utensils, "Update lunch combo"],
              [QrCode, "Print table QR pack"],
              [MessageCircle, "Prepare return offer"],
              [ShieldCheck, "Review consent list"]
            ].map(([Icon, label]) => {
              const ActionIcon = Icon as LucideIcon;
              return (
                <div key={label as string} className="flex items-center gap-3 rounded-md bg-[#f9fbf7] p-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-[#dff7e9] text-[#075335]">
                    <ActionIcon size={18} />
                  </span>
                  <span className="text-sm font-extrabold">{label as string}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({ accent, icon: Icon, text, title }: { accent: string; icon: LucideIcon; text: string; title: string }) {
  return (
    <article className="rounded-lg border border-white/12 bg-white/[0.04] p-5">
      <div className={`grid h-12 w-12 place-items-center rounded-lg ${accent}`}>
        <Icon size={22} />
      </div>
      <h3 className="mt-6 text-xl font-extrabold leading-tight text-white">{title}</h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-white/62">{text}</p>
    </article>
  );
}

function TestimonialCard({ name, quote, role }: { name: string; quote: string; role: string }) {
  return (
    <article className="rounded-lg border border-white/70 bg-white p-5 shadow-soft-saas">
      <div className="flex gap-1 text-[#f4a11f]">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} size={15} fill="currentColor" />
        ))}
      </div>
      <p className="mt-5 text-sm font-semibold leading-7 text-[#3d4854]">"{quote}"</p>
      <div className="mt-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#113766] text-sm font-extrabold text-white">{name.slice(0, 1)}</div>
        <div>
          <p className="text-sm font-extrabold text-[#171514]">{name}</p>
          <p className="text-xs font-bold text-[#4b5b6c]">{role}</p>
        </div>
      </div>
    </article>
  );
}

function SectionIntro({
  centered = false,
  dark = false,
  eyebrow,
  text,
  title
}: {
  centered?: boolean;
  dark?: boolean;
  eyebrow: string;
  text: string;
  title: string;
}) {
  return (
    <div className={centered ? "mx-auto max-w-4xl text-center" : "max-w-3xl"}>
      <p className={dark ? "text-sm font-extrabold uppercase text-[#88e2ad]" : "text-sm font-extrabold uppercase text-[#075335]"}>{eyebrow}</p>
      <h2 className={dark ? "mt-4 text-4xl font-extrabold leading-tight text-white md:text-6xl" : "mt-4 text-4xl font-extrabold leading-tight text-[#171514] md:text-6xl"}>{title}</h2>
      <p className={dark ? "mt-5 text-base font-semibold leading-8 text-white/64" : "mt-5 text-base font-semibold leading-8 text-[#5f5a53]"}>{text}</p>
    </div>
  );
}
