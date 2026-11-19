import { useEffect } from "react";

import { useNonce } from "~/lib/csp";
import { configureMarketing, createMarketingDestination } from "~/lib/marketing";
import type { PublicMarketingIds } from "~/lib/public-config";

/** Registers the consent-gated marketing destination with Hydrogen's analytics bus. */
export function MarketingDestinations({ ids }: { ids: PublicMarketingIds }) {
  const nonce = useNonce();
  const key = JSON.stringify(ids);

  useEffect(() => {
    configureMarketing(ids, nonce);
    const destination = createMarketingDestination(ids, nonce);
    if (!destination) return;

    let remove: (() => void) | undefined;
    let tries = 0;
    // The bus is created by Shopify's runtime script; wait briefly for it.
    const attach = () => {
      const bus = window.Shopify?.analytics;
      if (bus) {
        remove = bus.addDestination(destination);
        return;
      }
      if (tries++ < 40) timer = window.setTimeout(attach, 250);
    };
    let timer = window.setTimeout(attach, 0);
    return () => {
      window.clearTimeout(timer);
      remove?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  return null;
}
