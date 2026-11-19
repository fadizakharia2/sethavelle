import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";

import { Icon } from "~/components/brand/Icon";
import { useCart } from "~/lib/cart";
import { openCartDrawer } from "~/lib/cart-drawer";

export type QuickAddProduct = {
  handle: string;
  title: string;
  availableForSale: boolean;
  featuredImage?: { url: string; altText?: string | null } | null;
  variants: {
    nodes: readonly {
      id: string;
      title: string;
      availableForSale: boolean;
      price: { amount: string; currencyCode: string };
    }[];
  };
};

type Status = "idle" | "adding" | "added" | "error";

/** Variants shown as chips on a card; beyond this the card links to the product page. */
export const MAX_CARD_VARIANTS = 6;

/**
 * "Add to bag" for product cards.
 *
 * - Lines are added through Shopify's cart store
 *   (`Shopify.actions.updateCart`), which gives the same optimistic update,
 *   pending state and rollback as the product page form. Prices are never sent
 *   from the browser; Shopify prices the line.
 * - Products with several variants (sizes) show them as chips with the first
 *   available one preselected, so the bottle being added is always visible.
 *   Products with more variants than fit on a card link to the product page.
 * - Until the cart store is ready the button falls back to the product page.
 */
export function QuickAdd({
  product,
  tone = "outline",
  className = "",
}: {
  product: QuickAddProduct;
  tone?: "outline" | "solid";
  className?: string;
}) {
  const loading = useCart((state) => state.loading);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const groupId = useId();
  const variants = product.variants.nodes;
  const firstAvailable = variants.find((v) => v.availableForSale) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstAvailable?.id);
  const variant = variants.find((v) => v.id === selectedId) ?? firstAvailable;
  const showChips = variants.length > 1;
  const href = `/products/${product.handle}`;
  const base = `${tone === "solid" ? "sv-button sv-button--solid" : "sv-button"} sv-quickadd relative z-10`;

  if (!product.availableForSale || !variant) {
    return (
      <span className={`${base} pointer-events-none opacity-50 ${className}`} aria-disabled="true">
        Sold out
      </span>
    );
  }

  if (variants.length > MAX_CARD_VARIANTS) {
    return (
      <Link
        to={href}
        viewTransition
        className={`${base} ${className}`}
        aria-label={`Choose a size of ${product.title}`}
      >
        Choose size <Icon name="arrow" size={14} className="sv-arrow" />
      </Link>
    );
  }

  const add = async () => {
    const actions = window.Shopify?.actions;
    if (!actions?.updateCart || actions.updateCart.isDefault()) {
      window.location.assign(href);
      return;
    }
    clearTimeout(timer.current);
    setStatus("adding");
    setMessage("");
    try {
      const result = await actions.updateCart(
        { lines: [{ merchandiseId: variant.id, quantity: 1 }] },
        {
          event: {
            context: "product",
            detail: {
              products: [
                {
                  id: variant.id,
                  price: variant.price,
                  title: product.title,
                  image: product.featuredImage ?? null,
                  product: { title: product.title, handle: product.handle },
                },
              ],
            },
          },
        },
      );
      const problem = result.userErrors?.[0]?.message;
      if (problem) {
        setStatus("error");
        setMessage(problem);
        return;
      }
      setStatus("added");
      openCartDrawer();
      timer.current = setTimeout(() => setStatus("idle"), 2200);
    } catch {
      setStatus("error");
      setMessage("We couldn't add this to your bag. Please try again.");
    }
  };

  const label = status === "adding" ? "Adding…" : status === "added" ? "In your bag" : "Add to bag";

  return (
    <div className={`relative z-10 ${className}`}>
      {showChips ? (
        <fieldset className="mb-3">
          <legend className="sr-only">Size of {product.title}</legend>
          <div className="flex flex-wrap gap-1.5">
            {variants.map((v) => (
              <label
                key={v.id}
                className="sv-chip"
                data-selected={v.id === variant.id}
                data-unavailable={!v.availableForSale}
              >
                <input
                  type="radio"
                  name={groupId}
                  value={v.id}
                  checked={v.id === variant.id}
                  disabled={!v.availableForSale}
                  onChange={() => {
                    setSelectedId(v.id);
                    if (status !== "adding") setStatus("idle");
                  }}
                  className="sr-only"
                />
                {v.title}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <button
        type="button"
        className={`${base} w-full`}
        onClick={add}
        disabled={loading || status === "adding" || !variant.availableForSale}
        aria-label={
          status === "idle" || status === "error"
            ? `Add ${product.title}${showChips ? `, ${variant.title},` : ""} to bag`
            : undefined
        }
        data-testid="quick-add"
        data-status={status}
      >
        {status === "added" ? <span aria-hidden="true">✦</span> : <Icon name="plus" size={14} />}
        {label}
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {status === "added"
          ? `${product.title}${showChips ? `, ${variant.title},` : ""} added to your bag`
          : ""}
      </p>
      {status === "error" ? (
        <p role="alert" className="mt-2 text-xs text-[#d8798a]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
