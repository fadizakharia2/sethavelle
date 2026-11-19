import { z } from "zod";

import type { Env } from "~/lib/env";
import type { PublicConfig, PublicMarketingIds } from "~/lib/public-config";

/**
 * Validated, typed server configuration.
 *
 * Validation runs once per worker isolate per `env` object (cached in a
 * WeakMap) and fails closed: a production worker with a broken configuration
 * refuses to serve rather than silently falling back to demo data. Error
 * messages name the variable that is wrong, never its value.
 */

const MYSHOPIFY_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const MOCK_DOMAIN = /^([a-z0-9-]+\.)?mock\.shop$/;
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const optionalId = (pattern: RegExp, label: string) =>
  optionalString.refine((value) => value === undefined || pattern.test(value), {
    message: `${label} has an unexpected format`,
  });

const optionalHttpsUrl = optionalString.refine(
  (value) => {
    if (value === undefined) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "must be an absolute https:// URL" },
);

const rawSchema = z.object({
  PUBLIC_STORE_DOMAIN: optionalString,
  PUBLIC_CHECKOUT_DOMAIN: optionalId(HOSTNAME, "PUBLIC_CHECKOUT_DOMAIN"),
  PUBLIC_STOREFRONT_ID: optionalId(/^\d+$/, "PUBLIC_STOREFRONT_ID"),
  PUBLIC_STOREFRONT_API_TOKEN: optionalString,
  PRIVATE_STOREFRONT_API_TOKEN: optionalString,
  MOCK_SHOP: optionalString,
  SHOP_ID: optionalId(/^\d+$/, "SHOP_ID (numeric shop ID, not a GID or domain)"),
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: optionalString,
  SESSION_SECRET: optionalString,
  SESSION_SECRET_PREVIOUS: optionalString,
  PUBLIC_SITE_URL: optionalHttpsUrl,
  SHOP_ALL_COLLECTION_HANDLE: optionalId(/^[a-z0-9][a-z0-9-]*$/, "SHOP_ALL_COLLECTION_HANDLE"),
  PUBLIC_GA4_MEASUREMENT_ID: optionalId(/^G-[A-Z0-9]{4,20}$/, "PUBLIC_GA4_MEASUREMENT_ID"),
  PUBLIC_GOOGLE_ADS_ID: optionalId(/^AW-\d{6,15}$/, "PUBLIC_GOOGLE_ADS_ID"),
  PUBLIC_META_PIXEL_ID: optionalId(/^\d{8,20}$/, "PUBLIC_META_PIXEL_ID"),
  PUBLIC_TIKTOK_PIXEL_ID: optionalId(/^[A-Z0-9]{10,30}$/, "PUBLIC_TIKTOK_PIXEL_ID"),
  NEWSLETTER_WEBHOOK_URL: optionalHttpsUrl,
  NEWSLETTER_WEBHOOK_SECRET: optionalString,
  CONTACT_WEBHOOK_URL: optionalHttpsUrl,
  CONTACT_WEBHOOK_SECRET: optionalString,
});

export type StorefrontMode =
  /** Tokenless mock.shop demo. Development only unless MOCK_SHOP=1. */
  | { kind: "mock"; storeDomain: string }
  /** Real store through the public (browser-safe) token. */
  | { kind: "public"; storeDomain: string; publicToken: string }
  /** Real store through the private token, server side with buyer IP. */
  | { kind: "private"; storeDomain: string; privateToken: string };

export type CustomerAccountConfig = {
  shopId: string;
  clientId: string;
  sessionSecrets: [string, ...string[]];
};

export type AppConfig = {
  storefront: StorefrontMode;
  checkoutDomain?: string;
  storefrontId?: string;
  customerAccount: CustomerAccountConfig | null;
  siteUrl?: string;
  shopAllHandle: string;
  marketing: PublicMarketingIds;
  newsletterWebhook: WebhookTarget | null;
  contactWebhook: WebhookTarget | null;
};

export type WebhookTarget = { url: string; secret: string };

export type { PublicConfig, PublicMarketingIds };

export class ConfigError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    // Only variable names and rules: values never appear in messages.
    super(`Invalid storefront configuration:\n- ${issues.join("\n- ")}`);
    this.name = "ConfigError";
    this.issues = issues;
  }
}

const MIN_SECRET_LENGTH = 32;
/**
 * Preview catalog when no store is connected: mock.shop's fragrance-only demo
 * store ("The Fragrance Courtyard"). Its products are Shopify sample data,
 * not SETHAVELLE's. Override with PUBLIC_STORE_DOMAIN=<store>.mock.shop.
 */
const DEFAULT_MOCK_DOMAIN = "arabic-attars.mock.shop";

