# Environment variables

All variables are validated at startup by `app/lib/server/config.server.ts` (Zod). An invalid
configuration makes the worker answer **503** with a generic message; the log names the variable
and the rule it broke, **never its value**.

**Exposure** — _server_: read only inside the worker, never serialized to the browser.
_public_: an identifier that is safe for the browser to see (it may or may not actually be sent).
The only values ever sent to the browser are those in `toPublicConfig()` plus what Hydrogen's
`ShopifyScripts` needs (shop domain, storefront ID, locale). `pnpm audit:secrets` fails the build if a
server-only name or credential shape appears in `dist/client`.

| Variable                                | Exposure   | Required    | Purpose                                                                                                                                     |
| --------------------------------------- | ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_STORE_DOMAIN`                   | public     | prod        | `your-store.myshopify.com`. Must be a `*.myshopify.com` domain.                                                                             |
| `PUBLIC_CHECKOUT_DOMAIN`                | public     | no          | Custom checkout hostname; added to CSP `form-action`.                                                                                       |
| `PUBLIC_STOREFRONT_ID`                  | public     | no          | Hydrogen storefront ID; enables Shopify analytics attribution. Oxygen injects it.                                                           |
| `PRIVATE_STOREFRONT_API_TOKEN`          | **server** | prod*       | Preferred Storefront API token, used server side with the buyer IP. Oxygen injects it. Rejected if it looks like an Admin token (`shpat_`). |
| `PUBLIC_STOREFRONT_API_TOKEN`           | public     | prod*       | Fallback when no private token exists. Must differ from the private token.                                                                  |
| `MOCK_SHOP`                             | server     | no          | `1` forces the tokenless mock.shop demo (also disables indexing via robots.txt).                                                            |
| `SHOP_ID`                               | server     | accounts    | Numeric shop ID for the Customer Account API.                                                                                               |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` | public     | accounts    | Customer Account API client ID (headless).                                                                                                  |
| `SESSION_SECRET`                        | **server** | accounts    | ≥ 32 random chars. Derives the AES-256-GCM session key (HKDF). `openssl rand -base64 48`                                                    |
| `SESSION_SECRET_PREVIOUS`               | **server** | no          | Previous secret, accepted for decryption only during a rotation.                                                                            |
| `PUBLIC_SITE_URL`                       | public     | recommended | Canonical origin (`https://…`) for canonical tags, sitemap, Open Graph.                                                                     |
| `SHOP_ALL_COLLECTION_HANDLE`            | server     | no          | Collection behind `/shop` (default `all`).                                                                                                  |
| `PUBLIC_GA4_MEASUREMENT_ID`             | public     | no          | `G-…`. Loaded only after analytics consent.                                                                                                 |
| `PUBLIC_GOOGLE_ADS_ID`                  | public     | no          | `AW-…`. Loaded only after marketing consent.                                                                                                |
| `PUBLIC_META_PIXEL_ID`                  | public     | no          | Numeric. Marketing consent only.                                                                                                            |
| `PUBLIC_TIKTOK_PIXEL_ID`                | public     | no          | Marketing consent only.                                                                                                                     |
| `NEWSLETTER_WEBHOOK_URL` / `_SECRET`    | **server** | no          | HTTPS endpoint + ≥ 32-char HMAC secret for newsletter sign-ups. Without them the form answers 503 (no fake success).                        |
| `CONTACT_WEBHOOK_URL` / `_SECRET`       | **server** | no          | Same, for the contact form.                                                                                                                 |

\* One of the two Storefront tokens is required whenever `PUBLIC_STORE_DOMAIN` is set.
Customer Accounts need **all three** of `SHOP_ID`, `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`,
`SESSION_SECRET` (a partial set is an error), a real store, and HTTPS.

## Rules

- `.env` and every `.env.*` except `.env.example` are git-ignored. `.env.example` holds placeholders only.
- Never reuse secrets across Preview and Production.
- Never return `context.env` or the config object from a loader; use `toPublicConfig()`.
- Marketing IDs are identifiers, not secrets, but are still format-validated so a typo cannot inject
  script URLs.
