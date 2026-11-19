import { useEffect, useState } from "react";

import { PageHeader } from "~/components/PageHeader";
import { buildMeta, pageTitle } from "~/lib/seo";

import type { Route } from "./+types/cookies";

export function meta({ matches }: Route.MetaArgs) {
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  return buildMeta({
    title: pageTitle("Cookie Preferences"),
    description: "Review and change how SETHAVELLE uses cookies and similar technologies.",
    canonical: root?.origin ? `${root.origin}/cookies` : undefined,
  });
}

type Consent = { analytics: boolean; marketing: boolean; preferences: boolean } | null;

function readConsent(): Consent {
  const privacy = window.Shopify?.customerPrivacy;
  if (!privacy) return null;
  try {
    return {
      analytics: privacy.analyticsProcessingAllowed(),
      marketing: privacy.marketingAllowed(),
      preferences: privacy.preferencesProcessingAllowed(),
    };
  } catch {
    return null;
  }
}

/**
 * Consent is owned by Shopify's Customer Privacy banner. This page explains
 * the categories and reopens the banner's preferences dialog.
 */
export default function Cookies({ matches }: Route.ComponentProps) {
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  const [consent, setConsent] = useState<Consent>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const update = () => {
      setConsent(readConsent());
      setAvailable(typeof window.privacyBanner?.showPreferences === "function");
    };
    update();
    const timer = window.setInterval(update, 1500);
    document.addEventListener("visitorConsentCollected", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visitorConsentCollected", update);
    };
  }, []);

  const rows = [
    {
      key: "essential",
      title: "Essential",
      body: "Keep your bag, checkout and sign-in working. Always on.",
      state: true,
    },
    {
      key: "preferences",
      title: "Preferences",
      body: "Remember choices such as region and language.",
      state: consent?.preferences,
    },
    {
      key: "analytics",
      title: "Analytics",
      body: "Help us understand how the house is visited, in aggregate.",
      state: consent?.analytics,
    },
    {
      key: "marketing",
      title: "Marketing",
      body: "Measure campaigns (Google Ads, Meta, TikTok) when you allow it.",
      state: consent?.marketing,
    },
  ];

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHeader
        kicker="Legal"
        title="Cookie Preferences"
        lede="Nothing beyond the essentials runs until you choose. You can change your mind at any time."
        origin={root?.origin}
        crumbs={[
          { name: "House", path: "/" },
          { name: "Cookie Preferences", path: "/cookies" },
        ]}
      />
      <section className="max-w-page px-margin mx-auto w-full pb-28">
        <ul role="list" className="max-w-3xl divide-y divide-[#b59660]/15 border-y border-[#b59660]/15">
          {rows.map((row) => (
            <li key={row.key} className="flex items-start justify-between gap-6 py-6">
              <div>
                <h2 className="font-heading text-xl text-[#e5d8c5]">{row.title}</h2>
                <p className="mt-1 text-sm text-[#a89d8e]">{row.body}</p>
              </div>
              <span className="shrink-0 text-[0.625rem] tracking-[0.26em] text-[#b59660] uppercase">
                {row.state === undefined ? "—" : row.state ? "Allowed" : "Declined"}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <button
            type="button"
            className="sv-button sv-button--solid"
            disabled={!available}
            onClick={() => void window.privacyBanner?.showPreferences()}
          >
            Change my choices
          </button>
          {!available ? (
            <p className="mt-4 text-xs text-[#a89d8e]">
              The preferences panel loads with Shopify&apos;s privacy banner when the store is connected.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
