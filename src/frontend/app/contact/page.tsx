import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MessageCircle, Store, Utensils } from "lucide-react";
import { PageShell, SiteUrl } from "../marketing";

export const metadata: Metadata = {
  title: "Contact | Qrave",
  description: "Contact Qrave for QR menu ordering, digital menus, restaurant customer CRM, and WhatsApp follow-up software.",
  alternates: { canonical: `${SiteUrl}/contact` },
  openGraph: {
    title: "Contact Qrave",
    description: "Talk to Qrave about QR menu software for your restaurant, cafe, cloud kitchen, or food service business.",
    url: `${SiteUrl}/contact`,
    siteName: "Qrave",
    type: "website"
  }
};

export default function ContactPage() {
  return (
    <PageShell>
      <section className="bg-[#f7f6f2] px-5 pb-20 pt-32 text-[#050505] sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1560px] gap-10 lg:grid-cols-[0.95fr_0.75fr] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#707070]">Contact</p>
            <h1 className="mt-5 max-w-5xl text-5xl font-extrabold leading-[0.92] tracking-[-0.04em] md:text-7xl">
              Plan your first Qrave branch with real restaurant details.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-[#444]">
              Tell us about your restaurant, cafe, cloud kitchen, or multi-branch food business. We can help map QR menus, table ordering, staff workflow, and customer follow-up.
            </p>
          </div>
          <div className="rounded-xl border border-[#d8d8d8] bg-white p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#707070]">Best fit</p>
            <div className="mt-5 grid gap-3">
              {[
                [Utensils, "Full-service restaurants"],
                [Store, "Cafes and QSR outlets"],
                [MessageCircle, "Teams ready for repeat customer follow-up"]
              ].map(([Icon, label]) => {
                const ItemIcon = Icon as typeof Store;
                return (
                  <div key={label as string} className="flex items-center gap-3 rounded-lg bg-[#f7f6f2] p-4">
                    <ItemIcon size={20} />
                    <span className="text-sm font-extrabold text-[#050505]">{label as string}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1560px] gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl bg-black p-7 text-white md:p-10">
            <Mail size={28} />
            <h2 className="mt-10 text-4xl font-extrabold leading-[0.98] tracking-[-0.04em] md:text-6xl">Start the conversation</h2>
            <p className="mt-6 text-base font-semibold leading-8 text-white/62">
              The fastest way to test Qrave is to create an account and add one branch, one menu, and one table QR code.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link href="/admin/register" className="inline-flex justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-black transition hover:bg-[#d8f1df]">
                Start free
                <ArrowRight size={17} />
              </Link>
              <a href="mailto:support.qrave@gmail.com" className="inline-flex justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-extrabold text-white transition hover:border-white hover:bg-white/[0.08]">
                support.qrave@gmail.com
              </a>
            </div>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[#d8d8d8] bg-[#d8d8d8] md:grid-cols-2">
            {[
              ["Restaurant name", "Your brand, branch, and service type."],
              ["Tables and counters", "How guests order: table QR, pickup, counter, or all three."],
              ["Menu sample", "Categories, item photos, add-ons, and availability needs."],
              ["Staff workflow", "Who sees new orders, kitchen status, waiter calls, and reports."]
            ].map(([title, text]) => (
              <article key={title} className="bg-white p-7">
                <h3 className="text-2xl font-extrabold tracking-[-0.03em] text-[#050505]">{title}</h3>
                <p className="mt-4 text-sm font-semibold leading-6 text-[#555]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
