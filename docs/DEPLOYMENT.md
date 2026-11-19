# Deployment (Oxygen)

## Environments

| Oxygen environment | Branch         | Notes                                                                    |
| ------------------ | -------------- | ------------------------------------------------------------------------ |
| Production         | `main`         | Real secrets; `PUBLIC_SITE_URL` = production origin                      |
| Preview            | other branches | **Separate** `SESSION_SECRET` and webhook secrets; may use `MOCK_SHOP=1` |

Set variables in Shopify admin → Hydrogen → Storefront settings → Environments and variables. Mark
every server variable (see docs/ENVIRONMENT.md) as **secret**.

## Release

```bash
pnpm install --frozen-lockfile
pnpm validate          # typecheck, lint, unit tests, build, secret audit, e2e
pnpm deploy            # or connect the GitHub repo in the Hydrogen channel for CI deploys
```

For GitHub-based deploys, add `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm audit:secrets`
as a required check before the Oxygen deploy step.

## Secret rotation

1. Set `SESSION_SECRET_PREVIOUS` = current secret, `SESSION_SECRET` = new secret; deploy.
2. Old cookies keep working and are re-sealed with the new key on their next write.
3. After 14 days (cookie max age) remove `SESSION_SECRET_PREVIOUS`; deploy.
   Rotate Storefront tokens in Shopify, update Oxygen, deploy, then revoke the old token.

## Logging and monitoring

- Server logs go through `logServerError`/`redactForLog`; never add `console.log(request)` or log
  headers/cookies.
- Watch for `Invalid storefront configuration` (worker answering 503) right after a deploy.
- Add WAF rate-limit rules (see docs/SECURITY.md → Known limits).

## Rollback

Oxygen keeps previous deployments; promote the last good one from the Hydrogen channel.
