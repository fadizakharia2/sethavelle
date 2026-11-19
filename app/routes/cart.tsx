import { ShopPayButton } from "@shopify/hydrogen/react";
import { useEffect } from "react";
import { Link } from "react-router";

import { publishCartViewed } from "~/components/AnalyticsTrackers";
import { Icon } from "~/components/brand/Icon";
import { Sigil } from "~/components/brand/Sigil";
import { CartLineItem } from "~/components/CartDrawer";
import { PageHeader } from "~/components/PageHeader";
import { useCart } from "~/lib/cart";
import { trackBeginCheckout } from "~/lib/marketing";
import { formatPrice } from "~/lib/money";
import { buildMeta, pageTitle } from "~/lib/seo";

export function meta() {
  return buildMeta({ title: pageTitle("Your bag"), noindex: true });
}

/**
 * The bag page is the no-JavaScript fallback for the cart drawer. All totals
 * shown are Shopify's: the cart is read and mutated through Hydrogen's cart
 * handlers, so prices, discounts and availability are always authoritative.
 */
export default function CartRoute() {
  const cart = useCart((state) => state.data);
  const loading = useCart((state) => state.loading);
  const lines = cart.lines.nodes;

  useEffect(() => {
    publishCartViewed(cart);
  }, [cart]);

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHeader kicker="The bag" title="Your selection" />
      <div className="max-w-page px-margin mx-auto w-full pb-28">
        <span id="cart-page-title" tabIndex={-1} className="sr-only">
          Your bag
        </span>
        {loading ? (
          <div className="grid gap-4" aria-busy="true" aria-label="Loading your bag">
            {[0, 1].map((i) => (
              <div key={i} className="sv-skeleton h-28 w-full" />
            ))}
          </div>
        ) : null}
        {!loading && lines.length === 0 ? (
          <div className="sv-panel sv-frame mx-auto flex max-w-xl flex-col items-center p-14 text-center">
            <Sigil className="mb-8 h-20 w-auto text-[#b59660]/50" />
            <p className="font-heading text-3xl text-[#e5d8c5]">Your bag awaits its first rite.</p>
            <Link to="/shop" className="sv-button sv-button--solid mt-10">
              Discover the collection <Icon name="arrow" size={16} className="sv-arrow" />
            </Link>
          </div>
        ) : null}
        {lines.length > 0 ? (
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
            <ul role="list" className="divide-y divide-[#b59660]/15 border-y border-[#b59660]/15">
              {lines.map((line) => (
                <CartLineItem key={line.id} line={line} emptyCartFocusId="cart-page-title" />
              ))}
            </ul>
            <aside
              className="sv-panel h-fit p-8 lg:sticky lg:top-[calc(var(--header-height)+2rem)]"
              aria-label="Order summary"
            >
              <h2 className="sv-kicker mb-6">Summary</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between text-[#a89d8e]">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">
                    {formatPrice(cart.cost.subtotalAmount ?? cart.cost.totalAmount)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-[#b59660]/15 pt-4">
                  <dt className="text-[0.625rem] tracking-[0.28em] text-[#a89d8e] uppercase">
                    Estimated total
                  </dt>
                  <dd className="font-heading text-3xl text-[#e5d8c5] tabular-nums">
                    {formatPrice(cart.cost.totalAmount)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-[#a89d8e]">
                Taxes, shipping and discounts are confirmed at checkout.
              </p>
              {cart.checkoutUrl ? (
                <div className="mt-8 grid gap-3">
                  <a
                    href={cart.checkoutUrl}
                    className="sv-button sv-button--solid w-full"
                    data-testid="checkout-link"
                    onClick={() => trackBeginCheckout(cart.cost.totalAmount)}
                  >
                    Proceed to checkout <Icon name="arrow" size={16} className="sv-arrow" />
                  </a>
                  <ShopPayButton width="100%" borderRadius="0px" />
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}
