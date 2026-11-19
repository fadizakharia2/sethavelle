import { gql } from "@shopify/hydrogen/customer-account";
import { Link } from "react-router";

import { formatStatus, orderDate, StatusPill } from "~/components/account/OrderStatus";
import { formatPrice } from "~/lib/money";
import { orderGidFromParam, requireAccountAuth } from "~/lib/server/account.server";

import type { Route } from "./+types/account.order";

const ORDER_QUERY = gql(`
  query AccountOrder($id: ID!) {
    customer {
      id
    }
    order(id: $id) {
      id
      name
      processedAt
      financialStatus
      fulfillmentStatus
      statusPageUrl
      customer {
        id
      }
      subtotal {
        amount
        currencyCode
      }
      totalShipping {
        amount
        currencyCode
      }
      totalTax {
        amount
        currencyCode
      }
      totalPrice {
        amount
        currencyCode
      }
      shippingAddress {
        formatted(withName: true)
      }
      lineItems(first: 50) {
        nodes {
          id
          title
          variantTitle
          quantity
          totalPrice {
            amount
            currencyCode
          }
          image {
            url
            altText
          }
        }
      }
    }
  }
`);

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const auth = await requireAccountAuth(context, request);
  const id = orderGidFromParam(params.id);
  if (!id) throw new Response("Not Found", { status: 404 });

  let result;
  try {
    result = await auth.account.client.graphql(ORDER_QUERY, {
      accessToken: auth.accessToken,
      variables: { id },
    });
  } catch {
    return { status: "error" } as const;
  }
  const { data } = result;
  const order = data?.order;
  // Ownership check (defense in depth): the Customer Account API scopes
  // `order(id:)` to the signed-in customer, and we also require the order's
  // customer to match. Unknown and foreign orders are indistinguishable (404),
  // so IDs cannot be probed.
  if (!order || !data?.customer?.id || order.customer?.id !== data.customer.id) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    status: "ok",
    order: {
      name: order.name,
      processedAt: order.processedAt,
      financialStatus: order.financialStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      statusPageUrl: order.statusPageUrl,
      subtotal: order.subtotal,
      totalShipping: order.totalShipping,
      totalTax: order.totalTax,
      totalPrice: order.totalPrice,
      shippingAddress: order.shippingAddress?.formatted ?? [],
      lineItems: order.lineItems.nodes,
    },
  } as const;
}

export default function AccountOrder({ loaderData }: Route.ComponentProps) {
  if (loaderData.status === "error") {
    return (
      <p role="alert" className="sv-panel p-6 text-[#a89d8e]">
        We couldn&apos;t load this order. Please try again shortly.
      </p>
    );
  }
  const { order } = loaderData;
  const totals = [
    ["Subtotal", order.subtotal],
    ["Shipping", order.totalShipping],
    ["Tax", order.totalTax],
  ] as const;

  return (
    <article aria-labelledby="order-heading">
      <Link
        to="/account/orders"
        className="sv-link mb-8 inline-block text-[0.625rem] tracking-[0.26em] text-[#a89d8e] uppercase"
      >
        ← All orders
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#b59660]/15 pb-8">
        <div>
          <h2 id="order-heading" className="font-heading text-4xl text-[#e5d8c5] md:text-5xl">
            Order {order.name}
          </h2>
          <time dateTime={order.processedAt} className="mt-2 block text-sm text-[#a89d8e]">
            Placed {orderDate.format(new Date(order.processedAt))}
          </time>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill>{formatStatus(order.financialStatus)}</StatusPill>
          <StatusPill>{formatStatus(order.fulfillmentStatus)}</StatusPill>
        </div>
      </div>

      <div className="mt-10 grid gap-12 xl:grid-cols-[1.5fr_1fr]">
        <ul role="list" className="divide-y divide-[#b59660]/15">
          {order.lineItems.map((item) => (
            <li key={item.id} className="flex gap-5 py-5">
              <div className="h-24 w-20 shrink-0 overflow-hidden bg-[#141216]">
                {item.image ? (
                  <img
                    src={item.image.url}
                    alt={item.image.altText ?? item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-wrap justify-between gap-2">
                <div>
                  <p className="font-heading text-lg text-[#e5d8c5]">{item.title}</p>
                  {item.variantTitle ? <p className="text-sm text-[#a89d8e]">{item.variantTitle}</p> : null}
                  <p className="mt-1 text-sm text-[#a89d8e]">Quantity {item.quantity}</p>
                </div>
                {item.totalPrice ? (
                  <p className="text-[#e5d8c5] tabular-nums">{formatPrice(item.totalPrice)}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <aside className="sv-panel h-fit p-8">
          <dl className="space-y-3 text-sm">
            {totals.map(([label, money]) =>
              money ? (
                <div key={label} className="flex justify-between text-[#a89d8e]">
                  <dt>{label}</dt>
                  <dd className="tabular-nums">{formatPrice(money)}</dd>
                </div>
              ) : null,
            )}
            <div className="flex items-baseline justify-between border-t border-[#b59660]/15 pt-4">
              <dt className="text-[0.625rem] tracking-[0.28em] text-[#a89d8e] uppercase">Total</dt>
              <dd className="font-heading text-2xl text-[#e5d8c5] tabular-nums">
                {formatPrice(order.totalPrice)}
              </dd>
            </div>
          </dl>
          {order.shippingAddress.length > 0 ? (
            <div className="mt-8 border-t border-[#b59660]/15 pt-6">
              <p className="mb-2 text-[0.5625rem] tracking-[0.28em] text-[#a89d8e] uppercase">Ship to</p>
              <address className="text-sm text-[#e5d8c5] not-italic">
                {order.shippingAddress.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </div>
          ) : null}
          {order.statusPageUrl ? (
            <a href={order.statusPageUrl} className="sv-button mt-8 w-full" rel="noopener noreferrer">
              Track this order
            </a>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
