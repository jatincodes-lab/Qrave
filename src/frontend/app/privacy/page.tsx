import type { Metadata } from "next";
import { PageShell, SiteUrl } from "../marketing";

export const metadata: Metadata = {
  title: "Privacy Policy | Qrave",
  description: "Qrave privacy policy for restaurant QR menu ordering and customer CRM software.",
  alternates: { canonical: `${SiteUrl}/privacy` }
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <section className="bg-[#f7f6f2] px-5 pb-20 pt-32 text-[#050505] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1080px]">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#707070]">Legal</p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[0.92] tracking-[-0.04em] md:text-7xl">Privacy Policy</h1>
          <p className="mt-7 max-w-3xl text-lg font-semibold leading-8 text-[#444]">
            Qrave helps restaurants manage QR menus, orders, and customer follow-up. This page summarizes the privacy principles that should guide public launch.
          </p>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1080px] gap-px overflow-hidden rounded-xl border border-[#d8d8d8] bg-[#d8d8d8] md:grid-cols-2">
          {[
            ["Customer information", "Restaurants should collect customer information only with proper consent and use it for ordering, support, and approved follow-up."],
            ["Restaurant data", "Menu items, table details, orders, reports, and branch settings are used to operate the Qrave workspace."],
            ["Messaging consent", "WhatsApp or marketing follow-up should be sent only to customers who have agreed to receive it."],
            ["Launch review", "Before public launch, review this policy with the final product behavior, data retention rules, and applicable legal requirements."]
          ].map(([title, text]) => (
            <article key={title} className="bg-white p-7">
              <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-[#050505]">{title}</h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-[#555]">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
