import type { ReactNode } from "react";
import Link from "next/link";
import { MessageCircle, QrCode, Store } from "lucide-react";
import { MarketingHeader } from "./marketing-header";

export const SiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://qrave-six.vercel.app";

export const FaqItems = [
  {
    question: "What is Qrave?",
    answer:
      "Qrave is a QR-based restaurant operating system for digital menus, table ordering, kitchen workflow, waiter calls, customer history, branch management, and WhatsApp customer engagement."
  },
  {
    question: "Is Qrave only a QR menu?",
    answer:
      "No. QR menus are the starting point. Qrave also helps restaurants accept direct table orders, manage live kitchen statuses, handle waiter calls, track customers, and run WhatsApp-based retention campaigns."
  },
  {
    question: "Can customers place orders from the QR menu?",
    answer:
      "Yes. Customers can scan a table QR code, browse the live menu, add items, and place an order from their phone without installing an app."
  },
  {
    question: "Does Qrave support multiple branches?",
    answer:
      "Yes. Qrave is designed for branch-wise menus, tables, QR codes, orders, staff access, customer records, and reporting."
  },
  {
    question: "Can I manage kitchen orders?",
    answer:
      "Yes. Staff can view live orders and move tickets through statuses such as placed, preparing, ready, and served so the kitchen and floor team stay aligned."
  },
  {
    question: "Does Qrave support WhatsApp marketing?",
    answer:
      "Yes. Qrave can help teams use opted-in customer information for WhatsApp follow-up, repeat visit offers, and customer engagement."
  },
  {
    question: "How fast can a restaurant get started?",
    answer:
      "A restaurant can create a basic QR menu and table QR setup in minutes. More detailed workflows such as kitchen boards, staff access, branches, and campaigns can be added as the team grows."
  },
  {
    question: "Do customers need to install an app?",
    answer: "No. Customers open the QR menu in their browser after scanning the table QR code."
  }
];

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main id="top" className="min-h-screen overflow-x-hidden bg-white text-[#0F172A]">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </main>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#070A12] px-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="flex items-center gap-3">
              <QraveMark className="h-11 w-11 shrink-0" />
              <span className="text-2xl font-extrabold">Qrave</span>
            </div>
            <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-slate-300">
              Qrave is The Restaurant Growth OS for QR menus, direct table ordering, kitchen workflow, waiter calls, branches, customers, and WhatsApp engagement.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                [QrCode, "QR ordering"],
                [Store, "Branch control"],
                [MessageCircle, "WhatsApp growth"]
              ].map(([Icon, label]) => {
                const FooterIcon = Icon as typeof QrCode;
                return (
                  <div key={label as string} className="rounded-2xl border border-white/10 bg-white/7 p-4">
                    <FooterIcon size={21} className="text-[#FDBA74]" />
                    <p className="mt-4 text-sm font-extrabold text-white">{label as string}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FooterColumn
              title="Product"
              links={[
                ["Features", "/#features"],
                ["How it Works", "/#how-it-works"],
                ["Pricing", "/#pricing"],
                ["FAQ", "/#faq"]
              ]}
            />
            <FooterColumn
              title="Company"
              links={[
                ["Contact", "/contact"],
                ["Admin Login", "/admin/login"],
                ["Privacy", "/privacy"],
                ["Terms", "/terms"]
              ]}
            />
            <div>
              <p className="text-sm font-extrabold text-white">Contact</p>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-300">
                <a href="mailto:support.qrave@gmail.com" className="transition hover:text-white">
                  support.qrave@gmail.com
                </a>
                <Link href="/contact" className="transition hover:text-white">
                  Book Demo
                </Link>
                <Link href="/admin/register" className="transition hover:text-white">
                  Start Free Trial
                </Link>
              </div>
            </div>
            <div>
              <p className="text-sm font-extrabold text-white">Social</p>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-300">
                <span>LinkedIn placeholder</span>
                <span>Instagram placeholder</span>
                <span>X placeholder</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm font-semibold text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>Copyright 2026 Qrave. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="#top" className="transition hover:text-white">
              Back to top
            </Link>
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
      <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-300">
        {links.map(([label, href]) => (
          <Link key={label} href={href} className="transition hover:text-white">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function QraveMark({ className = "h-11 w-11 shrink-0" }: { className?: string }) {
  return <img src="/brand/qrave-icon-mark-transparent.png" alt="Qrave logo mark" className={className} />;
}
