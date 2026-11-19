import { Link } from "react-router";

import { Sigil } from "~/components/brand/Sigil";
import { NewsletterForm } from "~/components/NewsletterForm";
import { BRAND, FOOTER_NAV } from "~/content/site";
import type { StorefrontShop } from "~/lib/storefront-shop";

import { PaymentMethodIcon } from "./PaymentMethodIcon";

export function Footer({ shopInfo }: { shopInfo: StorefrontShop }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-[#b59660]/15 bg-[#0b0b0d]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b59660]/50 to-transparent"
      />
      <div className="max-w-page px-margin mx-auto grid w-full gap-16 pt-20 pb-12 lg:grid-cols-[1.2fr_2fr]">
        <section aria-labelledby="footer-letters">
          <p className="sv-kicker mb-5">Correspondence</p>
          <h2
            id="footer-letters"
            className="font-heading mb-8 max-w-sm text-3xl leading-tight text-[#e5d8c5] md:text-4xl"
          >
            Letters from the house, <span className="sv-italic text-[#b59660]">sealed in wax.</span>
          </h2>
          <div className="max-w-md">
            <NewsletterForm />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {FOOTER_NAV.map((group) => (
            <nav key={group.title} aria-labelledby={`footer-${group.title}`}>
              <h2 id={`footer-${group.title}`} className="sv-kicker mb-5 !text-[0.625rem]">
                {group.title}
              </h2>
              <ul role="list" className="space-y-3">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="sv-link text-sm text-[#e5d8c5]/75 hover:text-[#e5d8c5]">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="max-w-page px-margin mx-auto flex w-full flex-col gap-6 border-t border-[#b59660]/10 py-8 text-xs text-[#a89d8e] md:flex-row md:items-center md:justify-between">
        <p>
          © {year} {shopInfo.name === "Store" ? BRAND.name : shopInfo.name}. {BRAND.tagline}.
        </p>
        {shopInfo.paymentMethods.length > 0 ? (
          <ul
            role="list"
            aria-label="Accepted payment methods"
            className="flex flex-wrap items-center gap-2 opacity-80"
          >
            {shopInfo.paymentMethods.map((method) => (
              <li key={method}>
                <PaymentMethodIcon method={method} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Monumental wordmark, cropped by the page edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative -mb-[3.2vw] flex select-none items-end justify-center gap-[2vw] px-4"
      >
        <Sigil className="h-[11vw] w-auto shrink-0 text-[#b59660]/25" />
        <span className="font-heading bg-gradient-to-b from-[#e5d8c5]/14 to-transparent bg-clip-text text-[15.5vw] leading-[0.8] tracking-[-0.03em] text-transparent">
          Sethavelle
        </span>
      </div>
    </footer>
  );
}
