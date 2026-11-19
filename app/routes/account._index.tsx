import { gql } from "@shopify/hydrogen/customer-account";
import { Link } from "react-router";

import { formatStatus, orderDate, StatusPill } from "~/components/account/OrderStatus";
import { formatPrice } from "~/lib/money";
import { getAccountAuth, orderParamFromGid } from "~/lib/server/account.server";

import type { Route } from "./+types/account._index";

const PROFILE_QUERY = gql(`
  query AccountOverview {
    customer {
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      phoneNumber {
        phoneNumber
      }
      defaultAddress {
        formatted(withName: true)
      }
      orders(first: 3, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          financialStatus
          totalPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`);

export async function loader({ context }: Route.LoaderArgs) {
  // The layout renders the sign-in gate; this route just returns nothing then.
  const auth = await getAccountAuth(context);
  if (auth.status !== "signed-in") return { status: "gate" } as const;

  try {
    const { data, errors } = await auth.account.client.graphql(PROFILE_QUERY, {
      accessToken: auth.accessToken,
    });
    if (errors?.length || !data?.customer) return { status: "error" } as const;
    const customer = data.customer;
    // Only derived, display-safe fields leave the server.
    return {
      status: "ok",
      profile: {
        name: [customer.firstName, customer.lastName].filter(Boolean).join(" ") || null,
        email: customer.emailAddress?.emailAddress ?? null,
        phone: customer.phoneNumber?.phoneNumber ?? null,
        address: customer.defaultAddress?.formatted ?? [],
      },
      orders: customer.orders.nodes.map((order) => ({
        param: orderParamFromGid(order.id),
        name: order.name,
        processedAt: order.processedAt,
        financialStatus: order.financialStatus,
        totalPrice: order.totalPrice,
      })),
    } as const;
  } catch {
    return { status: "error" } as const;
  }
}

export default function AccountOverview({ loaderData }: Route.ComponentProps) {
  if (loaderData.status === "gate") return null;
  if (loaderData.status === "error") {
    return (
      <p role="alert" className="sv-panel p-6 text-[#a89d8e]">
        We couldn&apos;t open your account just now. Please try again in a moment.
      </p>
    );
  }
  const { profile, orders } = loaderData;

  return (
    <div className="grid gap-12 xl:grid-cols-[1fr_1.4fr]">
      <section aria-labelledby="profile-heading" className="sv-panel sv-frame p-8">
        <h2 id="profile-heading" className="sv-kicker mb-6">
          Profile
        </h2>
        <dl className="space-y-5 text-sm">
          {[
            ["Name", profile.name],
            ["Email", profile.email],
            ["Phone", profile.phone],
          ].map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt className="text-[0.5625rem] tracking-[0.28em] text-[#a89d8e] uppercase">{label}</dt>
                <dd className="mt-1 text-[#e5d8c5]">{value}</dd>
              </div>
            ) : null,
          )}
          {profile.address.length > 0 ? (
            <div>
              <dt className="text-[0.5625rem] tracking-[0.28em] text-[#a89d8e] uppercase">Default address</dt>
              <dd className="mt-1 text-[#e5d8c5]">
                {profile.address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-8 text-xs text-[#a89d8e]">Profile details are managed securely by Shopify.</p>
      </section>

      <section aria-labelledby="recent-heading">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 id="recent-heading" className="font-heading text-3xl text-[#e5d8c5]">
            Recent orders
          </h2>
          <Link
            to="/account/orders"
            className="sv-link text-[0.625rem] tracking-[0.26em] text-[#a89d8e] uppercase"
          >
            All orders
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="border border-dashed border-[#b59660]/25 p-8 text-center">
            <p className="font-heading text-xl text-[#e5d8c5]">No rites performed yet.</p>
            <Link to="/shop" className="sv-button mt-6">
              Discover the collection
            </Link>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-[#b59660]/15 border-y border-[#b59660]/15">
            {orders.map((order) => (
              <li key={order.name} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-5">
                {order.param ? (
                  <Link
                    to={`/account/orders/${order.param}`}
                    className="font-heading text-xl text-[#e5d8c5] hover:text-[#b59660]"
                  >
                    Order {order.name}
                  </Link>
                ) : (
                  <span className="font-heading text-xl">Order {order.name}</span>
                )}
                <time dateTime={order.processedAt} className="text-sm text-[#a89d8e]">
                  {orderDate.format(new Date(order.processedAt))}
                </time>
                <StatusPill>{formatStatus(order.financialStatus)}</StatusPill>
                <span className="ms-auto text-[#e5d8c5] tabular-nums">{formatPrice(order.totalPrice)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
