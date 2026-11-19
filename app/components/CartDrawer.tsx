import { ShopPayButton } from "@shopify/hydrogen/react";
import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import { Link } from "react-router";

import { useCart, useCartForm } from "~/lib/cart";
import { closeCartDrawer, configureOpenCartAction, CART_DRAWER_ID } from "~/lib/cart-drawer";
import { Icon } from "~/components/brand/Icon";
import { Sigil } from "~/components/brand/Sigil";
import { shopifyImageUrl } from "~/lib/image";
import { trackBeginCheckout } from "~/lib/marketing";
import { formatPrice } from "~/lib/money";

import { publishCartViewed } from "./AnalyticsTrackers";

function CartErrorBanner() {
  const errors = useCart((state) => state.errors);
  const [dismissedAt, setDismissedAt] = useState(0);
  const messages = useMemo(() => {
    const lines = [...errors.lines.values()].flatMap((group) => group.userErrors);
    return [...errors.network, ...errors.cart.userErrors, ...lines].map((error) => error.message);
  }, [errors]);

  if (messages.length === 0 || errors.lastUpdatedAt <= dismissedAt) return null;

  return (
    <div className="border-border bg-surface-secondary mx-4 mb-2 rounded p-3 text-sm" role="alert">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          {messages.map((message) => (
            <p key={message} className="text-critical">
              {message}
            </p>
          ))}
        </div>
        <button
          type="button"
          className="button-ghost focus-visible:outline-accent rounded px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => setDismissedAt(errors.lastUpdatedAt)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function hasPendingCost(pending: {
  cost?: boolean;
  discountCodes: Set<string>;
  lines: Set<string>;
}): boolean {
  return pending.cost ?? (pending.lines.size > 0 || pending.discountCodes.size > 0);
}

function useCartStatusMessage(): string {
  const pending = useCart((state) => state.pending);
  const revalidating = useCart((state) => "revalidating" in state && state.revalidating === true);
  const networkErrors = useCart((state) => state.errors.network);
  const isPending = hasPendingCost(pending) || revalidating;
  const [sawPending, setSawPending] = useState(false);

  // Derived during render (React's "adjust state on prop change" pattern).
  if (isPending && !sawPending) setSawPending(true);

  if (isPending) return "Updating cart totals";
  if (sawPending && networkErrors.length === 0) return "Cart totals updated";
  return "";
}

type CartLineView = {
  id: string;
  quantity: number;
  cost: { totalAmount: { amount: string; currencyCode: string } };
  attributes?: Array<{ key: string; value: string | null }>;
  merchandise?: {
    title?: string | null;
    selectedOptions?: Array<{ name: string; value: string }> | null;
    image?: { url: string; altText?: string | null } | null;
    product?: { title?: string | null; handle?: string | null } | null;
  } | null;
};

