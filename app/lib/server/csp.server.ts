import { createContentSecurityPolicy } from "@shopify/hydrogen";

import type { AppConfig } from "~/lib/server/config.server";

/**
 * Per-document CSP. Starts from Hydrogen's Shopify-compatible defaults
 * (checkout, Shop Pay, Shopify CDN, analytics) and only widens for a
 * marketing vendor whose ID is actually configured. Scripts require the
 * per-request nonce; there is no 'unsafe-inline' or 'unsafe-eval' for scripts.
 */
export function createDocumentCsp(config: AppConfig) {
  const extra: Record<"scriptSrc" | "connectSrc" | "imgSrc" | "frameSrc", string[]> = {
    scriptSrc: [],
    connectSrc: [],
    imgSrc: [],
    frameSrc: [],
  };
  const add = (key: keyof typeof extra, ...hosts: string[]) => {
    extra[key].push(...hosts);
  };

  const { marketing } = config;
  if (marketing.ga4 || marketing.googleAds) {
    add("scriptSrc", "https://www.googletagmanager.com");
    add(
      "connectSrc",
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.googletagmanager.com",
    );
    add("imgSrc", "https://*.google-analytics.com", "https://*.googletagmanager.com");
  }
  if (marketing.googleAds) {
    add(
      "connectSrc",
      "https://www.google.com",
      "https://*.doubleclick.net",
      "https://googleads.g.doubleclick.net",
    );
    add("imgSrc", "https://www.google.com", "https://*.doubleclick.net");
    add("frameSrc", "https://td.doubleclick.net", "https://www.googletagmanager.com");
  }
  if (marketing.metaPixel) {
    add("scriptSrc", "https://connect.facebook.net");
    add("connectSrc", "https://www.facebook.com", "https://connect.facebook.net");
    add("imgSrc", "https://www.facebook.com");
  }
  if (marketing.tiktokPixel) {
    add("scriptSrc", "https://analytics.tiktok.com");
    add("connectSrc", "https://analytics.tiktok.com");
    add("imgSrc", "https://analytics.tiktok.com");
  }

  const { storefront } = config;
  return createContentSecurityPolicy({
    shop: { storeDomain: storefront.storeDomain, checkoutDomain: config.checkoutDomain },
    directives: {
      ...(extra.scriptSrc.length ? { scriptSrc: extra.scriptSrc } : {}),
      ...(extra.connectSrc.length ? { connectSrc: extra.connectSrc } : {}),
      ...(extra.imgSrc.length ? { imgSrc: extra.imgSrc } : {}),
      ...(extra.frameSrc.length ? { frameSrc: extra.frameSrc } : {}),
      formAction: [
        "'self'",
        "https://shopify.com",
        "https://*.shopify.com",
        ...(config.checkoutDomain ? [`https://${config.checkoutDomain}`] : []),
      ],
      upgradeInsecureRequests: process.env.NODE_ENV === "production",
    },
  });
}
