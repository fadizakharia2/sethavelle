import { appConfigContext } from "~/lib/server/app-context";

import type { Route } from "./+types/robots";

export function loader({ context, request }: Route.LoaderArgs) {
  const config = context.get(appConfigContext);
  const origin = config.siteUrl ?? new URL(request.url).origin;
  // Demo/mock deployments must never be indexed.
  const body =
    config.storefront.kind === "mock"
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *
Disallow: /cart
Disallow: /account
Disallow: /checkout
Disallow: /api/
Disallow: /search
Disallow: /*?*filter.
Disallow: /*?*sort_by=

User-agent: adsbot-google
Disallow: /cart
Disallow: /account
Disallow: /checkout
Disallow: /search

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `public, max-age=${60 * 60 * 24}`,
    },
  });
}
