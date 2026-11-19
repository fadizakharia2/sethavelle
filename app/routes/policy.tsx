import { gql } from "@shopify/hydrogen";
import { Link } from "react-router";

import { PageHeader } from "~/components/PageHeader";
import { RichText } from "~/components/RichText";
import { htmlToBlocks } from "~/lib/rich-text";
import { buildMeta, canonicalUrl, pageTitle } from "~/lib/seo";
import { appConfigContext } from "~/lib/server/app-context";
import { storefrontClientContext } from "~/lib/storefront";

import type { Route } from "./+types/policy";

/**
 * Legal pages render the policies the merchant publishes in Shopify admin
 * (Settings → Policies). We never write legal text ourselves. Policy HTML is
 * reduced to text blocks (no raw HTML injection).
 */
const POLICIES_QUERY = gql(`
  query Policies {
    shop {
      privacyPolicy { title body }
      termsOfService { title body }
      shippingPolicy { title body }
      refundPolicy { title body }
    }
  }
`);

const PAGES = {
  "/privacy": { title: "Privacy Policy", keys: ["privacyPolicy"] },
  "/terms": { title: "Terms & Conditions", keys: ["termsOfService"] },
  "/shipping-returns": { title: "Shipping & Returns", keys: ["shippingPolicy", "refundPolicy"] },
} as const;

type PolicyKey = "privacyPolicy" | "termsOfService" | "shippingPolicy" | "refundPolicy";

export function meta({ data }: Route.MetaArgs) {
  return buildMeta({
    title: pageTitle(data?.title ?? "Policy"),
    description: data ? `${data.title} for SETHAVELLE.` : undefined,
    canonical: data?.canonical,
  });
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = PAGES[url.pathname as keyof typeof PAGES];
  if (!page) throw new Response("Not Found", { status: 404 });

  const storefrontClient = context.get(storefrontClientContext);
  const config = context.get(appConfigContext);
  const { data } = await storefrontClient.graphql(POLICIES_QUERY);
  const sections = (page.keys as readonly PolicyKey[])
    .map((key) => data?.shop[key])
    .filter((policy): policy is { title: string; body: string } => Boolean(policy?.body))
    .map((policy) => ({ title: policy.title, blocks: htmlToBlocks(policy.body) }));

  return {
    title: page.title,
    path: url.pathname,
    sections,
    canonical: canonicalUrl(config.siteUrl, request.url),
    origin: config.siteUrl ?? url.origin,
  };
}

export default function PolicyRoute({ loaderData }: Route.ComponentProps) {
  const { title, sections, path, origin } = loaderData;
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHeader
        kicker="Legal"
        title={title}
        origin={origin}
        crumbs={[
          { name: "House", path: "/" },
          { name: title, path },
        ]}
      />
      <section className="max-w-page px-margin mx-auto w-full pb-28">
        {sections.length === 0 ? (
          <div className="sv-panel max-w-2xl p-10">
            <p className="font-heading text-2xl text-[#e5d8c5]">This policy has not been published yet.</p>
            <p className="mt-3 text-sm text-[#a89d8e]">
              Please{" "}
              <Link to="/contact" className="underline decoration-[#b59660]/50 underline-offset-4">
                contact the house
              </Link>{" "}
              with any questions in the meantime.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-16">
            {sections.map((section) => (
              <article key={section.title}>
                {sections.length > 1 ? (
                  <h2 className="font-heading mb-8 text-3xl text-[#e5d8c5]">{section.title}</h2>
                ) : null}
                <RichText blocks={section.blocks} className="leading-relaxed text-[#a89d8e]" />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
