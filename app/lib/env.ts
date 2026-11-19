import { createContext } from "react-router";

/**
 * Raw worker environment. Every value is optional here because Oxygen/Mini
 * Oxygen inject whatever is configured; `~/lib/server/config.server.ts`
 * validates and narrows it once per worker before any request is served.
 *
 * Exposure levels (see docs/ENVIRONMENT.md):
 *   PUBLIC_*  — may be sent to the browser, but only through the explicit
 *               allowlist in `toPublicConfig()`.
 *   others    — server only. Never return them from a loader.
 */
export type Env = {
  // Shopify Storefront API
  PUBLIC_STORE_DOMAIN?: string;
  PUBLIC_CHECKOUT_DOMAIN?: string;
  PUBLIC_STOREFRONT_ID?: string;
  PUBLIC_STOREFRONT_API_TOKEN?: string;
  PRIVATE_STOREFRONT_API_TOKEN?: string;
  MOCK_SHOP?: string;

  // Customer Account API + sessions
  SHOP_ID?: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID?: string;
  SESSION_SECRET?: string;
  SESSION_SECRET_PREVIOUS?: string;

  // Site
  PUBLIC_SITE_URL?: string;
  SHOP_ALL_COLLECTION_HANDLE?: string;

  // Marketing (public IDs only — never API secrets)
  PUBLIC_GA4_MEASUREMENT_ID?: string;
  PUBLIC_GOOGLE_ADS_ID?: string;
  PUBLIC_META_PIXEL_ID?: string;
  PUBLIC_TIKTOK_PIXEL_ID?: string;

  // Form delivery (server only)
  NEWSLETTER_WEBHOOK_URL?: string;
  NEWSLETTER_WEBHOOK_SECRET?: string;
  CONTACT_WEBHOOK_URL?: string;
  CONTACT_WEBHOOK_SECRET?: string;
};

export const envContext = createContext<Env>();
