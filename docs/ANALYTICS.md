# Analytics and marketing

## Model

- Shopify's analytics bus (`ShopifyScripts`, `window.Shopify.analytics`) is the single event source.
  Page, product, collection, search and cart events are published by the storefront; Shopify
  analytics run under Shopify's consent rules.
- `app/lib/marketing.ts` registers one destination that forwards events to GA4, Google Ads, Meta
  Pixel and TikTok Pixel **only for IDs that are configured** and **only after consent**:
  GA4 needs analytics consent; Ads/Meta/TikTok need marketing consent
  (`window.Shopify.customerPrivacy`). Vendor scripts are injected lazily with the CSP nonce.
- URLs are scrubbed to origin + path before sending (no query strings: they can carry OAuth codes,
  search terms or emails). No email, name or other PII is sent to any vendor.

## Events

| Storefront event      | GA4              | Meta               | TikTok             |
| --------------------- | ---------------- | ------------------ | ------------------ |
| page viewed           | `page_view`      | `PageView`         | `Pageview`         |
| product viewed        | `view_item`      | `ViewContent`      | `ViewContent`      |
| collection viewed     | `view_item_list` | —                  | —                  |
| search viewed         | `search`         | `Search`           | `Search`           |
| product added to cart | `add_to_cart`    | `AddToCart`        | `AddToCart`        |
| checkout link clicked | `begin_checkout` | `InitiateCheckout` | `InitiateCheckout` |
| newsletter success    | `sign_up`        | `Lead`             | `Subscribe`        |

## Purchases

The storefront **never** reports a purchase: checkout is hosted by Shopify, and a click on the
checkout button or a visit to a success URL is not proof of payment. Track purchases with Shopify
**Customer Events** (Settings → Customer events → custom pixel subscribing to `checkout_completed`)
or the vendors' official Shopify apps, which run inside checkout with Shopify's consent handling.
Avoid installing both an app and a custom pixel for the same vendor (double counting).

## Enabling a vendor

Set the matching `PUBLIC_*` ID in Oxygen and deploy. The CSP widens automatically for that vendor
only (`app/lib/server/csp.server.ts`).
