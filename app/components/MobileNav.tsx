import { Link } from "react-router";

import { Icon } from "~/components/brand/Icon";
import { Sigil } from "~/components/brand/Sigil";
import { FOOTER_NAV, PRIMARY_NAV } from "~/content/site";
import type { NavCollection } from "~/lib/nav-collections";
import { toRoman } from "~/lib/roman";
import { closeMobileNavDrawer, MOBILE_NAV_DRAWER_ID, openDialogFallback } from "~/lib/cart-drawer";

export function MobileNav({ collections = [] }: { collections?: NavCollection[] }) {
  return (
    <dialog
      id={MOBILE_NAV_DRAWER_ID}
      className="drawer-left w-full max-w-md"
      aria-labelledby="mobile-nav-title"
      data-testid="mobile-nav"
      closedby="any"
    >
      <div className="flex h-full flex-col px-6 pb-10">
        <div className="flex h-[var(--header-height)] shrink-0 items-center justify-between">
          <h2 id="mobile-nav-title" className="sv-kicker">
            The House
          </h2>
          <button
            type="button"
            commandfor={MOBILE_NAV_DRAWER_ID}
            command="close"
            className="-me-2 inline-flex size-11 items-center justify-center text-[#e5d8c5] active:scale-[0.96]"
            aria-label="Close menu"
            onClick={() => closeMobileNavDrawer()}
          >
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto pt-6">
          <ul role="list" className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item, index) => (
              <li key={item.to} className="sv-mobile-item" style={{ ["--i" as string]: index }}>
                <Link
                  to={item.to}
                  className="font-heading flex min-h-14 items-baseline gap-4 text-4xl text-[#e5d8c5]"
                  onClick={() => closeMobileNavDrawer()}
                >
                  <span className="font-body text-[0.625rem] tracking-[0.3em] text-[#b59660]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </Link>
                {item.to === "/collections" && collections.length > 0 ? (
                  <ul
                    role="list"
                    aria-label="Collections"
                    className="mb-4 ms-[2.15rem] border-s border-[#b59660]/20 ps-4"
                  >
                    {collections.map((collection, sub) => (
                      <li key={collection.handle}>
                        <Link
                          to={`/collections/${collection.handle}`}
                          className="flex min-h-11 items-baseline gap-3 text-base text-[#e5d8c5]/80"
                          onClick={() => closeMobileNavDrawer()}
                        >
                          <span className="w-6 text-[0.5625rem] tracking-[0.24em] text-[#b59660]">
                            {toRoman(sub + 1)}
                          </span>
                          {collection.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8">
            {FOOTER_NAV.slice(0, 2).map((group) => (
              <div key={group.title}>
                <p className="sv-kicker mb-3 !text-[0.625rem]">{group.title}</p>
                <ul role="list" className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className="text-sm text-[#e5d8c5]/75"
                        onClick={() => closeMobileNavDrawer()}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <Sigil className="mx-auto mt-8 h-16 w-auto text-[#b59660]/60" />
      </div>
    </dialog>
  );
}

export function MobileNavTrigger() {
  return (
    <button
      type="button"
      commandfor={MOBILE_NAV_DRAWER_ID}
      command="show-modal"
      className="inline-flex size-11 items-center justify-center text-[#e5d8c5] active:scale-[0.96]"
      aria-label="Menu"
      aria-controls={MOBILE_NAV_DRAWER_ID}
      aria-haspopup="dialog"
      data-testid="nav-trigger"
      onClick={() => openDialogFallback(MOBILE_NAV_DRAWER_ID)}
    >
      <Icon name="menu" />
    </button>
  );
}
