import { Link } from "react-router";

import { JsonLd } from "~/components/JsonLd";
import { Reveal } from "~/components/motion/Reveal";
import { PageHeader } from "~/components/PageHeader";
import { buildMeta, pageTitle } from "~/lib/seo";

import type { Route } from "./+types/faq";

export function meta({ matches }: Route.MetaArgs) {
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  return buildMeta({
    title: pageTitle("FAQ"),
    description: "Answers to common questions about SETHAVELLE orders, fragrances and accounts.",
    canonical: root?.origin ? `${root.origin}/faq` : undefined,
  });
}

/**
 * Answers deliberately avoid facts the house hasn't confirmed (delivery times,
 * formulas, longevity). Those come from Shopify policies and product data.
 */
const FAQ = [
  {
    q: "Where can I find the notes of a fragrance?",
    a: "Each fragrance page lists its composition (head, heart and base notes) as published by the house. If a composition is not shown yet, it has not been revealed.",
  },
  {
    q: "How much does shipping cost and how long does it take?",
    a: "Shipping options, costs and estimated delivery are calculated at checkout for your address. Our full policy is on the Shipping & Returns page.",
  },
  {
    q: "Can I return a fragrance?",
    a: "Returns follow our published returns policy, which you can read on the Shipping & Returns page before you order.",
  },
  {
    q: "Is checkout secure?",
    a: "Yes. Checkout and payment are handled entirely by Shopify's hosted checkout. SETHAVELLE never sees or stores your card details.",
  },
  {
    q: "Do I need an account to order?",
    a: "No. An account simply lets you see your order history. You sign in with a one-time code sent by Shopify, with no password to remember.",
  },
  {
    q: "Are the prices final?",
    a: "Prices shown come directly from our store. Taxes, shipping and any discount codes are confirmed at checkout before you pay.",
  },
  {
    q: "How do I change my cookie choices?",
    a: "Visit the Cookie Preferences page at any time to review or change your consent.",
  },
];

export default function Faq({ matches }: Route.ComponentProps) {
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />
      <PageHeader
        kicker="Client Care"
        title="Questions,"
        italic="answered"
        origin={root?.origin}
        crumbs={[
          { name: "House", path: "/" },
          { name: "FAQ", path: "/faq" },
        ]}
      />
      <section className="max-w-page px-margin mx-auto w-full pb-28">
        <div className="max-w-3xl border-t border-[#b59660]/15">
          {FAQ.map((item, index) => (
            <Reveal key={item.q} delay={index * 0.04}>
              <details className="group border-b border-[#b59660]/15" name="faq">
                <summary className="sv-summary flex min-h-20 items-center justify-between gap-6 py-4">
                  <span className="font-heading text-xl text-[#e5d8c5] md:text-2xl">{item.q}</span>
                  <span className="sv-plus shrink-0 text-[#b59660]" aria-hidden="true" />
                </summary>
                <p className="max-w-2xl pb-8 leading-relaxed text-[#a89d8e]">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
        <p className="mt-12 text-sm text-[#a89d8e]">
          Still curious?{" "}
          <Link to="/contact" className="text-[#e5d8c5] underline decoration-[#b59660]/50 underline-offset-4">
            Write to the house
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
