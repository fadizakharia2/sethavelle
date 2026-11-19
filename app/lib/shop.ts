import { defineShopifyI18n, type ShopAnalytics, type ShopifyScriptsShop } from "@shopify/hydrogen";

import type { AppConfig } from "~/lib/server/config.server";

// Single-locale storefront: every request resolves to the default locale. Add
// `routing` here to serve more markets by path prefix or hostname.
export const i18n = defineShopifyI18n({
  defaultLocale: { country: "US", language: "EN" },
});

/**
 * Shop identity for Shopify scripts and analytics. Only a real store with a
 * storefront ID loads Shopify's analytics (`hydrogen` channel); otherwise events
 * stay local (`headless`).
 */
export type ShopIdentity = {
  scriptShop: ShopifyScriptsShop;
  analyticsShop: ShopAnalytics;
  shopifyAnalytics: boolean;
};

export function resolveShopIdentity(config: AppConfig, shopId: string): ShopIdentity {
  const { storefront } = config;
  if (storefront.kind === "mock") {
    return {
      scriptShop: { shopId, storefrontId: "", myshopifyDomain: storefront.storeDomain },
      analyticsShop: { shopId, channel: "headless" },
      shopifyAnalytics: false,
    };
  }

  const storefrontId = config.storefrontId ?? "";
  return {
    scriptShop: { shopId, storefrontId, myshopifyDomain: storefront.storeDomain },
    analyticsShop: storefrontId
      ? { shopId, channel: "hydrogen", storefrontId }
      : { shopId, channel: "headless" },
    shopifyAnalytics: storefrontId !== "",
  };
}

/**
 * Shopify's Customer Privacy banner owns consent. Analytics destinations
 * (including our GA4 / Ads / Meta / TikTok adapters) receive nothing until the
 * visitor allows tracking.
 */
export const analyticsConsent = {
  mode: "default-banner",
  country: "US",
  language: "EN",
} as const;

// Buyer IP for private Storefront clients (Shopify uses it for bot/abuse
// signals). Oxygen sets `oxygen-buyer-ip`; it is the only header trusted in
// production because Oxygen overwrites it at the edge.
const PRODUCTION_BUYER_IP_HEADERS = ["oxygen-buyer-ip"] as const;
const DEVELOPMENT_BUYER_IP_HEADERS = ["oxygen-buyer-ip", "cf-connecting-ip", "x-forwarded-for"] as const;
export const DEVELOPMENT_BUYER_IP = "127.0.0.1";

export function getBuyerIp(headers: Pick<Headers, "get">, nodeEnv = process.env.NODE_ENV): string {
  const production = nodeEnv === "production";
  const candidates = production ? PRODUCTION_BUYER_IP_HEADERS : DEVELOPMENT_BUYER_IP_HEADERS;
  for (const header of candidates) {
    const ip = headers.get(header)?.split(",")[0]?.trim();
    if (ip) return ip;
  }
  if (!production) return DEVELOPMENT_BUYER_IP;
  throw new Error("oxygen-buyer-ip is required for private Storefront API clients in production");
}
