import type { Metadata } from "next";
import { PageShell, SiteUrl } from "../marketing";

export const metadata: Metadata = {
  title: "Terms | Qrave",
  description: "Qrave terms for restaurant QR menu ordering and customer CRM software.",
  alternates: { canonical: `${SiteUrl}/terms` }
};

export default function TermsPage() {
  return (
    <PageShell>
      <section className="bg-[#f7f6f2] px-5 pb-20 pt-32 text-[#050505] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1080px]">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#707070]">Legal</p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[0.92] tracking-[-0.04em] md:text-7xl">Terms</h1>
          <p className="mt-7 max-w-3xl text-lg font-semibold leading-8 text-[#444]">
            Qrave provides QR menu ordering and customer management tools for restaurants and cafes. These terms should be finalized against the production product before launch.
          </p>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1080px] gap-px overflow-hidden rounded-xl border border-[#d8d8d8] bg-[#d8d8d8] md:grid-cols-2">
          {[
            ["Restaurant responsibility", "Restaurant owners are responsible for menu accuracy, pricing, taxes, availability, branch setup, and staff access."],
            ["Customer communication", "Restaurants should use customer contact details and WhatsApp follow-up only with appropriate consent."],
            ["Service usage", "Qrave is intended to support QR menus, live orders, table workflows, reporting, and customer follow-up for food service businesses."],
            ["Launch review", "Before public launch, review these terms with the final billing model, support policy, service limits, and applicable legal requirements."]
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
