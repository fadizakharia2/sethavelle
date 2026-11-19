import { handleShopifyRedirects, handleShopifyRoutes } from "@shopify/hydrogen";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
  useRouteLoaderData,
} from "react-router";

import { CartAnalyticsTracker, PageViewedTracker } from "~/components/AnalyticsTrackers";
import { Sigil } from "~/components/brand/Sigil";
import { CartDrawer } from "~/components/CartDrawer";
import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { MarketingDestinations } from "~/components/MarketingDestinations";
import { NavigationProgress } from "~/components/NavigationProgress";
import { SearchDrawer } from "~/components/SearchDrawer";
import { CartProvider } from "~/lib/cart";
import { cartHandlers as anonymousCartHandlers } from "~/lib/cart-handlers";
import { useNonce } from "~/lib/csp";
import { createRequestCustomerAccount, customerAccountContext } from "~/lib/customer-account";
import { envContext } from "~/lib/env";
import { predictiveSearchHandlers } from "~/lib/predictive-search-handlers";
import { loadRootLayout } from "~/lib/root-layout";
import { routeTemplates } from "~/lib/route-templates";
import { appConfigContext, loadCartContext, type LoadCart } from "~/lib/server/app-context";
import { getConfig, toPublicConfig } from "~/lib/server/config.server";
import { createEphemeralSessionManager } from "~/lib/server/session.server";
import { analyticsConsent, resolveShopIdentity } from "~/lib/shop";
import { createRequestStorefrontClient, storefrontClientContext } from "~/lib/storefront";

import type { Route } from "./+types/root";

import appStylesHref from "./app.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: appStylesHref },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "preconnect", href: "https://cdn.shopify.com" },
];

export const middleware: Route.MiddlewareFunction[] = [
  async ({ context, request }, next) => {
    const config = getConfig(context.get(envContext));
    const storefrontClient = createRequestStorefrontClient(request, config, context.cache, context.waitUntil);
    const requestContext = storefrontClient.requestContext;
    const account = await createRequestCustomerAccount(request, config, requestContext);
    const sessionManager = account?.customerAccount.sessionManager ?? createEphemeralSessionManager(request);

    const shopifyRoute = handleShopifyRoutes({
      request,
      requestContext,
      sessionManager,
      storefrontClient,
      routeTemplates,
      handlers: account
        ? [account.cartHandlers, predictiveSearchHandlers, account.accountHandlers]
        : [anonymousCartHandlers, predictiveSearchHandlers],
    });

    if (shopifyRoute) return shopifyRoute;

    context.set(appConfigContext, config);
    // Both handler groups return the same cart fragment; the synced variant
    // additionally needs the session to attach the buyer identity.
    const loadCart: LoadCart = account
      ? () =>
          account.cartHandlers.get({
            storefrontClient,
            request,
            sessionManager,
            requestContext,
          }) as unknown as ReturnType<LoadCart>
      : () => anonymousCartHandlers.get({ storefrontClient, request });
    context.set(loadCartContext, loadCart);
    context.set(storefrontClientContext, storefrontClient);
    context.set(customerAccountContext, account?.customerAccount ?? null);

    const response = await next();
    const sessionHeaders = new Headers((await sessionManager.commit?.()) ?? undefined);
    for (const [name, value] of sessionHeaders) response.headers.append(name, value);
    if (response.status === 404) {
      const redirect = await handleShopifyRedirects({
        request,
        storefrontClient,
        routeTemplates,
      });

      if (redirect) return redirect;
    }

    requestContext.applyResponseHeaders(response.headers);
    return response;
  },
];

export async function loader({ context, request }: Route.LoaderArgs) {
  const config = context.get(appConfigContext);
  const storefrontClient = context.get(storefrontClientContext);
  const loadCart = context.get(loadCartContext);
  const [cartResult, layout] = await Promise.all([loadCart(), loadRootLayout(storefrontClient)]);

  return {
    cartData: cartResult.data,
    shopInfo: layout.shopInfo,
    shopIdentity: resolveShopIdentity(config, layout.shopId),
    currency: layout.currency,
    locale: storefrontClient.locale,
    // Explicit allowlist — never spread `config` or `env` into loader data.
    publicConfig: toPublicConfig(config),
    origin: config.siteUrl ?? new URL(request.url).origin,
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const nonce = useNonce();
  const navigate = useNavigate();
  // Absent when the root loader failed (error page only).
  const rootData = useRouteLoaderData<typeof loader>("root");

  return (
    <html lang="en" className="bg-[#0b0b0d]">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0b0b0d" />
        <meta name="color-scheme" content="dark" />
        {rootData ? (
          <ShopifyScripts
            nonce={nonce}
            i18n={{ ...rootData.locale, currency: rootData.currency }}
            shop={rootData.shopIdentity.scriptShop}
            analytics={{ channel: rootData.shopIdentity.analyticsShop.channel }}
            shopifyAnalytics={rootData.shopIdentity.shopifyAnalytics}
            consent={analyticsConsent}
            navigate={navigate}
            routes={routeTemplates}
          />
        ) : null}
        <Meta />
        <Links />
      </head>
      <body className="text-on-surface font-body flex min-h-svh flex-col bg-[#0b0b0d] antialiased">
        <a
          href="#main-content"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4 focus-visible:z-[80] focus-visible:bg-[#57151f] focus-visible:px-5 focus-visible:py-3 focus-visible:text-[#e5d8c5]"
        >
          Skip to content
        </a>
        <LazyMotion features={domAnimation} strict>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </LazyMotion>
        <div aria-hidden="true" className="sv-grain" />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <CartProvider initialData={loaderData.cartData}>
      <NavigationProgress />
      <PageViewedTracker />
      <CartAnalyticsTracker />
      <MarketingDestinations ids={loaderData.publicConfig.marketing} />
      <Header />
      <Outlet />
      <Footer shopInfo={loaderData.shopInfo} />
      <CartDrawer />
      <SearchDrawer />
    </CartProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  // When the root loader succeeded (e.g. a route 404), keep the house's chrome.
  const rootData = useRouteLoaderData<typeof loader>("root");
  const content = <ErrorContent error={error} />;
  if (!rootData) return content;
  return (
    <CartProvider initialData={rootData.cartData}>
      <Header />
      {content}
      <Footer shopInfo={rootData.shopInfo} />
      <CartDrawer />
      <SearchDrawer />
    </CartProvider>
  );
}

function ErrorContent({ error }: { error: unknown }) {
  let status = 500;
  let title = "Something stirred in the dark";
  let details = "An unexpected error occurred. Please try again in a moment.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = "This passage leads nowhere";
      details = "The page you sought has been sealed, moved, or never existed.";
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    // Development only: production visitors never see messages or stacks.
    details = error.message;
    stack = error.stack;
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-page px-margin mx-auto flex min-h-[80svh] w-full flex-1 flex-col items-center justify-center py-32 text-center"
    >
      <Sigil className="mb-10 h-28 w-auto text-[#b59660]" />
      <p className="sv-kicker mb-4">Error {status}</p>
      <h1 className="sv-display max-w-3xl text-[clamp(2.5rem,1.5rem+4vw,5rem)]">{title}</h1>
      <p className="sv-lede mt-6 max-w-lg">{details}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link to="/" className="sv-button sv-button--solid" reloadDocument>
          Return to the house
        </Link>
        <Link to="/shop" className="sv-button" reloadDocument>
          The collection
        </Link>
      </div>
      {stack ? (
        <pre className="mt-12 w-full max-w-4xl overflow-x-auto border border-[#b59660]/30 p-4 text-left text-xs">
          <code>{stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
