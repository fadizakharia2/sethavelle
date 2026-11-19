/**
 * TEST-ONLY Storefront API stand-in for offline end-to-end runs.
 *
 * Answers the storefront's GraphQL operations by name with deliberately empty
 * catalog data (no products, no prices, no notes), so the storefront renders
 * its real empty/forthcoming states. Nothing here ships in the app bundle and
 * none of it is product information. Unknown operations get a GraphQL error.
 */
const SHOP = {
  id: "gid://shopify/Shop/1",
  name: "Sethavelle (test fixture)",
  brand: null,
  paymentSettings: { acceptedCardBrands: ["VISA", "MASTERCARD"], supportedDigitalWallets: ["SHOPIFY_PAY"] },
};

const EMPTY_PAGE = { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null };

const OPERATIONS = {
  RootLayout: () => ({ shop: SHOP, localization: { country: { currency: { isoCode: "USD" } } } }),
  Home: () => ({ rite1: null, rite2: null, rite3: null, products: { nodes: [] } }),
  ProductPage: () => ({ product: null }),
  CollectionPage: () => ({ collection: null }),
  CollectionsList: () => ({ collections: { nodes: [], pageInfo: EMPTY_PAGE } }),
  Policies: () => ({
    shop: { privacyPolicy: null, termsOfService: null, shippingPolicy: null, refundPolicy: null },
  }),
  redirects: () => ({ urlRedirects: { edges: [], nodes: [] } }),
  Sitemap: () => ({
    products: { nodes: [], pageInfo: EMPTY_PAGE },
    collections: { nodes: [], pageInfo: EMPTY_PAGE },
  }),
};

export function operationName(query) {
  return /\b(?:query|mutation)\s+([A-Za-z0-9_]+)/.exec(query ?? "")?.[1];
}

export async function respond(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    // fall through
  }
  const name = body.operationName ?? operationName(body.query);
  const handler = name ? OPERATIONS[name] : undefined;
  const payload = handler
    ? { data: handler(body.variables ?? {}) }
    : { data: null, errors: [{ message: `test fixture: operation ${name ?? "(anonymous)"} not stubbed` }] };
  return new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } });
}
