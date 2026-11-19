import { AnalyticsEvent, type StorefrontAnalyticsDestination } from "@shopify/hydrogen";

import type { PublicMarketingIds } from "~/lib/public-config";

/**
 * Consent-aware marketing layer for GA4, Google Ads, Meta Pixel and TikTok.
 *
 * - Vendors are registered as Hydrogen analytics *destinations*: the bus only
 *   delivers events once Shopify Customer Privacy allows tracking, and replays
 *   buffered events after consent. Nothing is sent before consent.
 * - Third-party scripts are injected lazily on the first delivered event, never
 *   in `setup` (Hydrogen's contract), and carry the document CSP nonce.
 * - Ad pixels (Ads/Meta/TikTok) additionally require *marketing* consent.
 * - Payloads carry product/cart facts only: no email, name, customer ID,
 *   access token, or URL query strings.
 * - Purchases are NOT tracked here. A storefront cannot verify an order;
 *   use Shopify Customer Events (checkout_completed) — see docs/ANALYTICS.md.
 */

type Gtag = (...args: unknown[]) => void;
type Fbq = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  callMethod?: (...a: unknown[]) => void;
  push?: unknown;
};
type Ttq = {
  page: () => void;
  track: (event: string, data?: Record<string, unknown>) => void;
  load: (id: string) => void;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    fbq?: Fbq;
    _fbq?: Fbq;
    ttq?: Ttq & unknown[];
  }
}

const loaded = new Set<string>();

function injectScript(src: string, nonce: string | undefined) {
  if (loaded.has(src)) return;
  loaded.add(src);
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  if (nonce) script.nonce = nonce;
  document.head.appendChild(script);
}

function marketingAllowed(): boolean {
  try {
    return window.Shopify?.customerPrivacy?.marketingAllowed?.() === true;
  } catch {
    return false;
  }
}

function analyticsAllowed(): boolean {
  try {
    return window.Shopify?.customerPrivacy?.analyticsProcessingAllowed?.() === true;
  } catch {
    return false;
  }
}

/** Strip query strings and fragments: they can carry tokens or PII. */
export function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url, "https://placeholder.invalid");
    return parsed.origin === "https://placeholder.invalid"
      ? parsed.pathname
      : `${parsed.origin}${parsed.pathname}`;
  } catch {
    return undefined;
  }
}

