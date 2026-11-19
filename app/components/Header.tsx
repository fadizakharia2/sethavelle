import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";

import { Icon } from "~/components/brand/Icon";
import { Wordmark } from "~/components/brand/Sigil";
import { PRIMARY_NAV } from "~/content/site";
import { useCart } from "~/lib/cart";
import { CART_DRAWER_ID, SEARCH_DRAWER_ID, openDialogFromLinkClick } from "~/lib/cart-drawer";

import { MobileNav, MobileNavTrigger } from "./MobileNav";

function cartCountLabel(count: number) {
  return count === 1 ? "Bag, 1 item" : `Bag, ${count} items`;
}

/**
 * Fixed header. Over the home hero it starts transparent and settles into an
 * obsidian, blurred bar once the page scrolls — via a single passive scroll
 * listener that only toggles a data attribute.
 */
export function Header() {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const { pathname } = useLocation();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || !overHero;

  return (
    <>
      <header
        data-solid={solid}
        className="group/header fixed inset-x-0 top-0 z-40 h-[var(--header-height)] transition-[background-color,border-color,backdrop-filter] duration-500 ease-[var(--ease-ui)] data-[solid=false]:border-transparent data-[solid=true]:border-b data-[solid=true]:border-[#b59660]/15 data-[solid=true]:bg-[#0b0b0d]/80 data-[solid=true]:backdrop-blur-xl"
      >
        <div className="max-w-page px-margin mx-auto grid h-full w-full grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-2">
            <div className="-ms-2 md:hidden">
              <MobileNavTrigger />
            </div>
            <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
              {PRIMARY_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  viewTransition
                  className="sv-link text-[0.6875rem] font-medium tracking-[0.26em] text-[#e5d8c5]/85 uppercase hover:text-[#e5d8c5] aria-[current=page]:text-[#e5d8c5]"
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <Link
            to="/"
            viewTransition
            aria-label="SETHAVELLE, home"
            className="px-2 text-[0.95rem] text-[#e5d8c5] md:text-[1.1rem]"
          >
            <Wordmark />
          </Link>

          <div className="flex items-center justify-end">
            <Link
              to="/search"
              className="inline-flex size-11 items-center justify-center text-[#e5d8c5]/85 transition-colors hover:text-[#e5d8c5] active:scale-[0.96]"
              aria-label="Search"
              aria-controls={SEARCH_DRAWER_ID}
              aria-haspopup="dialog"
              data-testid="search-trigger"
              onClick={(event) => openDialogFromLinkClick(event, SEARCH_DRAWER_ID)}
            >
              <Icon name="search" />
            </Link>
            <Link
              to="/account"
              className="hidden size-11 items-center justify-center text-[#e5d8c5]/85 transition-colors hover:text-[#e5d8c5] sm:inline-flex"
              aria-label="Account"
            >
              <Icon name="user" />
            </Link>
            <Link
              to="/cart"
              className="relative inline-flex h-11 items-center gap-2 ps-2 text-[#e5d8c5]/85 transition-colors hover:text-[#e5d8c5] active:scale-[0.96]"
              aria-label={cartCountLabel(totalQuantity)}
              aria-controls={CART_DRAWER_ID}
              aria-haspopup="dialog"
              data-testid="cart-trigger"
              onClick={(event) => openDialogFromLinkClick(event, CART_DRAWER_ID)}
            >
              <Icon name="bag" />
              <span
                aria-hidden="true"
                className="font-heading min-w-[1.25ch] text-sm tabular-nums italic"
                key={totalQuantity}
              >
                {totalQuantity > 99 ? "99+" : totalQuantity}
              </span>
            </Link>
            <span aria-live="polite" aria-atomic="true" className="sr-only">
              {totalQuantity === 1 ? "1 item in bag" : `${totalQuantity} items in bag`}
            </span>
          </div>
        </div>
      </header>
      {/* Spacer so content clears the fixed header on non-hero pages */}
      {overHero ? null : <div aria-hidden="true" className="h-[var(--header-height)] shrink-0" />}
      <MobileNav />
    </>
  );
}
