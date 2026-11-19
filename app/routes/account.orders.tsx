import { gql } from "@shopify/hydrogen/customer-account";
import { Link, useNavigation } from "react-router";

import { formatStatus, orderDate, StatusPill } from "~/components/account/OrderStatus";
import { formatPrice } from "~/lib/money";
import { orderParamFromGid, requireAccountAuth } from "~/lib/server/account.server";

import type { Route } from "./+types/account.orders";

const PAGE_SIZE = 10;
const CURSOR = /^[A-Za-z0-9+/=_-]{1,512}$/;

const ORDERS_QUERY = gql(`
  query AccountOrders($first: Int, $after: String, $last: Int, $before: String) {
    customer {
      orders(first: $first, after: $after, last: $last, before: $before, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          financialStatus
          fulfillmentStatus
          totalPrice {
            amount
            currencyCode
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  }
`);

export async function loader({ context, request }: Route.LoaderArgs) {
  const auth = await requireAccountAuth(context, request);
  const params = new URL(request.url).searchParams;
  const before = params.get("before");
  const after = params.get("after");
  // Cursors are opaque strings from Shopify; reject anything else.
  const variables =
    before && CURSOR.test(before)
      ? { last: PAGE_SIZE, before }
      : { first: PAGE_SIZE, after: after && CURSOR.test(after) ? after : null };

  try {
    const { data, errors } = await auth.account.client.graphql(ORDERS_QUERY, {
      accessToken: auth.accessToken,
      variables,
    });
    if (errors?.length || !data?.customer) return { status: "error" } as const;
    const { nodes, pageInfo } = data.customer.orders;
    return {
      status: "ok",
      orders: nodes.map((order) => ({
        param: orderParamFromGid(order.id),
        name: order.name,
        processedAt: order.processedAt,
        financialStatus: order.financialStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        totalPrice: order.totalPrice,
      })),
      pageInfo,
    } as const;
  } catch {
    return { status: "error" } as const;
  }
}

export default function AccountOrders({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const paging = navigation.state === "loading" && navigation.location?.pathname === "/account/orders";

  if (loaderData.status === "error") {
    return (
      <p role="alert" className="sv-panel p-6 text-[#a89d8e]">
        We couldn&apos;t load your orders. Please try again shortly.
      </p>
    );
  }
  const { orders, pageInfo } = loaderData;

  return (
    <section aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="font-heading mb-8 text-4xl text-[#e5d8c5]">
        Order history
      </h2>
      {orders.length === 0 ? (
        <div className="border border-dashed border-[#b59660]/25 p-10 text-center">
          <p className="font-heading text-2xl text-[#e5d8c5]">No orders yet.</p>
          <Link to="/shop" className="sv-button mt-6">
            Discover the collection
          </Link>
        </div>
      ) : (
        <ul
          role="list"
          aria-busy={paging}
          className={`divide-y divide-[#b59660]/15 border-y border-[#b59660]/15 transition-opacity ${paging ? "opacity-50" : ""}`}
        >
          {orders.map((order) => (
            <li key={order.name} className="grid gap-3 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {order.param ? (
                  <Link
                    to={`/account/orders/${order.param}`}
                    className="font-heading text-2xl text-[#e5d8c5] hover:text-[#b59660]"
                  >
                    Order {order.name}
                  </Link>
                ) : (
                  <span className="font-heading text-2xl">Order {order.name}</span>
                )}
                <time dateTime={order.processedAt} className="text-sm text-[#a89d8e]">
                  {orderDate.format(new Date(order.processedAt))}
                </time>
                <StatusPill>{formatStatus(order.financialStatus)}</StatusPill>
                <StatusPill>{formatStatus(order.fulfillmentStatus)}</StatusPill>
              </div>
              <span className="text-lg text-[#e5d8c5] tabular-nums sm:text-right">
                {formatPrice(order.totalPrice)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {pageInfo.hasPreviousPage || pageInfo.hasNextPage ? (
        <nav aria-label="Order pages" className="mt-10 flex justify-between gap-4">
          {pageInfo.hasPreviousPage && pageInfo.startCursor ? (
            <Link
              to={`?before=${encodeURIComponent(pageInfo.startCursor)}`}
              preventScrollReset
              className="sv-button"
            >
              Newer
            </Link>
          ) : (
            <span />
          )}
          {pageInfo.hasNextPage && pageInfo.endCursor ? (
            <Link
              to={`?after=${encodeURIComponent(pageInfo.endCursor)}`}
              preventScrollReset
              className="sv-button"
            >
              Older
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
