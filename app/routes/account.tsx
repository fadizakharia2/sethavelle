import { gql } from "@shopify/hydrogen/customer-account";
import { NavLink, Outlet } from "react-router";

import { Sigil } from "~/components/brand/Sigil";
import { PageHeader } from "~/components/PageHeader";
import { safeRedirectPath } from "~/lib/server/security.server";
import { getAccountAuth } from "~/lib/server/account.server";
import { buildMeta, pageTitle } from "~/lib/seo";

import type { Route } from "./+types/account";

const ACCOUNT_SHELL_QUERY = gql(`
  query AccountShell {
    customer {
      firstName
    }
  }
`);

export function meta() {
  return buildMeta({ title: pageTitle("Account"), noindex: true });
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const auth = await getAccountAuth(context);
  if (auth.status === "unavailable") return { status: "unavailable" } as const;
  if (auth.status === "signed-out") {
    // Return-to is validated as a same-origin path before it reaches the login handler.
    const returnTo = safeRedirectPath(url.pathname + url.search, "/account");
    return {
      status: "signed-out",
      loginFailed: url.searchParams.get("login") === "failed",
      loginHref: `/account/login?return_to=${encodeURIComponent(returnTo)}`,
    } as const;
  }

  try {
    const { data } = await auth.account.client.graphql(ACCOUNT_SHELL_QUERY, {
      accessToken: auth.accessToken,
    });
    return { status: "signed-in", firstName: data?.customer?.firstName ?? null } as const;
  } catch {
    return { status: "signed-in", firstName: null } as const;
  }
}

const NAV = [
  { to: "/account", label: "Overview", end: true },
  { to: "/account/orders", label: "Orders", end: false },
];

export default function AccountLayout({ loaderData }: Route.ComponentProps) {
  if (loaderData.status === "unavailable") {
    return (
      <main id="main-content" tabIndex={-1} className="flex-1">
        <PageHeader kicker="Account" title="The private rooms" italic="are not yet open" />
        <section className="max-w-page px-margin mx-auto w-full pb-28">
          <div className="sv-panel sv-frame max-w-2xl p-10">
            <p className="text-[#a89d8e]">
              Customer accounts become available once the store is connected to Shopify&apos;s Customer
              Account API and served over HTTPS.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (loaderData.status === "signed-out") {
    return (
      <main id="main-content" tabIndex={-1} className="flex-1">
        <section className="max-w-page px-margin mx-auto grid w-full flex-1 items-center gap-16 py-20 md:py-32 lg:grid-cols-2">
          <div>
            <p className="sv-kicker mb-5">Account</p>
            <h1 className="sv-display text-[clamp(2.75rem,1.5rem+5vw,6rem)] text-[#e5d8c5]">
              Enter the <span className="sv-italic text-[#b59660]">private rooms</span>
            </h1>
            <p className="sv-lede mt-8 max-w-md">
              Sign in to review your orders and correspondence. Shopify verifies your identity with a one-time
              code: there is no password to remember.
            </p>
            {loaderData.loginFailed ? (
              <p role="alert" className="mt-6 border border-[#d8798a]/40 p-4 text-sm text-[#d8798a]">
                We couldn&apos;t sign you in. Please try again.
              </p>
            ) : null}
            {/* Full document navigation: the login handler redirects to Shopify. */}
            <a href={loaderData.loginHref} className="sv-button sv-button--solid mt-10" data-testid="sign-in">
              Sign in
            </a>
          </div>
          <div className="hidden justify-center lg:flex">
            <Sigil className="h-[420px] w-auto text-[#b59660]/40" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHeader
        kicker="Account"
        title={loaderData.firstName ? `Welcome back,` : "Your account"}
        italic={loaderData.firstName ?? undefined}
      />
      <div className="max-w-page px-margin mx-auto grid w-full gap-12 pb-28 lg:grid-cols-[14rem_1fr]">
        <nav
          aria-label="Account"
          className="lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:self-start"
        >
          <ul
            role="list"
            className="flex gap-6 border-b border-[#b59660]/15 pb-4 lg:flex-col lg:gap-4 lg:border-b-0 lg:border-l lg:pb-0 lg:ps-6"
          >
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className="sv-link text-[0.6875rem] tracking-[0.26em] text-[#a89d8e] uppercase aria-[current=page]:text-[#e5d8c5]"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="lg:mt-6">
              {/* Plain form POST: the logout handler checks same-origin and redirects to Shopify. */}
              <form method="post" action="/account/logout">
                <button
                  type="submit"
                  className="sv-link cursor-pointer text-[0.6875rem] tracking-[0.26em] text-[#a89d8e] uppercase hover:text-[#e5d8c5]"
                >
                  Sign out
                </button>
              </form>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
