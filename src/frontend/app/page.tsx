import type { Metadata } from "next";
import Link from "next/link";
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
import { InteractiveHero } from "./interactive-hero";
import { LandingMotion } from "./landing-motion";
import { ProductShowcaseTabs } from "./product-showcase-tabs";

export const metadata: Metadata = {
  title: "Qrave | The Restaurant Growth OS",
  description:
    "Qrave helps restaurants launch QR menus, accept table orders, manage kitchen workflows, reduce waiter delays, and bring customers back with WhatsApp engagement.",
  alternates: { canonical: SiteUrl },
  keywords: [
    "restaurant growth OS",
    "QR menu ordering",
    "restaurant ordering software",
    "restaurant WhatsApp marketing",
    "kitchen workflow software",
    "table QR ordering"
  ],
  openGraph: {
    title: "Qrave | The Restaurant Growth OS",
    description:
      "Run digital menus, QR table orders, kitchen workflows, waiter calls, branches, customers, and WhatsApp engagement from one restaurant operating system.",
    url: SiteUrl,
    siteName: "Qrave",
    type: "website",
    images: [{ url: "/landing/dashboard.png", width: 1600, height: 760, alt: "Qrave restaurant operations dashboard" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Qrave | The Restaurant Growth OS",
    description: "QR menus, table ordering, kitchen workflow, waiter calls, and WhatsApp customer engagement for restaurants."
  }
};

const heroSignals = ["QR ordering", "Kitchen workflow", "WhatsApp retention"];

const outcomeMetrics = [
  {
    value: "30%",
    label: "faster order flow",
    detail: "Placeholder target for teams replacing manual table ordering."
  },
  {
    value: "15 min",
    label: "QR menu launch",
    detail: "Create categories, items, and table QR codes without setup drama."
  },
  {
    value: "1 OS",
    label: "menus, orders, guests",
    detail: "A connected workspace for service, kitchen, branches, and growth."
  }
];

const outcomeTags = [
  "Faster table ordering",
  "Lower waiter workload",
  "More repeat customers",
  "Live kitchen workflow",
  "WhatsApp customer engagement"
];

const problemCards = [
  {
    title: "Printed menus become outdated",
    text: "Prices, photos, combos, and availability change faster than printed menus can keep up.",
    icon: QrCode
  },
  {
    title: "Waiters miss orders in rush hours",
    text: "Guests wait longer, staff repeat the same steps, and table requests get buried.",
    icon: BellRing
  },
  {
    title: "Kitchen teams lack order visibility",
    text: "New, preparing, ready, and served orders need one clean view during service.",
    icon: ChefHat
  },
  {
    title: "Customers leave once and disappear",
    text: "Without customer history and follow-up, restaurants lose easy repeat visits.",
    icon: Users
  }
];

const flowSteps = [
  { title: "Customer scans table QR", text: "Every table gets its own code.", icon: ScanLine },
  { title: "Opens digital menu", text: "Live items, photos, variants, and offers.", icon: Smartphone },
  { title: "Places order", text: "Guests order without waiting for staff.", icon: CreditCard },
  { title: "Kitchen receives order", text: "Tickets move through prep statuses.", icon: ChefHat },
  { title: "Staff serves faster", text: "Waiter calls and ready items stay visible.", icon: BellRing },
  { title: "Customer returns", text: "WhatsApp campaigns bring guests back.", icon: MessageCircle }
];

const featureBuckets = [
  {
    title: "Customer Experience",
    text: "Give guests a faster way to browse, order, request help, and discover offers.",
    icon: Smartphone,
    features: [
      ["Digital QR Menu", "Replace printed menus with a live, image-rich menu."],
      ["Table Ordering", "Let guests order directly from the table QR."],
      ["Item Images & Variants", "Show dishes clearly with add-ons and options."],
      ["Waiter Call", "Capture service requests without missed hand waves."],
      ["Offers & Availability", "Promote what is live and hide what is sold out."]
    ]
  },
  {
    title: "Restaurant Operations",
    text: "Keep owners, waiters, and kitchen teams aligned from one operating view.",
    icon: ChefHat,
    features: [
      ["Live Orders Dashboard", "Track every table order as it moves."],
      ["Kitchen Workflow", "Move tickets from placed to preparing to ready."],
      ["Table Management", "Manage table QR codes by branch and floor."],
      ["Branch Management", "Control outlets without messy spreadsheets."],
      ["Staff Access", "Give each role the screens they need."]
    ]
  },
  {
    title: "Growth & Retention",
    text: "Turn one table order into customer context and repeat business.",
    icon: Megaphone,
    features: [
      ["Customer History", "See visits, spend, last order, and preferences."],
      ["WhatsApp Campaigns", "Send offers and return prompts to opted-in guests."],
      ["Repeat Customer Tracking", "Spot returning guests and high-value customers."],
      ["Offers & Promotions", "Run simple campaigns without a separate tool."],
      ["Basic Reports", "Understand orders, menu activity, and branch trends."]
    ]
  }
];

const calculatorInputs = [
  ["Number of tables", "18"],
  ["Average daily customers", "120"],
  ["Average order value", "Rs. 420"]
];

const calculatorOutputs = [
  ["More orders handled", "+12/day", "When guests order without waiting for a waiter."],
  ["Faster service", "8-12 min", "Potential reduction in order capture and relay time."],
  ["Potential monthly lift", "Rs. 1.5L", "Illustrative output, based on faster table turns."]
];

const useCases = [
  {
    title: "Cafes",
    text: "Move breakfast rush, combos, add-ons, and repeat guests through one QR-first workflow.",
    icon: Store
  },
  {
    title: "Restaurants",
    text: "Give dine-in tables a faster ordering path while staff and kitchen stay synced.",
    icon: Utensils
  },
  {
    title: "Food Courts",
    text: "Standardize ordering, pickup, and customer communication across busy counters.",
    icon: QrCode
  },
  {
    title: "Cloud Kitchens",
    text: "Manage availability, pickup orders, customer history, and offers without a front desk.",
    icon: ChefHat
  },
  {
    title: "Multi-branch Brands",
    text: "Control menus, staff, reports, campaigns, and branches from a central owner view.",
    icon: Users
  }
];

const testimonials = [
  {
    quote: "Qrave helped us reduce order confusion during rush hours.",
    name: "Restaurant Owner",
    role: "Cafe Placeholder"
  },
  {
    quote: "The kitchen board made table orders easier to track from scan to serve.",
    name: "Operations Manager",
    role: "Restaurant Placeholder"
  },
  {
    quote: "We finally had a simple way to follow up with customers after their visit.",
    name: "Founder",
    role: "Food Brand Placeholder"
  }
];

const pricingPlans = [
  {
    name: "Starter",
    eyebrow: "For small cafes starting with QR menus.",
    cta: "Start Free",
    href: "/admin/register",
    features: ["QR Menu", "Menu Categories", "Item Images", "Table QR Codes", "Basic Dashboard"]
  },
  {
    name: "Growth",
    eyebrow: "For restaurants that want ordering and operations.",
    cta: "Book Demo",
    href: "/contact",
    highlighted: true,
    features: [
      "Everything in Starter",
      "QR Table Ordering",
      "Live Orders Dashboard",
      "Kitchen Workflow",
      "Waiter Call",
      "Customer History"
    ]
  },
  {
    name: "Multi-Branch",
    eyebrow: "For growing restaurant brands.",
    cta: "Contact Sales",
    href: "/contact",
    features: [
      "Everything in Growth",
      "Multi-Branch Management",
      "Staff Roles",
      "WhatsApp Campaigns",
      "Advanced Reports",
      "Priority Support"
    ]
  }
];

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Qrave",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Restaurant Growth OS for QR menus, table ordering, kitchen workflow, waiter calls, branch management, customers, and WhatsApp engagement.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "Start free trial"
  }
};

