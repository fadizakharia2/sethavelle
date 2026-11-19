import { createCartServerHandlers, type ShopifyRequestContext } from "@shopify/hydrogen";
import {
  createCustomerAccountClient,
  createCustomerAccountServerHandlers,
  createCustomerSession,
  type CustomerAccountClient,
  type CustomerSession,
  type WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";
import { createContext } from "react-router";

import type { AppConfig } from "~/lib/server/config.server";
import { createRequestSessionManager } from "~/lib/server/session.server";

export type CustomerAccount = {
  client: CustomerAccountClient;
  session: CustomerSession;
  sessionManager: WritableCustomerSessionManager;
  requestContext: ShopifyRequestContext;
};

/** `null` when Customer Accounts are not configured or not reachable (HTTP). */
export const customerAccountContext = createContext<CustomerAccount | null>(null);

function createSyncedCartHandlers(session: CustomerSession) {
  return createCartServerHandlers({ customerSession: session });
}

export type SyncedCartHandlers = ReturnType<typeof createSyncedCartHandlers>;

type CachedHandlers = {
  key: string;
  session: CustomerSession;
  cartHandlers: SyncedCartHandlers;
  accountHandlers: ReturnType<typeof createCustomerAccountServerHandlers>;
};

// Reused across requests in an isolate so concurrent token refreshes for the
// same customer share one request to Shopify.
let cached: CachedHandlers | undefined;

function getHandlers(shopId: string, clientId: string): CachedHandlers {
  const key = `${shopId}:${clientId}`;
  if (cached?.key === key) return cached;

  const session = createCustomerSession({ shopId, customerAccountApiClientId: clientId });
  // Same customerSession on both groups: carts get the buyer identity on
  // sign-in and are detached on logout or definitive refresh rejection.
  const cartHandlers = createSyncedCartHandlers(session);
  const accountHandlers = createCustomerAccountServerHandlers({
    customerSession: session,
    cartServerHandlers: cartHandlers,
    defaultPostLoginRedirectPathname: "/account",
  });
  cached = { key, session, cartHandlers, accountHandlers };
  return cached;
}

/**
 * Customer Accounts need a real store, SHOP_ID, PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
 * SESSION_SECRET, and HTTPS (the OAuth callback must be an HTTPS origin).
 */
export async function createRequestCustomerAccount(
  request: Request,
  config: AppConfig,
  requestContext: ShopifyRequestContext,
) {
  const account = config.customerAccount;
  if (!account) return null;
  if (new URL(request.url).protocol !== "https:") return null;

  const handlers = getHandlers(account.shopId, account.clientId);

  return {
    cartHandlers: handlers.cartHandlers,
    accountHandlers: handlers.accountHandlers,
    customerAccount: {
      client: createCustomerAccountClient({ shopId: account.shopId, requestContext }),
      session: handlers.session,
      sessionManager: await createRequestSessionManager(request, account.sessionSecrets),
      requestContext,
    } satisfies CustomerAccount,
  };
}
