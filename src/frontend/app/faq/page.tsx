import type { Metadata } from "next";
import { FaqItems, PageShell, SiteUrl } from "../marketing";

export const metadata: Metadata = {
  title: "FAQ | Qrave QR Menu Ordering Software",
  description: "Answers about Qrave QR menu software, table ordering, WhatsApp follow-up, customer CRM, branches, and restaurant use cases.",
  alternates: { canonical: `${SiteUrl}/faq` },
  openGraph: {
    title: "Qrave FAQ",
    description: "Common questions about QR menu ordering, restaurant customer CRM, and WhatsApp follow-up with Qrave.",
    url: `${SiteUrl}/faq`,
    siteName: "Qrave",
    type: "website"
  }
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FaqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer
    }
  }))
};

export default function FaqPage() {
  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section className="bg-[#f7f6f2] px-5 pb-20 pt-32 text-[#050505] sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1560px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#707070]">FAQ</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.92] tracking-[-0.04em] md:text-7xl">
              Questions restaurant teams ask before they switch.
            </h1>
          </div>
          <p className="max-w-2xl text-lg font-semibold leading-8 text-[#444]">
            Clear answers about QR menu ordering, customer capture, WhatsApp messaging, branch management, and day-to-day service.
          </p>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1080px] divide-y divide-[#cfcfcf] border-y border-[#cfcfcf]">
          {FaqItems.map((item) => (
            <article key={item.question} className="grid gap-5 py-8 md:grid-cols-[0.42fr_0.58fr]">
              <h2 className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-[#050505]">{item.question}</h2>
              <p className="text-base font-semibold leading-8 text-[#4b4b4b]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
