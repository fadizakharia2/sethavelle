import { gql, type StorefrontApi, type StorefrontClient } from "@shopify/hydrogen";

/**
 * Collections for the header's Collections menu. Kept small (titles, handles
 * and one image) because it loads on every page with the root layout.
 */
export const NAV_COLLECTIONS_QUERY = gql(`
  query NavCollections {
    collections(first: 12, sortKey: TITLE) {
      nodes {
        handle
        title
        image {
          url
          altText
          width
          height
        }
      }
    }
  }
`);

export type NavCollection = StorefrontApi.ResultOf<
  typeof NAV_COLLECTIONS_QUERY
>["collections"]["nodes"][number];

/** Shopify's automatic home-page collection is not a real browsing destination. */
const HIDDEN_HANDLES = new Set(["frontpage"]);

export async function loadNavCollections(
  storefrontClient: Pick<StorefrontClient, "graphql">,
  shopAllHandle: string,
): Promise<NavCollection[]> {
  try {
    const { data } = await storefrontClient.graphql(NAV_COLLECTIONS_QUERY);
    return (data?.collections.nodes ?? []).filter(
      (collection) => collection.handle !== shopAllHandle && !HIDDEN_HANDLES.has(collection.handle),
    );
  } catch {
    // The menu is a convenience: a failure must never take the page down.
    return [];
  }
}