export function CartLineItem({ line, emptyCartFocusId }: { line: CartLineView; emptyCartFocusId: string }) {
  const { formProps, register } = useCartForm();
  const pendingLines = useCart((state) => state.pending.lines);
  const lineError = useCart((state) => state.errors.lines.get(line.id));
  const merchandise = line.merchandise;
  const product = merchandise?.product;
  const pending = pendingLines.has(line.id);
  const optionText = merchandise?.selectedOptions
    ?.map((option: { name: string; value: string }) => option.value)
    .join(" / ");
  const errorId = `cart-line-error-${line.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  // Removing a line unmounts the control that holds focus. Move focus to the same
  // control on a neighbouring line (or `emptyCartFocusId`) while the line still exists.
  const moveFocusBeforeRemoval = (event: SubmitEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    if (!form.contains(document.activeElement)) return;
    const intent = event.nativeEvent.submitter?.getAttribute("value");
    const quantity = new FormData(form).get("quantity");
    const removesLine =
      intent === "remove" ||
      (intent === "decrease" && line.quantity <= 1) ||
      (intent === "set" && Number(quantity) <= 0);
    if (!removesLine) return;

    const item = form.closest("li");
    const neighbour = item?.nextElementSibling ?? item?.previousElementSibling;
    const selector = intent === "set" ? 'input[name="quantity"]' : `button[value="${intent}"]`;
    const target =
      neighbour?.querySelector<HTMLElement>(selector) ?? document.getElementById(emptyCartFocusId);
    target?.focus();
  };

  return (
    <li
      className={`flex gap-5 py-6 transition-opacity duration-200 ${pending ? "opacity-60" : ""}`}
      data-testid="cart-line"
      {...(pending ? { "aria-busy": "true" } : {})}
    >
      <div className="h-28 w-[5.6rem] shrink-0 overflow-hidden bg-[#141216]">
        {merchandise?.image ? (
          <img
            src={shopifyImageUrl(merchandise.image.url, 200)}
            width={90}
            height={112}
            alt={merchandise.image.altText ?? product?.title ?? merchandise.title ?? ""}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-lg leading-tight text-[#e5d8c5]">
          {product?.handle ? (
            <Link to={`/products/${product.handle}`} className="text-on-surface no-underline">
              {product.title ?? merchandise?.title ?? "Product"}
            </Link>
          ) : (
            (product?.title ?? merchandise?.title ?? "Product")
          )}
        </p>
        {optionText ? <p className="text-on-surface-secondary mt-1 text-xs">{optionText}</p> : null}
        {line.attributes
          ?.filter((attr) => !attr.key.startsWith("_") && attr.value != null)
          .map((attr) => (
            <p key={attr.key} className="text-on-surface-secondary mt-1 text-xs italic">
              {attr.key}: {attr.value}
            </p>
          ))}
        <p className={`mt-2 text-sm text-[#e5d8c5] tabular-nums ${pending ? "opacity-50" : ""}`}>
          {formatPrice(line.cost.totalAmount)}
        </p>
        <form
          {...formProps({ beforeSubmit: moveFocusBeforeRemoval })}
          className="mt-3 flex items-center gap-2"
        >
          <button {...register("set")} />
          <input type="hidden" {...register("lineId", { value: line.id })} />
          <div className="inline-flex items-center border border-[#b59660]/30">
            <button
              type="submit"
              {...register("decrease")}
              className="text-on-surface-secondary hover:text-on-surface inline-flex size-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
              aria-label={`Decrease quantity for ${product?.title ?? merchandise?.title ?? "item"}`}
            >
              <Icon name="minus" size={14} />
            </button>
            <input
              {...register("quantity", { value: line.quantity, interactive: true })}
              className={`number-reset text-on-surface h-11 w-12 rounded-none border-0 bg-transparent p-0 text-center text-sm ${pending ? "opacity-50" : ""}`}
              aria-label="Quantity"
              aria-describedby={lineError?.userErrors.length ? errorId : undefined}
              aria-invalid={lineError?.userErrors.length ? true : undefined}
            />
            <button
              type="submit"
              {...register("increase")}
              className="text-on-surface-secondary hover:text-on-surface inline-flex size-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
              aria-label={`Increase quantity for ${product?.title ?? merchandise?.title ?? "item"}`}
            >
              <Icon name="plus" size={14} />
            </button>
          </div>
          <button
            type="submit"
            {...register("remove")}
            className="ms-auto inline-flex h-11 items-center px-2 text-[#a89d8e] hover:text-[#e5d8c5] active:scale-[0.96]"
            aria-label={`Remove ${product?.title ?? merchandise?.title ?? "item"}`}
          >
            <span className="text-[0.625rem] tracking-[0.22em] uppercase">Remove</span>
          </button>
        </form>
        {lineError?.userErrors.length ? (
          <p id={errorId} className="text-critical mt-2 text-sm" role="alert">
            {lineError.userErrors[0]?.message}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function CartLines() {
  const loading = useCart((state) => state.loading);
  const lines = useCart((state) => state.data.lines.nodes);

  if (loading) {
    return <p className="text-on-surface-secondary type-body-sm">Loading cart…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Sigil className="mb-8 h-20 w-auto text-[#b59660]/50" />
        <p className="font-heading text-2xl text-[#e5d8c5]">Your bag awaits its first rite.</p>
        <p className="mt-3 max-w-xs text-sm text-[#a89d8e]">Nothing has been chosen yet.</p>
        <Link to="/shop" className="sv-button mt-8" onClick={() => closeCartDrawer()}>
          Discover the collection
        </Link>
      </div>
    );
  }

  return (
    <ul role="list" className="divide-border -mt-4 divide-y">
      {lines.map((line) => (
        <CartLineItem key={line.id} line={line} emptyCartFocusId="cart-drawer-title" />
      ))}
    </ul>
  );
}

function CartFooter() {
  const cart = useCart((state) => state.data);
  const pending = useCart((state) => state.pending);
  const revalidating = useCart((state) => "revalidating" in state && state.revalidating === true);
  const hasLines = cart.lines.nodes.length > 0;
  const isPending = hasPendingCost(pending) || revalidating;

  if (!hasLines) return null;

  return (
    <div className="shrink-0 border-t border-[#b59660]/20 bg-[#0e0d10] p-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between" aria-busy={isPending}>
          <span className="text-[0.625rem] tracking-[0.28em] text-[#a89d8e] uppercase">
            Estimated total
            {isPending ? <span aria-hidden="true"> (updating)</span> : null}
          </span>
          <span
            className={`font-heading text-2xl tabular-nums ${isPending ? "text-[#a89d8e]" : "text-[#e5d8c5]"}`}
          >
            {formatPrice(cart.cost.totalAmount)}
          </span>
        </div>
        <p className="text-on-surface-secondary text-xs">Taxes and shipping calculated at checkout</p>
        {cart.checkoutUrl ? (
          <>
            <a
              href={cart.checkoutUrl}
              className="sv-button sv-button--solid w-full"
              data-testid="checkout-link"
              onClick={() => trackBeginCheckout(cart.cost.totalAmount)}
            >
              Proceed to checkout <Icon name="arrow" size={16} className="sv-arrow" />
            </a>
            <ShopPayButton width="100%" borderRadius="0px" />
          </>
        ) : null}
      </div>
    </div>
  );
}

export function CartDrawer() {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const cart = useCart((state) => state.data);
  const statusMessage = useCartStatusMessage();

  useEffect(() => {
    configureOpenCartAction();
    const dialog = document.getElementById(CART_DRAWER_ID);
    if (!(dialog instanceof HTMLDialogElement)) return;
    const handleToggle = () => {
      if (dialog.open) publishCartViewed(cart);
    };
    dialog.addEventListener("toggle", handleToggle);
    return () => dialog.removeEventListener("toggle", handleToggle);
  }, [cart]);

  return (
    <>
      <span role="status" className="sr-only" aria-live="polite" aria-atomic="true" data-cart-status>
        {statusMessage}
      </span>
      <dialog
        id={CART_DRAWER_ID}
        className="drawer-right w-full max-w-[30rem]"
        aria-labelledby="cart-drawer-title"
        data-testid="cart-drawer"
        closedby="any"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[var(--header-height)] shrink-0 items-center border-b border-[#b59660]/15 ps-6 pe-3">
            <div className="flex flex-1 items-center gap-2">
              <h2 id="cart-drawer-title" tabIndex={-1} className="font-heading text-2xl text-[#e5d8c5]">
                Your bag
              </h2>
              <span className="font-heading text-lg text-[#b59660] italic tabular-nums">
                ({totalQuantity})
              </span>
            </div>
            <button
              type="button"
              commandfor={CART_DRAWER_ID}
              command="close"
              className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
              aria-label="Close"
              onClick={() => closeCartDrawer()}
            >
              <Icon name="close" />
            </button>
          </div>
          <CartErrorBanner />
          <div className="flex-1 overflow-y-auto px-6 py-2">
            <CartLines />
          </div>
          <CartFooter />
        </div>
      </dialog>
    </>
  );
}
