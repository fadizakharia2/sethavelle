import { gql, type StorefrontApi } from "@shopify/hydrogen";

import { appConfigContext } from "~/lib/server/app-context";
import { storefrontClientContext } from "~/lib/storefront";

import type { Route } from "./+types/sitemap";

const SITEMAP_QUERY = gql(`
  query Sitemap($productsAfter: String, $collectionsAfter: String) {
    products(first: 250, after: $productsAfter) {
      nodes { handle updatedAt onlineStoreUrl }
      pageInfo { hasNextPage endCursor }
    }
    collections(first: 250, after: $collectionsAfter) {
      nodes { handle updatedAt onlineStoreUrl }
      pageInfo { hasNextPage endCursor }
    }
  }
`);

type SitemapData = StorefrontApi.ResultOf<typeof SITEMAP_QUERY>;

const STATIC_PATHS = [
  "/",
  "/shop",
  "/collections",
  "/our-story",
  "/mythology",
  "/faq",
  "/contact",
  "/shipping-returns",
  "/privacy",
  "/terms",
];

const MAX_PAGES = 8;

function xmlEscape(value: string) {
  return value.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const config = context.get(appConfigContext);
  const origin = config.siteUrl ?? new URL(request.url).origin;

  const entries: { loc: string; lastmod?: string }[] = STATIC_PATHS.map((path) => ({
    loc: `${origin}${path}`,
  }));
  let productsAfter: string | null = null;
  let collectionsAfter: string | null = null;
  let moreProducts = true;
  let moreCollections = true;

  for (let page = 0; page < MAX_PAGES && (moreProducts || moreCollections); page++) {
    const data: SitemapData | null | undefined = (
      await storefrontClient.graphql(SITEMAP_QUERY, {
        variables: { productsAfter, collectionsAfter },
      })
    ).data;
    if (!data) break;
    if (moreProducts) {
      for (const p of data.products.nodes)
        entries.push({ loc: `${origin}/products/${p.handle}`, lastmod: p.updatedAt });
      moreProducts = data.products.pageInfo.hasNextPage;
      productsAfter = data.products.pageInfo.endCursor ?? null;
    }
    if (moreCollections) {
      for (const c of data.collections.nodes)
        entries.push({ loc: `${origin}/collections/${c.handle}`, lastmod: c.updatedAt });
      moreCollections = data.collections.pageInfo.hasNextPage;
      collectionsAfter = data.collections.pageInfo.endCursor ?? null;
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url><loc>${xmlEscape(e.loc)}</loc>${e.lastmod ? `<lastmod>${xmlEscape(e.lastmod)}</lastmod>` : ""}</url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=${60 * 60}, stale-while-revalidate=${60 * 60 * 24}`,
    },
  });
}