export function parseConfig(env: Env, nodeEnv = process.env.NODE_ENV): AppConfig {
  const parsed = rawSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
  }
  const raw = parsed.data;
  const production = nodeEnv === "production";
  const issues: string[] = [];

  // ── Storefront mode ───────────────────────────────────────────────────────
  const domain = raw.PUBLIC_STORE_DOMAIN?.toLowerCase();
  const forcedMock = raw.MOCK_SHOP === "1";
  let storefront: StorefrontMode;

  if (forcedMock || (domain && MOCK_DOMAIN.test(domain))) {
    storefront = {
      kind: "mock",
      storeDomain: domain && MOCK_DOMAIN.test(domain) ? domain : DEFAULT_MOCK_DOMAIN,
    };
  } else if (!domain) {
    if (production)
      issues.push("PUBLIC_STORE_DOMAIN is required in production (or set MOCK_SHOP=1 for a demo)");
    storefront = { kind: "mock", storeDomain: DEFAULT_MOCK_DOMAIN };
  } else if (!MYSHOPIFY_DOMAIN.test(domain)) {
    issues.push("PUBLIC_STORE_DOMAIN must be the store's *.myshopify.com domain");
    storefront = { kind: "mock", storeDomain: DEFAULT_MOCK_DOMAIN };
  } else if (raw.PRIVATE_STOREFRONT_API_TOKEN) {
    storefront = { kind: "private", storeDomain: domain, privateToken: raw.PRIVATE_STOREFRONT_API_TOKEN };
  } else if (raw.PUBLIC_STOREFRONT_API_TOKEN) {
    storefront = { kind: "public", storeDomain: domain, publicToken: raw.PUBLIC_STOREFRONT_API_TOKEN };
  } else {
    issues.push(
      "PRIVATE_STOREFRONT_API_TOKEN (preferred) or PUBLIC_STOREFRONT_API_TOKEN is required when PUBLIC_STORE_DOMAIN is set",
    );
    storefront = { kind: "mock", storeDomain: DEFAULT_MOCK_DOMAIN };
  }

  if (
    raw.PRIVATE_STOREFRONT_API_TOKEN &&
    raw.PUBLIC_STOREFRONT_API_TOKEN &&
    raw.PRIVATE_STOREFRONT_API_TOKEN === raw.PUBLIC_STOREFRONT_API_TOKEN
  ) {
    issues.push("PRIVATE_STOREFRONT_API_TOKEN must not equal PUBLIC_STOREFRONT_API_TOKEN");
  }
  if (raw.PRIVATE_STOREFRONT_API_TOKEN?.startsWith("shpat_")) {
    // shpat_ is the Admin API token prefix: never valid here.
    issues.push("PRIVATE_STOREFRONT_API_TOKEN looks like an Admin API token; use a Storefront API token");
  }

  // ── Customer accounts ─────────────────────────────────────────────────────
  const accountVars = [raw.SHOP_ID, raw.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID, raw.SESSION_SECRET];
  const accountVarsSet = accountVars.filter(Boolean).length;
  let customerAccount: CustomerAccountConfig | null = null;

  if (accountVarsSet > 0 && accountVarsSet < 3) {
    issues.push(
      "Customer accounts need all of SHOP_ID, PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID and SESSION_SECRET",
    );
  }
  for (const [name, value] of [
    ["SESSION_SECRET", raw.SESSION_SECRET],
    ["SESSION_SECRET_PREVIOUS", raw.SESSION_SECRET_PREVIOUS],
  ] as const) {
    if (value && value.length < MIN_SECRET_LENGTH) {
      issues.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    if (value && /replace-with|placeholder|changeme/i.test(value)) {
      issues.push(`${name} still contains a placeholder value`);
    }
  }
  if (
    raw.SHOP_ID &&
    raw.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID &&
    raw.SESSION_SECRET &&
    storefront.kind !== "mock"
  ) {
    customerAccount = {
      shopId: raw.SHOP_ID,
      clientId: raw.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
      sessionSecrets: raw.SESSION_SECRET_PREVIOUS
        ? [raw.SESSION_SECRET, raw.SESSION_SECRET_PREVIOUS]
        : [raw.SESSION_SECRET],
    };
  }

  // ── Webhooks ──────────────────────────────────────────────────────────────
  const webhook = (url?: string, secret?: string, name?: string): WebhookTarget | null => {
    if (!url) return null;
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      issues.push(
        `${name}_WEBHOOK_SECRET (min ${MIN_SECRET_LENGTH} chars) is required with ${name}_WEBHOOK_URL`,
      );
      return null;
    }
    return { url, secret };
  };
  const newsletterWebhook = webhook(raw.NEWSLETTER_WEBHOOK_URL, raw.NEWSLETTER_WEBHOOK_SECRET, "NEWSLETTER");
  const contactWebhook = webhook(raw.CONTACT_WEBHOOK_URL, raw.CONTACT_WEBHOOK_SECRET, "CONTACT");

  if (issues.length > 0) throw new ConfigError(issues);

  return {
    storefront,
    checkoutDomain: raw.PUBLIC_CHECKOUT_DOMAIN,
    storefrontId: raw.PUBLIC_STOREFRONT_ID,
    customerAccount,
    siteUrl: raw.PUBLIC_SITE_URL?.replace(/\/+$/, ""),
    shopAllHandle: raw.SHOP_ALL_COLLECTION_HANDLE ?? "all",
    marketing: {
      ga4: raw.PUBLIC_GA4_MEASUREMENT_ID,
      googleAds: raw.PUBLIC_GOOGLE_ADS_ID,
      metaPixel: raw.PUBLIC_META_PIXEL_ID,
      tiktokPixel: raw.PUBLIC_TIKTOK_PIXEL_ID,
    },
    newsletterWebhook,
    contactWebhook,
  };
}

const cache = new WeakMap<object, AppConfig>();

/** Validated config for this worker's env, parsed once and memoized. */
export function getConfig(env: Env): AppConfig {
  const hit = cache.get(env);
  if (hit) return hit;
  const config = parseConfig(env);
  cache.set(env, config);
  return config;
}

/** Explicit allowlist of values that may be serialized to the browser. */
export function toPublicConfig(config: AppConfig): PublicConfig {
  return {
    siteUrl: config.siteUrl,
    marketing: { ...config.marketing },
    customerAccountsEnabled: config.customerAccount !== null,
    demoMode: config.storefront.kind === "mock",
  };
}
