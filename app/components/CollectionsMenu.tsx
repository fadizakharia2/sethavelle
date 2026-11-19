import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";

import { Icon } from "~/components/brand/Icon";
import { Sigil } from "~/components/brand/Sigil";
import { ShopifyImage } from "~/components/ShopifyImage";
import type { NavCollection } from "~/lib/nav-collections";
import { toRoman } from "~/lib/roman";

const OPEN_DELAY = 90;
const CLOSE_DELAY = 220;

/**
 * Header "Collections" disclosure.
 *
 * A reliquary rather than a list: collections are numbered like chapters, and
 * the one under the pointer (or keyboard focus) is shown in a gothic arch.
 * Opens on hover with a short intent delay, or on click / Enter / Space.
 * Escape closes it and returns focus to the trigger; it also closes on
 * navigation and on outside clicks. The "Collections" label itself stays a
 * link to the full index, so nothing is hidden behind the menu.
 */
export function CollectionsMenu({
  collections,
  linkClassName,
}: {
  collections: NavCollection[];
  linkClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { pathname } = useLocation();

  const schedule = useCallback((next: boolean, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  }, []);

  // Close on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const current = collections[active] ?? collections[0];

  return (
    <div
      ref={rootRef}
      className="flex items-center"
      onPointerEnter={(event) => event.pointerType === "mouse" && schedule(true, OPEN_DELAY)}
      onPointerLeave={(event) => event.pointerType === "mouse" && schedule(false, CLOSE_DELAY)}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <NavLink to="/collections" viewTransition className={linkClassName}>
        Collections
      </NavLink>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Show collections"
        data-testid="collections-menu-trigger"
        onClick={() => {
          clearTimeout(timer.current);
          setOpen((value) => !value);
        }}
        className="-me-2 ms-0.5 inline-flex size-8 items-center justify-center text-[#e5d8c5]/70 transition-colors hover:text-[#e5d8c5]"
      >
        <Icon
          name="chevron"
          size={12}
          className={`transition-transform duration-300 ease-[var(--ease-ui)] ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        aria-hidden="true"
        data-open={open}
        className="sv-menu-scrim fixed inset-x-0 top-[var(--header-height)] bottom-0 -z-10 bg-[#0b0b0d]/65"
        onPointerEnter={() => schedule(false, CLOSE_DELAY)}
      />
      <div
        id={panelId}
        data-open={open}
        data-testid="collections-menu"
        className="sv-menu-panel absolute inset-x-0 top-full border-y border-[#b59660]/15 bg-[#0b0b0d] shadow-[0_40px_80px_-20px_rgb(0_0_0/0.9)]"
      >
        <div className="max-w-page px-margin mx-auto grid w-full gap-12 py-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="sv-kicker mb-8">The reliquary · {collections.length} collections</p>
            <ul role="list" className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
              {collections.map((collection, index) => (
                <li key={collection.handle}>
                  <Link
                    to={`/collections/${collection.handle}`}
                    viewTransition
                    onPointerEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    data-active={index === active}
                    className="group/item flex min-h-12 items-baseline gap-4 border-b border-[#b59660]/10 py-2 text-[#e5d8c5]/70 transition-colors duration-300 data-[active=true]:text-[#e5d8c5]"
                  >
                    <span className="font-body w-8 shrink-0 text-[0.625rem] tracking-[0.24em] text-[#b59660]">
                      {toRoman(index + 1)}
                    </span>
                    <span className="font-heading text-2xl leading-tight transition-transform duration-500 ease-[var(--ease-out-expo)] group-data-[active=true]/item:translate-x-1.5">
                      {collection.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-8">
              <Link
                to="/shop"
                viewTransition
                className="sv-link text-[0.6875rem] tracking-[0.26em] text-[#e5d8c5] uppercase"
              >
                Shop everything <Icon name="arrow" size={14} className="ms-2 inline" />
              </Link>
              <Link
                to="/collections"
                viewTransition
                className="sv-link text-[0.6875rem] tracking-[0.26em] text-[#e5d8c5]/75 uppercase"
              >
                All collections
              </Link>
            </div>
          </div>

          <div aria-hidden="true" className="hidden justify-center lg:flex">
            <div className="relative aspect-[3/4] w-full max-w-[19rem] overflow-hidden rounded-t-[999px] border border-[#b59660]/30 bg-[#141216]">
              {current?.image ? (
                <ShopifyImage
                  key={current.handle}
                  image={current.image}
                  alt=""
                  sizes="19rem"
                  className="sv-menu-image h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Sigil className="h-1/3 w-auto text-[#b59660]/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(11_11_13/0.85),transparent_55%)]" />
              <p className="font-heading absolute inset-x-0 bottom-6 px-6 text-center text-2xl text-[#e5d8c5] italic">
                {current?.title}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
