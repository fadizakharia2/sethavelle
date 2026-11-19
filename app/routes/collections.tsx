import { Link } from "react-router";

import { CollectionCard } from "~/components/CollectionCard";
import { Reveal } from "~/components/motion/Reveal";
import { PageHeader } from "~/components/PageHeader";
import { loadCollectionsPage } from "~/lib/collections";
import { buildMeta, canonicalUrl, pageTitle } from "~/lib/seo";
import { appConfigContext } from "~/lib/server/app-context";
import { storefrontClientContext } from "~/lib/storefront";

import type { Route } from "./+types/collections";

export function meta({ data }: Route.MetaArgs) {
  return buildMeta({
    title: pageTitle("Collections"),
    description: "Every collection of the house of SETHAVELLE.",
    canonical: data?.canonical,
  });
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const config = context.get(appConfigContext);
  const page = await loadCollectionsPage({ storefrontClient, request });
  return {
    ...page,
    origin: config.siteUrl ?? page.origin,
    canonical: canonicalUrl(config.siteUrl, request.url, ["after"]),
  };
}

export default function CollectionsRoute({ loaderData }: Route.ComponentProps) {
  const { collections, origin } = loaderData;

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHeader
        kicker="The House"
        title="Collections"
        lede="Each collection gathers rites that share a lineage."
        crumbs={[
          { name: "House", path: "/" },
          { name: "Collections", path: "/collections" },
        ]}
        origin={origin}
      />
      <section className="max-w-page px-margin mx-auto w-full pb-28" aria-label="All collections">
        {collections.nodes.length === 0 ? (
          <div className="sv-panel sv-frame mx-auto max-w-xl p-12 text-center">
            <p className="font-heading text-2xl text-[#e5d8c5]">No collections have been revealed yet.</p>
            <Link to="/shop" className="sv-button mt-8">
              Browse the shop
            </Link>
          </div>
        ) : (
          <ul role="list" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.nodes.map((collection, index) => (
              <Reveal as="li" key={collection.handle} delay={(index % 3) * 0.08}>
                <CollectionCard collection={collection} index={index} priority={index < 3} />
              </Reveal>
            ))}
          </ul>
        )}
        {collections.pageInfo.hasNextPage && collections.pageInfo.endCursor ? (
          <div className="mt-16 flex justify-center">
            <Link
              to={`?after=${encodeURIComponent(collections.pageInfo.endCursor)}`}
              className="sv-button"
              preventScrollReset
            >
              More collections
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