function ensureGtag(ids: PublicMarketingIds, nonce?: string) {
  const primary = ids.ga4 ?? ids.googleAds;
  if (!primary) return;
  if (!window.gtag) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("consent", "default", {
      ad_storage: marketingAllowed() ? "granted" : "denied",
      ad_user_data: marketingAllowed() ? "granted" : "denied",
      ad_personalization: marketingAllowed() ? "granted" : "denied",
      analytics_storage: "granted",
    });
    window.gtag("js", new Date());
    // We send page views ourselves (SPA), and never send user-provided data.
    if (ids.ga4)
      window.gtag("config", ids.ga4, { send_page_view: false, allow_google_signals: marketingAllowed() });
    if (ids.googleAds && marketingAllowed()) window.gtag("config", ids.googleAds, { send_page_view: false });
  }
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primary)}`, nonce);
}

function ensureMeta(id: string, nonce?: string) {
  if (!window.fbq) {
    const fbq: Fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = fbq;
    window.fbq = fbq;
    window._fbq = fbq;
    window.fbq("init", id);
  }
  injectScript("https://connect.facebook.net/en_US/fbevents.js", nonce);
}

function ensureTikTok(id: string, nonce?: string) {
  if (!window.ttq) {
    const queue: unknown[] = [];
    const stub = queue as unknown as Ttq & unknown[];
    for (const method of ["page", "track", "identify", "load"] as const) {
      (stub as unknown as Record<string, (...a: unknown[]) => void>)[method] = (...args: unknown[]) => {
        queue.push([method, ...args]);
      };
    }
    window.ttq = stub;
  }
  injectScript(
    `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`,
    nonce,
  );
}

type Item = {
  id: string;
  name: string;
  price?: number;
  currency?: string;
  quantity?: number;
  variant?: string;
};

function send(
  ids: PublicMarketingIds,
  nonce: string | undefined,
  event: {
    ga4: string;
    meta?: string;
    tiktok?: string;
    items?: Item[];
    value?: number;
    currency?: string;
    extra?: Record<string, unknown>;
  },
) {
  if (!analyticsAllowed()) return;
  const ads = marketingAllowed();

  if (ids.ga4 || (ids.googleAds && ads)) {
    ensureGtag(ids, nonce);
    window.gtag?.("event", event.ga4, {
      ...(event.items
        ? {
            items: event.items.map((i) => ({
              item_id: i.id,
              item_name: i.name,
              price: i.price,
              quantity: i.quantity,
              item_variant: i.variant,
            })),
          }
        : {}),
      ...(event.value !== undefined ? { value: event.value, currency: event.currency } : {}),
      ...event.extra,
    });
  }
  if (ads && ids.metaPixel && event.meta) {
    ensureMeta(ids.metaPixel, nonce);
    window.fbq?.("track", event.meta, {
      ...(event.items ? { content_ids: event.items.map((i) => i.id), content_type: "product" } : {}),
      ...(event.value !== undefined ? { value: event.value, currency: event.currency } : {}),
    });
  }
  if (ads && ids.tiktokPixel && event.tiktok) {
    ensureTikTok(ids.tiktokPixel, nonce);
    if (event.tiktok === "Pageview") window.ttq?.page();
    else
      window.ttq?.track(event.tiktok, {
        ...(event.items
          ? {
              contents: event.items.map((i) => ({
                content_id: i.id,
                content_name: i.name,
                quantity: i.quantity,
                price: i.price,
              })),
            }
          : {}),
        ...(event.value !== undefined ? { value: event.value, currency: event.currency } : {}),
      });
  }
}

const money = (amount: string | undefined) => (amount ? Number.parseFloat(amount) : undefined);

export function createMarketingDestination(
  ids: PublicMarketingIds,
  nonce?: string,
): StorefrontAnalyticsDestination | null {
  if (!ids.ga4 && !ids.googleAds && !ids.metaPixel && !ids.tiktokPixel) return null;

  return {
    name: "sethavelle-marketing",
    setup({ subscribe }) {
      const offs = [
        subscribe(AnalyticsEvent.PAGE_VIEWED, (payload) => {
          send(ids, nonce, {
            ga4: "page_view",
            meta: "PageView",
            tiktok: "Pageview",
            extra: { page_location: scrubUrl(payload.url) },
          });
        }),
        subscribe(AnalyticsEvent.PRODUCT_VIEWED, (payload) => {
          const items: Item[] = (payload.products ?? []).map((p) => ({
            id: p.variantId ?? p.id,
            name: p.title,
            price: money(p.price?.amount),
            variant: p.variantTitle,
            quantity: 1,
          }));
          const first = payload.products?.[0];
          send(ids, nonce, {
            ga4: "view_item",
            meta: "ViewContent",
            tiktok: "ViewContent",
            items,
            value: money(first?.price?.amount),
            currency: first?.price?.currencyCode,
          });
        }),
        subscribe(AnalyticsEvent.COLLECTION_VIEWED, (payload) => {
          send(ids, nonce, {
            ga4: "view_item_list",
            extra: { item_list_id: payload.collection?.handle },
          });
        }),
        subscribe(AnalyticsEvent.SEARCH_VIEWED, (payload) => {
          send(ids, nonce, {
            ga4: "search",
            meta: "Search",
            tiktok: "Search",
            extra: { search_term: payload.searchTerm },
          });
        }),
        subscribe(AnalyticsEvent.PRODUCT_ADD_TO_CART, (payload) => {
          const line = payload.currentLine;
          if (!line) return;
          const item: Item = {
            id: line.merchandise.id,
            name: line.merchandise.product.title,
            price: money(line.merchandise.price.amount),
            quantity: line.quantity,
            variant: line.merchandise.title,
          };
          send(ids, nonce, {
            ga4: "add_to_cart",
            meta: "AddToCart",
            tiktok: "AddToCart",
            items: [item],
            value: item.price !== undefined ? item.price * (item.quantity ?? 1) : undefined,
            currency: line.merchandise.price.currencyCode,
          });
        }),
      ];
      return () => offs.forEach((off) => off());
    },
  };
}

let currentIds: PublicMarketingIds = {};
let currentNonce: string | undefined;

export function configureMarketing(ids: PublicMarketingIds, nonce?: string) {
  currentIds = ids;
  currentNonce = nonce;
}

/** Begin checkout: the visitor followed the checkout link. Not a purchase. */
export function trackBeginCheckout(value?: { amount: string; currencyCode: string }) {
  send(currentIds, currentNonce, {
    ga4: "begin_checkout",
    meta: "InitiateCheckout",
    tiktok: "InitiateCheckout",
    value: money(value?.amount),
    currency: value?.currencyCode,
  });
}

/** Newsletter signup: sent only after the server confirmed it. No email is sent. */
export function trackNewsletterSignup() {
  send(currentIds, currentNonce, {
    ga4: "sign_up",
    meta: "Lead",
    tiktok: "Subscribe",
    extra: { method: "newsletter" },
  });
}