export default function LandingPage() {
  return (
    <PageShell>
      <LandingMotion />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <section className="relative overflow-hidden bg-[#050814] px-4 pb-16 pt-28 text-white sm:px-6 sm:pb-20 sm:pt-32 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_72%_78%,rgba(15,23,42,0.92),transparent_38%),linear-gradient(145deg,#050814_0%,#0B1020_46%,#111827_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F8FAFC] to-transparent" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid min-w-0 grid-cols-1 items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="min-w-0 lg:max-w-none" style={{ width: "min(100%, calc(100vw - 2rem))" }}>
              <p className="landing-reveal inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-bold text-orange-100" style={{ animationDelay: "40ms" }}>
                The Restaurant Growth OS
              </p>
              <h1 className="font-hero landing-reveal mt-6 max-w-[calc(100vw-2rem)] text-4xl font-black leading-[1.02] text-white sm:max-w-3xl sm:text-5xl lg:text-6xl" style={{ animationDelay: "120ms" }}>
                The Restaurant Growth OS for Modern Cafes & Restaurants
              </h1>
              <p className="landing-reveal mt-6 max-w-[calc(100vw-2rem)] text-lg font-semibold leading-8 text-slate-200 sm:max-w-2xl" style={{ animationDelay: "200ms" }}>
                Qrave helps restaurants replace printed menus, accept QR table orders, manage kitchen workflows, reduce waiter delays, and bring customers back with WhatsApp engagement.
              </p>
              <div className="landing-reveal mt-8 flex max-w-[calc(100vw-2rem)] flex-col gap-3 sm:max-w-none sm:flex-row" style={{ animationDelay: "280ms" }}>
                <PrimaryLink href="/admin/register">Start Free Trial</PrimaryLink>
                <SecondaryLink href="/contact">Book a Demo</SecondaryLink>
              </div>
              <p className="landing-reveal mt-4 text-sm font-semibold text-slate-300" style={{ animationDelay: "340ms" }}>
                No setup headache. Launch your QR menu in minutes.
              </p>
              <div className="landing-reveal mt-8 flex max-w-[calc(100vw-2rem)] flex-wrap gap-3 sm:max-w-none" style={{ animationDelay: "400ms" }}>
                {heroSignals.map((signal) => (
                  <span key={signal} className="rounded-full border border-white/12 bg-white/7 px-3 py-2 text-xs font-bold text-slate-200">
                    {signal}
                  </span>
                ))}
              </div>
            </div>

            <InteractiveHero />
          </div>
        </div>
      </section>

      <section aria-label="Restaurant outcomes" className="bg-[#F8FAFC] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 lg:grid-cols-3">
            {outcomeMetrics.map((metric) => (
              <article key={metric.label} data-landing-reveal className="landing-scroll-reveal rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                <p className="font-accent text-4xl font-extrabold text-[#0F172A]">{metric.value}</p>
                <h2 className="mt-2 text-lg font-extrabold text-[#0F172A]">{metric.label}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">{metric.detail}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {outcomeTags.map((tag) => (
              <span key={tag} data-landing-reveal className="landing-scroll-reveal rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-bold text-[#334155]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="The problem"
            title="Restaurants lose money in small delays"
            text="A slow menu update, one missed waiter call, or one lost customer record compounds during every busy shift."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {problemCards.map((problem) => (
              <InfoCard key={problem.title} {...problem} />
            ))}
          </div>
          <div data-landing-reveal className="landing-scroll-reveal mt-10 rounded-2xl bg-[#0B1020] p-6 text-white sm:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-orange-200">Qrave fixes this with one connected restaurant system.</p>
                <h2 className="font-accent mt-2 max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl">Menus, orders, kitchen, staff, branches, and WhatsApp engagement stay in sync.</h2>
              </div>
              <Link href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#0F172A] transition hover:bg-orange-100">
                See the flow
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#F8FAFC] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="How it works"
            title="From table scan to repeat visit"
            text="Qrave turns a simple QR scan into an operational workflow your team can actually run during service."
            centered
          />
          <div className="relative mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="absolute left-8 right-8 top-14 hidden h-px bg-[#CBD5E1] lg:block" />
            {flowSteps.map((step, index) => (
              <FlowStep key={step.title} index={index + 1} {...step} />
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="Features"
            title="Built around customer experience, daily operations, and retention"
            text="Qrave keeps the product simple for restaurants by grouping the tools around the outcomes owners care about."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {featureBuckets.map((bucket) => (
              <FeatureBucket key={bucket.title} {...bucket} />
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#070A12] px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="Product showcase"
            title="Everything your restaurant needs, in one dashboard"
            text="Use one workspace to publish menus, watch table orders, move tickets through kitchen statuses, and bring customers back."
            dark
          />
          <div className="mt-10">
            <ProductShowcaseTabs />
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div data-landing-reveal className="landing-scroll-reveal">
            <p className="text-sm font-extrabold text-[#F97316]">ROI calculator</p>
            <h2 className="font-accent mt-4 max-w-2xl text-4xl font-extrabold leading-tight text-[#0F172A] sm:text-5xl">
              See what faster ordering can do for your restaurant
            </h2>
            <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-[#64748B]">
              This static calculator preview shows the kind of conversation Qrave creates with restaurant owners: more orders handled, faster service, and a clearer revenue story.
            </p>
          </div>
          <CalculatorMockup />
        </div>
      </section>

      <section className="bg-[#F8FAFC] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="Use cases"
            title="Designed for restaurants that need more than a digital menu"
            text="Qrave fits QR-first service models across dine-in, counter service, pickup, and multi-branch food brands."
            centered
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {useCases.map((useCase) => (
              <UseCaseCard key={useCase.title} {...useCase} />
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="Testimonials"
            title="Placeholder stories for the outcomes Qrave is built to improve"
            text="These are sample testimonials until verified customer quotes are available."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article key={testimonial.role} data-landing-reveal className="landing-scroll-reveal rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
                <p className="font-quote text-xl font-bold leading-8 text-[#0F172A]">"{testimonial.quote}"</p>
                <div className="mt-8 border-t border-[#E2E8F0] pt-4">
                  <p className="font-extrabold text-[#0F172A]">{testimonial.name}</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748B]">{testimonial.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#F8FAFC] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="Pricing"
            title="Simple plans for QR menus, operations, and multi-branch growth"
            text="Start with the essentials, add ordering and kitchen workflow, then expand into WhatsApp engagement and branch management."
            centered
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.name} {...plan} />
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <SectionIntro
            eyebrow="FAQ"
            title="Questions restaurant teams ask before getting started"
            text="Clear answers about QR menus, table ordering, kitchen workflow, branches, WhatsApp engagement, and customer app requirements."
            centered
          />
          <div className="mt-10 divide-y divide-[#E2E8F0] rounded-2xl border border-[#E2E8F0] bg-white">
            {FaqItems.map((item) => (
              <article key={item.question} data-landing-reveal className="landing-scroll-reveal grid gap-3 p-6 md:grid-cols-[0.38fr_0.62fr] md:gap-8">
                <h3 className="text-lg font-extrabold leading-7 text-[#0F172A]">{item.question}</h3>
                <p className="text-sm font-semibold leading-7 text-[#64748B]">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#070A12] px-4 py-20 text-white sm:px-6 lg:px-8">
        <div data-landing-reveal className="landing-scroll-reveal mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.34),transparent_34%),linear-gradient(135deg,#0B1020,#111827)] p-8 sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.72fr] lg:items-center">
            <div>
              <p className="text-sm font-extrabold text-orange-200">Ready for service?</p>
              <h2 className="font-hero mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">
                Ready to turn your QR menu into a restaurant growth system?
              </h2>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-300">
                Launch your digital menu, accept table orders, manage kitchen flow, and bring customers back with Qrave.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <PrimaryLink href="/admin/register">Start Free Trial</PrimaryLink>
              <SecondaryLink href="/contact">Book Demo</SecondaryLink>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function PrimaryLink({ children, href }: { children: string; href: string }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F97316] px-6 py-3 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(249,115,22,0.34)] transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#FDBA74] focus:ring-offset-2 focus:ring-offset-[#070A12]">
      {children}
      <ArrowRight size={17} />
    </Link>
  );
}

function SecondaryLink({ children, href }: { children: string; href: string }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center rounded-full border border-white/22 bg-white/8 px-6 py-3 text-sm font-extrabold text-white transition hover:border-white/42 hover:bg-white/14 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#070A12]">
      {children}
    </Link>
  );
}

function HeroDashboardMockup() {
  const tickets = [
    ["Table 4", "Paneer tikka bowl x2", "Preparing", "12 min"],
    ["Table 9", "Veg thali, cold coffee x2", "Placed", "Now"],
    ["Table 2", "Water refill requested", "Waiter call", "2 min"]
  ];

  return (
    <div className="landing-reveal relative w-full min-w-0 lg:max-w-full" style={{ animationDelay: "220ms", width: "min(100%, calc(100vw - 2rem))" }}>
      <div className="relative rounded-[1.7rem] border border-white/12 bg-white/10 p-3 shadow-[0_34px_100px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="overflow-hidden rounded-[1.25rem] bg-[#F8FAFC] text-[#0F172A]">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#0F172A] text-white">
                <QrCode size={18} />
              </div>
              <div>
                <p className="text-sm font-extrabold">Qrave Live</p>
                <p className="text-xs font-bold text-[#64748B]">Urban Cafe - Dinner shift</p>
              </div>
            </div>
            <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-extrabold text-[#166534]">Live</span>
          </div>

          <div className="grid min-h-[31rem] md:grid-cols-[11rem_1fr]">
            <aside className="hidden border-r border-[#E2E8F0] bg-[#0B1020] p-4 text-white md:block">
              <div className="grid gap-2 text-sm font-bold">
                {["Dashboard", "Orders", "Kitchen", "Customers", "Campaigns"].map((item, index) => (
                  <div key={item} className={index === 1 ? "rounded-lg bg-white px-3 py-2 text-[#0F172A]" : "rounded-lg px-3 py-2 text-slate-300"}>
                    {item}
                  </div>
                ))}
              </div>
            </aside>

            <div className="p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Orders", "42", "today"],
                  ["Revenue", "Rs. 38k", "QR orders"],
                  ["Repeat guests", "18", "this week"]
                ].map(([label, value, note]) => (
                  <div key={label} className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-bold text-[#64748B]">{label}</p>
                    <p className="mt-2 text-2xl font-extrabold text-[#0F172A]">{value}</p>
                    <p className="mt-1 text-xs font-bold text-[#22C55E]">{note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-extrabold">Live orders</h2>
                      <p className="text-xs font-bold text-[#64748B]">Table orders and waiter calls</p>
                    </div>
                    <ChefHat size={20} className="text-[#F97316]" />
                  </div>
                  <div className="mt-4 grid gap-3">
                    {tickets.map(([table, order, status, time]) => (
                      <div key={`${table}-${status}`} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-extrabold text-[#0F172A]">{table}</p>
                            <p className="mt-1 text-xs font-semibold leading-5 text-[#64748B]">{order}</p>
                          </div>
                          <span className={status === "Waiter call" ? "rounded-full bg-orange-100 px-2.5 py-1 text-xs font-extrabold text-[#C2410C]" : "rounded-full bg-[#DCFCE7] px-2.5 py-1 text-xs font-extrabold text-[#166534]"}>
                            {status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-[#94A3B8]">{time}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-extrabold">WhatsApp campaign</h2>
                      <MessageCircle size={18} className="text-[#22C55E]" />
                    </div>
                    <p className="mt-4 text-2xl font-extrabold">128 sent</p>
                    <p className="mt-1 text-xs font-bold text-[#64748B]">Return offer to lunch customers</p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div className="h-full w-[72%] rounded-full bg-[#22C55E]" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                    <div className="flex items-center gap-3">
                      <img src="/landing/qr-menu.png" alt="Qrave mobile QR menu preview" className="h-28 w-16 rounded-xl object-cover object-top shadow-[0_14px_34px_rgba(15,23,42,0.18)]" />
                      <div>
                        <p className="text-sm font-extrabold">Table QR order</p>
                        <p className="mt-2 text-xs font-semibold leading-5 text-[#64748B]">Guests browse, add items, and order from the phone.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -left-8 bottom-28 hidden rounded-2xl border border-white/14 bg-[#111827]/94 p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.36)] xl:block">
        <p className="text-xs font-bold text-slate-300">New order from Table 4</p>
        <p className="mt-1 text-lg font-extrabold">Rs. 920</p>
      </div>
    </div>
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
    <div data-landing-reveal className={`landing-scroll-reveal ${centered ? "mx-auto max-w-4xl text-center" : "max-w-4xl"}`}>
      <p className={`text-sm font-extrabold ${dark ? "text-orange-200" : "text-[#F97316]"}`}>{eyebrow}</p>
      <h2 className={`font-accent mt-4 text-3xl font-extrabold leading-tight sm:text-5xl ${dark ? "text-white" : "text-[#0F172A]"}`}>{title}</h2>
      <p className={`mt-5 text-base font-semibold leading-8 ${dark ? "text-slate-300" : "text-[#64748B]"}`}>{text}</p>
    </div>
  );
}

function InfoCard({ icon: Icon, text, title }: { icon: LucideIcon; text: string; title: string }) {
  return (
    <article data-landing-reveal className="landing-scroll-reveal rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.1)]">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-100 text-[#C2410C]">
        <Icon size={21} />
      </div>
      <h3 className="mt-5 text-xl font-extrabold leading-7 text-[#0F172A]">{title}</h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#64748B]">{text}</p>
    </article>
  );
}

function FlowStep({ icon: Icon, index, text, title }: { icon: LucideIcon; index: number; text: string; title: string }) {
  return (
    <article data-landing-reveal className="landing-scroll-reveal relative rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
      <div className="relative z-10 grid h-12 w-12 place-items-center rounded-xl bg-[#0B1020] text-white">
        <Icon size={21} />
      </div>
      <p className="mt-5 text-xs font-extrabold text-[#F97316]">Step {index}</p>
      <h3 className="mt-2 text-lg font-extrabold leading-7 text-[#0F172A]">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">{text}</p>
    </article>
  );
}

function FeatureBucket({ features, icon: Icon, text, title }: { features: string[][]; icon: LucideIcon; text: string; title: string }) {
  return (
    <article data-landing-reveal className="landing-scroll-reveal rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#0B1020] text-white">
          <Icon size={22} />
        </div>
        <div>
          <h3 className="font-accent text-2xl font-extrabold leading-8 text-[#0F172A]">{title}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">{text}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3">
        {features.map(([featureTitle, featureText]) => (
          <div key={featureTitle} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex gap-3">
              <Check className="mt-0.5 shrink-0 text-[#22C55E]" size={18} />
              <div>
                <h4 className="font-extrabold leading-6 text-[#0F172A]">{featureTitle}</h4>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">{featureText}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function CalculatorMockup() {
  return (
    <div data-landing-reveal className="landing-scroll-reveal rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.12)] sm:p-6">
      <div className="rounded-2xl bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-accent text-2xl font-extrabold text-[#0F172A]">Faster ordering calculator</h3>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">Static preview for demo conversations.</p>
          </div>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-extrabold text-[#C2410C]">Preview</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {calculatorInputs.map(([label, value]) => (
            <label key={label} className="grid gap-2 text-sm font-extrabold text-[#334155]">
              {label}
              <input readOnly value={value} className="h-12 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 text-base font-extrabold text-[#0F172A] outline-none" />
            </label>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {calculatorOutputs.map(([label, value, text]) => (
          <article key={label} className="rounded-2xl bg-[#0B1020] p-5 text-white">
            <p className="text-sm font-bold text-slate-300">{label}</p>
            <p className="font-accent mt-3 text-3xl font-extrabold">{value}</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">{text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function UseCaseCard({ icon: Icon, text, title }: { icon: LucideIcon; text: string; title: string }) {
  return (
    <article data-landing-reveal className="landing-scroll-reveal rounded-2xl border border-[#E2E8F0] bg-white p-5">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#DCFCE7] text-[#166534]">
        <Icon size={21} />
      </div>
      <h3 className="mt-5 text-xl font-extrabold leading-7 text-[#0F172A]">{title}</h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#64748B]">{text}</p>
    </article>
  );
}

function PricingCard({
  cta,
  eyebrow,
  features,
  highlighted = false,
  href,
  name
}: {
  cta: string;
  eyebrow: string;
  features: string[];
  highlighted?: boolean;
  href: string;
  name: string;
}) {
  return (
    <article data-landing-reveal className={`landing-scroll-reveal flex min-h-full flex-col rounded-2xl border p-6 ${highlighted ? "border-[#F97316] bg-[#0B1020] text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]" : "border-[#E2E8F0] bg-white text-[#0F172A]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={highlighted ? "text-sm font-bold text-orange-200" : "text-sm font-bold text-[#F97316]"}>{eyebrow}</p>
          <h3 className="font-accent mt-3 text-3xl font-extrabold">{name}</h3>
        </div>
        {highlighted ? <span className="rounded-full bg-[#F97316] px-3 py-1 text-xs font-extrabold text-white">Popular</span> : null}
      </div>
      <ul className="mt-8 grid flex-1 gap-3">
        {features.map((feature) => (
          <li key={feature} className={`flex gap-3 text-sm font-bold leading-6 ${highlighted ? "text-slate-200" : "text-[#334155]"}`}>
            <Check className="mt-0.5 shrink-0 text-[#22C55E]" size={18} />
            {feature}
          </li>
        ))}
      </ul>
      <Link href={href} className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold transition focus:outline-none focus:ring-2 ${highlighted ? "bg-[#F97316] text-white hover:bg-[#EA580C] focus:ring-[#FDBA74]" : "border border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white focus:ring-[#0F172A]"}`}>
        {cta}
        <ArrowRight size={17} />
      </Link>
    </article>
  );
}
