import { CollectionView } from "~/components/CollectionView";
import { PageHeader } from "~/components/PageHeader";
import { loadCollectionPage } from "~/lib/collection";
import { shopifyImageUrl } from "~/lib/image";
import { buildMeta, canonicalUrl, pageTitle, truncate } from "~/lib/seo";
import { appConfigContext } from "~/lib/server/app-context";
import { storefrontClientContext } from "~/lib/storefront";

import type { Route } from "./+types/collection";

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: pageTitle("Not found") }];
  const { collection } = data;
  return buildMeta({
    title: pageTitle(collection.title),
    description: truncate(collection.description) || `The ${collection.title} collection by SETHAVELLE.`,
    canonical: data.canonical,
    image: collection.image?.url ? shopifyImageUrl(collection.image.url, 1200) : null,
  });
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle || !/^[a-z0-9][a-z0-9-]{0,254}$/i.test(handle)) {
    throw new Response("Not Found", { status: 404 });
  }
  const storefrontClient = context.get(storefrontClientContext);
  const config = context.get(appConfigContext);
  const page = await loadCollectionPage({ storefrontClient, handle, request });
  return {
    ...page,
    origin: config.siteUrl ?? page.origin,
    canonical: canonicalUrl(config.siteUrl, request.url),
  };
}

export default function CollectionRoute({ loaderData }: Route.ComponentProps) {
  const { collection, origin } = loaderData;
  return (
    <CollectionView
      loaderData={loaderData}
      basePath={`/collections/${collection.handle}`}
      header={
        <PageHeader
          kicker="Collection"
          title={collection.title}
          lede={collection.description || undefined}
          origin={origin}
          crumbs={[
            { name: "House", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: collection.title, path: `/collections/${collection.handle}` },
          ]}
        />
      }
    />
  );
}
