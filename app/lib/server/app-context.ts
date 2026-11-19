import { createContext } from "react-router";

import type { cartHandlers } from "~/lib/cart-handlers";
import type { AppConfig } from "~/lib/server/config.server";

/** Validated config for this request (server only — never return it from a loader). */
export const appConfigContext = createContext<AppConfig>();

/**
 * Reads the current cart through Hydrogen's cart handlers (customer-synced
 * when Customer Accounts are enabled). Always Shopify's authoritative data.
 */
export type LoadCart = () => ReturnType<typeof cartHandlers.get>;
export const loadCartContext = createContext<LoadCart>();
