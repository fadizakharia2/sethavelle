# SETHAVELLE storefront — agent notes

Read README.md and docs/SECURITY.md first.

- Hydrogen 2026.10 **library mode**: wiring lives in `app/root.tsx` middleware and `server.ts`.
- Package manager: pnpm 10.33 (`COREPACK_ENABLE_STRICT=0 corepack pnpm@10.33.0`). npm 10 crashes.
- Before finishing a change: `pnpm typecheck && pnpm lint && pnpm test`; for UI changes also
  `pnpm build && pnpm audit:secrets && pnpm test:e2e`.
- Never invent product facts (notes, ingredients, prices, longevity). They come from Shopify
  (metafields namespace `sethavelle`, see docs/SHOPIFY_SETUP.md).
- Server-only code goes in `*.server.ts`. Never return env/config from loaders; use `toPublicConfig`.
- No `dangerouslySetInnerHTML` except `JsonLd`; merchant HTML goes through `htmlToBlocks`.
- New form endpoints use `handleFormPost` (CSRF, rate limit, Zod, honeypot, dedupe, signed webhook).
- New third-party scripts need a consent gate in `app/lib/marketing.ts` and CSP hosts in
  `app/lib/server/csp.server.ts`.
- Use the Shopify AI Toolkit / Hydrogen skills in `node_modules/@shopify/hydrogen/skills` for API work.
