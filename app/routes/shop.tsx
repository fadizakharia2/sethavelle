import { Link } from "react-router";

import { CollectionCard } from "~/components/CollectionCard";
import { CollectionView } from "~/components/CollectionView";
import { PageHeader } from "~/components/PageHeader";
import { loadCollectionPage } from "~/lib/collection";
import { loadCollectionsPage } from "~/lib/collections";
import { buildMeta, canonicalUrl, pageTitle } from "~/lib/seo";
import { appConfigContext } from "~/lib/server/app-context";
import { storefrontClientContext } from "~/lib/storefront";

import type { Route } from "./+types/shop";

export function meta({ data }: Route.MetaArgs) {
  return buildMeta({
    title: pageTitle("Shop"),
    description: "Every fragrance of the house of SETHAVELLE: filter, sort and discover.",
    canonical: data?.canonical,
  });
}

/**
 * The shop renders the store's "shop all" collection (handle from
 * SHOP_ALL_COLLECTION_HANDLE, default `all`) with Shopify's own filters and
 * sorting. If the merchant hasn't created it yet, we show the collections.
 */
export async function loader({ context, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const config = context.get(appConfigContext);
  const canonical = canonicalUrl(config.siteUrl, request.url);
  const origin = config.siteUrl ?? new URL(request.url).origin;
  try {
    const page = await loadCollectionPage({ storefrontClient, handle: config.shopAllHandle, request });
    return { kind: "collection" as const, page: { ...page, origin }, canonical, origin };
  } catch (error) {
    if (!(error instanceof Response) || error.status !== 404) throw error;
    const { collections } = await loadCollectionsPage({ storefrontClient, request });
    return { kind: "fallback" as const, collections: collections.nodes, canonical, origin };
  }
}

const crumbs = [
  { name: "House", path: "/" },
  { name: "Shop", path: "/shop" },
];

export default function ShopRoute({ loaderData }: Route.ComponentProps) {
  const header = (
    <PageHeader
      kicker="The Collection"
      title="All rites"
      italic="of the house"
      lede="Every SETHAVELLE composition. Prices, sizes and availability are kept by the house's ledger in real time."
      crumbs={crumbs}
      origin={loaderData.origin}
    />
  );

  if (loaderData.kind === "collection") {
    return <CollectionView loaderData={loaderData.page} basePath="/shop" header={header} />;
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      {header}
      <section className="max-w-page px-margin mx-auto w-full pb-28">
        {loaderData.collections.length > 0 ? (
          <ul role="list" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loaderData.collections.map((collection, index) => (
              <li key={collection.handle}>
                <CollectionCard collection={collection} index={index} priority={index < 3} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="sv-panel sv-frame mx-auto max-w-xl p-12 text-center">
            <p className="font-heading text-2xl text-[#e5d8c5]">The vault is sealed for now.</p>
            <p className="mt-3 text-sm text-[#a89d8e]">No fragrances have been published yet. Return soon.</p>
            <Link to="/" className="sv-button mt-8">
              Return to the house
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
