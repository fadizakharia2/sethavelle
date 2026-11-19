# SETHAVELLE — storefront

_The Divine Art of Darkness._ A headless Shopify storefront for a gothic fragrance house, built on
Hydrogen 2026.10 (library mode) + React Router 7, deployed to Oxygen.

|            |                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| Framework  | Hydrogen 2026.10.3 server handlers, React Router 7.15 (framework mode, middleware), React 19, Vite 8 |
| Commerce   | Storefront API (typed `gql` via gql.tada), Shopify cart handlers, hosted checkout only               |
| Accounts   | Customer Account API (OAuth 2.0 + PKCE via Hydrogen's handlers), encrypted `__Host-` session cookie  |
| UI         | Tailwind 4, Motion (`LazyMotion` + `m`), self-hosted Bodoni Moda / Instrument Sans                   |
| Validation | Zod (env config, forms)                                                                              |
| Quality    | TypeScript strict, ESLint (typescript-eslint, jsx-a11y, react-hooks), Prettier, Vitest, Playwright   |

## Quick start

```bash
corepack enable                       # or: COREPACK_ENABLE_STRICT=0 corepack pnpm@10.33.0 ...
pnpm install                          # npm 10 crashes on this dependency tree; use pnpm
cp .env.example .env                  # fill in values — see docs/ENVIRONMENT.md
pnpm dev                              # http://localhost:3000
pnpm dev:https                        # needed for Customer Accounts locally
```

With no store variables set, development falls back to Shopify's public `mock.shop` demo catalog.
Production **refuses to start** without a real store unless `MOCK_SHOP=1` is set explicitly.

## Scripts

| Script                      | What it does                                                                     |
| --------------------------- | -------------------------------------------------------------------------------- |
| `pnpm typecheck`            | Route typegen, `tsc` (strict), and `hydrogen gql check` against the API schema   |
| `pnpm lint` / `pnpm format` | ESLint (bans `dangerouslySetInnerHTML`, `eval`, etc.) / Prettier                 |
| `pnpm test`                 | Vitest unit + security suite (`tests/unit`)                                      |
| `pnpm build`                | Production build into `dist/`                                                    |
| `pnpm audit:secrets`        | Scans `dist/client` for credentials, token shapes, or server-only variable names |
| `pnpm test:e2e`             | Playwright against the production build, served offline (`tests/e2e/harness`)    |
| `pnpm validate`             | All of the above, in order                                                       |
| `pnpm deploy`               | `shopify hydrogen deploy` to Oxygen                                              |

## Structure

```
server.ts                     Oxygen worker: fail-closed config, security headers, private caching
app/root.tsx                  Middleware: storefront client, customer account, cart, Shopify routes
app/entry.server.tsx          Streaming SSR with per-request CSP nonce
app/routes.ts                 Route table (see below)
app/lib/server/*.server.ts    Server-only: config (Zod), session crypto, CSP, security, forms, account auth
app/lib/*.ts                  Isomorphic helpers: SEO/JSON-LD, rich text, metafields, marketing, forms schemas
app/components/               UI; brand/ (sigil, flacon, engraving), home/ (hero, rites), motion/ (reveals)
app/content/                  Brand copy and *creative* fragrance concepts (never product facts)
tests/unit                    Vitest
tests/e2e                     Playwright + offline harness
docs/                         Environment, security, Shopify setup, deployment, analytics
```

### Routes

`/` home · `/shop` · `/collections` · `/collections/:handle` · `/products/:handle` · `/search` · `/cart` ·
`/account` (+ `/orders`, `/orders/:id`) · `/our-story` · `/mythology` · `/contact` · `/faq` ·
`/shipping-returns` · `/privacy` · `/terms` · `/cookies` · `/sitemap.xml` · `/robots.txt` ·
`POST /api/newsletter` · `POST /api/contact`. Hydrogen owns `/account/login`, `/account/authorize`,
`/account/logout` and the cart/predictive-search endpoints.

## Product facts

Notes, ingredients, concentration, prices and availability are **never** in code. They come from
Shopify: prices/availability from the Storefront API, notes and story from `sethavelle.*` product
metafields (see [docs/SHOPIFY_SETUP.md](docs/SHOPIFY_SETUP.md)). When a metafield is empty the page
says so instead of inventing content. `app/content/fragrances.ts` holds only creative direction
(epigraphs, moods, illustration palettes) for the three planned rites.

## Documentation

- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) — every variable, its purpose and exposure
- [docs/SECURITY.md](docs/SECURITY.md) — threat model, controls, checklist, known limits
- [docs/SHOPIFY_SETUP.md](docs/SHOPIFY_SETUP.md) — store configuration this storefront expects
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Oxygen environments, secrets, release steps
- [docs/ANALYTICS.md](docs/ANALYTICS.md) — consent model, events, purchase tracking
- [docs/DESIGN.md](docs/DESIGN.md) — design system and motion principles
