import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { customerAccountContext, type CustomerAccount } from "~/lib/customer-account";
import { getAccountAuth, orderGidFromParam, orderParamFromGid } from "~/lib/server/account.server";
import { loader as orderLoader } from "~/routes/account.order";
import { loader as accountLoader } from "~/routes/account";

type Graphql = (
  query: unknown,
  options: { accessToken: string; variables?: Record<string, unknown> },
) => Promise<unknown>;

function contextWith(opts: { token: string | null; graphql?: Graphql } | null) {
  const context = new RouterContextProvider();
  if (opts) {
    const account = {
      client: { graphql: vi.fn(opts.graphql ?? (async () => ({ data: null }))) },
      session: { getOrRefreshAccessToken: vi.fn(async () => opts.token) },
      sessionManager: {},
      requestContext: {},
    } as unknown as CustomerAccount;
    context.set(customerAccountContext, account);
  }
  return context;
}

const ORDER = (customerId: string) => ({
  data: {
    customer: { id: "gid://shopify/Customer/1" },
    order: {
      id: "gid://shopify/Order/42",
      name: "#1001",
      processedAt: "2026-01-01T00:00:00Z",
      financialStatus: "PAID",
      fulfillmentStatus: "FULFILLED",
      statusPageUrl: "https://shopify.com/status",
      customer: { id: customerId },
      subtotal: { amount: "10.0", currencyCode: "USD" },
      totalShipping: { amount: "0.0", currencyCode: "USD" },
      totalTax: { amount: "0.0", currencyCode: "USD" },
      totalPrice: { amount: "10.0", currencyCode: "USD" },
      shippingAddress: { formatted: ["Ada"] },
      lineItems: { nodes: [] },
    },
  },
});

async function thrown(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as Response;
  }
  throw new Error("expected a thrown response");
}

const args = (context: RouterContextProvider, id: string, url = "https://sv.example/account/orders/" + id) =>
  ({ context, params: { id }, request: new Request(url) }) as unknown as Parameters<typeof orderLoader>[0];

describe("order id handling (IDOR / injection)", () => {
  it("only accepts numeric ids", () => {
    expect(orderGidFromParam("42")).toBe("gid://shopify/Order/42");
    for (const bad of ["gid://shopify/Order/42", "42abc", "../1", "", undefined, "1".repeat(21)]) {
      expect(orderGidFromParam(bad)).toBeNull();
    }
    expect(orderParamFromGid("gid://shopify/Order/42")).toBe("42");
    expect(orderParamFromGid("gid://shopify/Customer/42")).toBeNull();
  });
});

describe("account route protection", () => {
  it("reports unavailable without Customer Accounts and signed-out without a token", async () => {
    expect((await getAccountAuth(contextWith(null))).status).toBe("unavailable");
    expect((await getAccountAuth(contextWith({ token: null }))).status).toBe("signed-out");
  });

  it("redirects signed-out visitors away from order details without querying", async () => {
    const graphql = vi.fn<Graphql>();
    const response = await thrown(orderLoader(args(contextWith({ token: null, graphql }), "42")));
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/account");
    expect(graphql).not.toHaveBeenCalled();
  });

  it("404s malformed order ids before calling Shopify", async () => {
    const graphql = vi.fn<Graphql>();
    const response = await thrown(orderLoader(args(contextWith({ token: "t", graphql }), "abc")));
    expect(response.status).toBe(404);
    expect(graphql).not.toHaveBeenCalled();
  });

  it("returns an order owned by the signed-in customer", async () => {
    const graphql = vi.fn<Graphql>(async () => ORDER("gid://shopify/Customer/1"));
    const result = await orderLoader(args(contextWith({ token: "access-token", graphql }), "42"));
    expect(result).toMatchObject({ status: "ok", order: { name: "#1001" } });
    expect(graphql.mock.calls[0]?.[1]).toMatchObject({
      accessToken: "access-token",
      variables: { id: "gid://shopify/Order/42" },
    });
    // The token is used server side only and never returned.
    expect(JSON.stringify(result)).not.toContain("access-token");
  });

  it("404s another customer's order (cross-account isolation)", async () => {
    const graphql = vi.fn<Graphql>(async () => ORDER("gid://shopify/Customer/999"));
    expect((await thrown(orderLoader(args(contextWith({ token: "t", graphql }), "42")))).status).toBe(404);
  });

  it("404s unknown orders identically to foreign ones", async () => {
    const graphql = vi.fn<Graphql>(async () => ({
      data: { customer: { id: "gid://shopify/Customer/1" }, order: null },
    }));
    expect((await thrown(orderLoader(args(contextWith({ token: "t", graphql }), "42")))).status).toBe(404);
  });

  it("builds a login link with a validated, same-origin return path", async () => {
    const context = contextWith({ token: null });
    const result = await accountLoader({
      context,
      params: {},
      request: new Request("https://sv.example/account/orders?x=1"),
    } as unknown as Parameters<typeof accountLoader>[0]);
    expect(result).toMatchObject({ status: "signed-out" });
    const href = (result as { loginHref: string }).loginHref;
    const returnTo = new URL(href, "https://sv.example").searchParams.get("return_to");
    expect(returnTo).toBe("/account/orders?x=1");
  });
});
