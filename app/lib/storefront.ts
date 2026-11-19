import {
  type CacheInstance,
  createShopifyRequestContext,
  createStorefrontClient,
  type PublicStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
} from "@shopify/hydrogen";
import { createContext } from "react-router";

import type { AppConfig } from "~/lib/server/config.server";
import { getBuyerIp, i18n } from "~/lib/shop";

/**
 * Real store with a private token: server-only client with the buyer IP.
 * Real store with only a public token, or mock.shop: public client. The
 * private token never leaves this module's caller (the root middleware).
 */
export type RequestStorefrontClient = RequestScopedPrivateStorefrontClient | PublicStorefrontClient;

export function createRequestStorefrontClient(
  request: Request,
  config: AppConfig,
  cache: CacheInstance,
  waitUntil: ExecutionContext["waitUntil"],
): RequestStorefrontClient {
  const { storefront } = config;

  if (storefront.kind === "private") {
    return createStorefrontClient({
      type: "private",
      requestContext: createShopifyRequestContext({
        request,
        i18n,
        buyerIp: getBuyerIp(request.headers),
      }),
      config: {
        storeDomain: storefront.storeDomain,
        privateStorefrontToken: storefront.privateToken,
        storefrontId: config.storefrontId,
        cache,
        waitUntil,
      },
    });
  }

  return createStorefrontClient({
    type: "public",
    requestContext: createShopifyRequestContext({ request, i18n }),
    config: {
      storeDomain: storefront.storeDomain,
      ...(storefront.kind === "public" ? { publicStorefrontToken: storefront.publicToken } : {}),
      cache,
      waitUntil,
    },
  });
}

export const storefrontClientContext = createContext<RequestStorefrontClient>();
