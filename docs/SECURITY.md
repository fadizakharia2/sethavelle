# Security

This storefront treats the browser as untrusted, Shopify as the source of truth, and its own worker
as the only place secrets exist.

## Controls

### Secrets and configuration

- Zod-validated config, fail-closed in production (`server.ts` → 503). Errors name variables, never values.
- Private Storefront token used only server side with the buyer IP (`oxygen-buyer-ip`; the
  spoofable `x-forwarded-for` is ignored in production).
- Admin tokens (`shpat_`) are rejected; private and public tokens must differ.
- Loader data uses an explicit allowlist (`toPublicConfig`). `pnpm audit:secrets` scans the client
  bundle for credentials, token shapes and server-only names, and for the _values_ of any secrets
  present in the build environment. Tested in `tests/unit/bundle-audit.test.ts`.

### Customer authentication (Customer Account API)

- OAuth 2.0 Authorization Code + PKCE, `state` and `nonce` — implemented by Hydrogen's
  `createCustomerAccountServerHandlers` (login, authorize callback, refresh, logout). We do not
  re-implement OAuth.
- Post-login return paths go through `safeRedirectPath` (rejects absolute, protocol-relative,
  backslash, encoded and control-character variants). Logout is `POST` only.
- Tokens live only in the encrypted session; loaders return derived profile/order fields, never tokens.
- Account routes resolve the token through `session.getOrRefreshAccessToken` (refresh included);
  failure means signed out.

### Session

- `__Host-sv_session`: `HttpOnly; Secure; SameSite=Lax; Path=/`, no `Domain` (sibling subdomains
  cannot plant it). 14-day max age.
- AES-256-GCM with a key derived by HKDF-SHA-256 from `SESSION_SECRET`: tampering or forgery
  decrypts to an empty session. Rotation via `SESSION_SECRET_PREVIOUS` (old cookies are re-sealed
  with the new key).
- Session id is regenerated whenever authentication state changes (fixation defense).
- Oversized sessions are dropped rather than truncated by the browser.
- Nothing is stored in `localStorage`/`sessionStorage`.

### Authorization (IDOR)

- Order ids from the URL must be numeric; the GID is built server side.
- The Customer Account API scopes `order(id:)` to the signed-in customer, and the loader also
  requires `order.customer.id === customer.id`. Unknown and foreign orders both return 404, so ids
  cannot be probed. Tested in `tests/unit/account.test.ts`.

### Caching

- `/account*` and `/api/*` always get `Cache-Control: private, no-store, max-age=0` and `Vary: Cookie`
  (applied in `server.ts`, after the route). Hydrogen also marks token reads as personalized.

### XSS and injection

- Merchant HTML (descriptions, policies) is converted to **text-only** blocks (`htmlToBlocks`) and
  rendered as React text; no merchant HTML is ever injected.
- The only `dangerouslySetInnerHTML` is JSON-LD via `serializeJsonLd`, which escapes `<`, `>`, `&`,
  U+2028/2029. ESLint enforces `react/no-danger` everywhere else.
- Strict CSP per document: nonce-based `script-src` (no `unsafe-inline`/`unsafe-eval` for scripts),
  vendor hosts added only for configured marketing IDs, `form-action` limited to self + Shopify,
  `upgrade-insecure-requests` in production.
- All GraphQL uses typed documents with variables; user input never builds query text. Handles,
  cursors and ids are regex-validated before use.

### CSRF, abuse and forms

- Custom endpoints (`/api/newsletter`, `/api/contact`) are `POST` only and require a same-origin
  `Origin` (or `Sec-Fetch-Site: same-origin`); headerless requests are rejected.
- Body size cap (16 KB), per-client rate limit, Zod validation, honeypot (silent fake success),
  duplicate suppression (fingerprint claimed before delivery, released on failure), disabled
  submit while in flight.
- Delivery is a signed webhook (`X-Sethavelle-Signature: hex(HMAC-SHA256(secret, body))`, 8 s
  timeout). Receivers **must** verify the signature with a constant-time comparison.
- Without a configured webhook the form returns 503; it never pretends to succeed.
- Hydrogen's cart mutations run through Shopify's handlers; cart prices always come from Shopify,
  and checkout is Shopify-hosted (`cart.checkoutUrl`).

### Headers and errors

- `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
  COOP `same-origin-allow-popups`, restrictive `Permissions-Policy`, HSTS (2 years, preload) in production.
- GET/HEAD with a body → 400. Repeated slashes are collapsed with a same-origin 301.
- Error pages show stacks in development only. Server logs pass through `redactForLog` (Shopify
  token prefixes, JWTs, OAuth `code`/`state`/tokens, `Authorization` headers).

### Supply chain

- Exact versions for Hydrogen, React Router, the Shopify CLI and Playwright; lockfile committed.
- `pnpm.onlyBuiltDependencies` allows install scripts only for `esbuild` and `workerd`.
- Fonts are self-hosted; the only third-party scripts are Shopify's and consented marketing tags.

## Known limits (honest list)

1. **Rate limiting is per worker isolate.** It stops bursts from one client on one isolate, not a
   distributed attack. Add Oxygen/Cloudflare WAF rate-limit rules or a bot challenge on
   `/api/*` and `/account/login` for real abuse protection.
2. **Duplicate suppression is per isolate** for the same reason; receivers should be idempotent.
3. **Without JavaScript, forms post and receive JSON** rather than a rendered page. Functional
   but plain.
4. **CSP `style-src` allows `'unsafe-inline'`** (Hydrogen default; Motion writes inline styles).
5. **No Shopify credentials were available during development.** Customer Account flows are
   covered by unit tests with mocked Shopify clients; run the checklist below against a real store
   before launch.
6. Third-party marketing tags (once consented) execute vendor code; review vendors before enabling.

## Pre-launch checklist

- [ ] Production and Preview use different `SESSION_SECRET`s, ≥ 32 random chars, stored only in Oxygen.
- [ ] `PRIVATE_STOREFRONT_API_TOKEN` is a Storefront token (not Admin) with minimum scopes.
- [ ] `PUBLIC_SITE_URL` set to the production origin; `MOCK_SHOP` unset.
- [ ] Customer Account API: callback URI `https://<domain>/account/authorize`, JavaScript origin and
      logout URI configured; test login, refresh after expiry, logout, and that `/account` is
      `no-store` in the response headers.
- [ ] Sign in as customer A, open customer B's order URL → 404.
- [ ] Try `/account/login?return_to=//evil.example` → lands on a same-site page.
- [ ] Webhook receivers verify `X-Sethavelle-Signature` and are idempotent.
- [ ] WAF rate limits on `/api/*` and `/account/login`.
- [ ] `pnpm validate` passes; `pnpm audit:secrets` run in CI with production secrets present in env.
- [ ] Check response headers on `/` (CSP, HSTS) with securityheaders.com or similar.
- [ ] Cookie banner configured in Shopify (Customer Privacy) and marketing tags only fire after consent.
- [ ] Dependency audit (`pnpm audit`) reviewed.
