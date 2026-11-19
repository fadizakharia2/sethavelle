import { redirect, type RouterContextProvider } from "react-router";

import { customerAccountContext, type CustomerAccount } from "~/lib/customer-account";

export type AccountAuth =
  | { status: "unavailable" }
  | { status: "signed-out" }
  | { status: "signed-in"; accessToken: string; account: CustomerAccount };

/**
 * Resolves the customer's access token for a protected route.
 *
 * - Reading or refreshing the token marks the response personalized, so it is
 *   never stored in a shared cache (Hydrogen's request context does this, and
 *   the worker adds `Cache-Control: private, no-store` on /account/*).
 * - The token is used only server side for Customer Account API calls and is
 *   never returned to the client.
 * - A session whose token cannot be refreshed is treated as signed out.
 */
export async function getAccountAuth(context: Readonly<RouterContextProvider>): Promise<AccountAuth> {
  const account = context.get(customerAccountContext);
  if (!account) return { status: "unavailable" };

  const { session, sessionManager, requestContext } = account;
  const accessToken = await session.getOrRefreshAccessToken(sessionManager, requestContext);
  if (accessToken) return { status: "signed-in", accessToken, account };

  return { status: "signed-out" };
}

/** For nested account routes: signed-out/unavailable visitors go to the account gate. */
export async function requireAccountAuth(context: Readonly<RouterContextProvider>, request: Request) {
  void request;
  const auth = await getAccountAuth(context);
  // Never call this from the /account index route (it would redirect to itself).
  if (auth.status !== "signed-in") throw redirect("/account");
  return auth;
}

/** Accepts only a numeric order id from the URL and builds the GID server side. */
export function orderGidFromParam(param: string | undefined): string | null {
  if (!param || !/^\d{1,20}$/.test(param)) return null;
  return `gid://shopify/Order/${param}`;
}

export function orderParamFromGid(gid: string): string | null {
  const match = /^gid:\/\/shopify\/Order\/(\d{1,20})$/.exec(gid);
  return match ? match[1]! : null;
}
