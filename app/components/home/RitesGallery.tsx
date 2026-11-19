import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Link } from "react-router";

import { Flacon } from "~/components/brand/Flacon";
import { Icon } from "~/components/brand/Icon";
import type { ProductCardData } from "~/components/ProductCard";
import { QuickAdd } from "~/components/QuickAdd";
import { ShopifyImage } from "~/components/ShopifyImage";
import type { FragranceConcept } from "~/content/fragrances";
import { formatPrice } from "~/lib/money";

export type Rite = { concept: FragranceConcept; product: ProductCardData | null };

/**
 * "The Three Rites": on large screens the section pins and the three
 * fragrance worlds slide past horizontally as you scroll (transform only).
 * On small screens, or with reduced motion, they simply stack.
 */
export function RitesGallery({ rites }: { rites: Rite[] }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(
    scrollYProgress,
    [0.04, 0.96],
    ["0%", `-${((rites.length - 1) / rites.length) * 100}%`],
  );
  const progress = useTransform(scrollYProgress, [0.04, 0.96], [0, 1]);

  return (
    <section ref={ref} aria-labelledby="rites-heading" className={`relative ${reduce ? "" : "lg:h-[300vh]"}`}>
      <div className={`${reduce ? "" : "lg:sticky lg:top-0 lg:h-[100svh]"} overflow-hidden`}>
        <div className="max-w-page px-margin pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto flex items-start justify-between pt-[calc(var(--header-height)+2rem)]">
          <div>
            <p className="sv-kicker mb-3">The Collection</p>
            <h2 id="rites-heading" className="font-heading text-3xl text-[#e5d8c5] md:text-5xl">
              Three <span className="sv-italic text-[#b59660]">Rites</span>
            </h2>
          </div>
          <div className="hidden w-40 lg:block" aria-hidden="true">
            <div className="h-px bg-[#b59660]/20">
              <m.div className="h-px origin-left bg-[#b59660]" style={{ scaleX: reduce ? 1 : progress }} />
            </div>
            <div className="mt-2 flex justify-between text-[0.625rem] tracking-[0.3em] text-[#a89d8e]">
              {rites.map((rite) => (
                <span key={rite.concept.handle}>{rite.concept.numeral}</span>
              ))}
            </div>
          </div>
        </div>

        <m.ul
          role="list"
          className={`flex flex-col ${reduce ? "" : "lg:h-full lg:w-[300%] lg:flex-row"}`}
          style={reduce ? undefined : { x }}
        >
          {rites.map((rite, index) => (
            <RitePanel key={rite.concept.handle} rite={rite} index={index} />
          ))}
        </m.ul>
      </div>
    </section>
  );
}

function RitePanel({ rite, index }: { rite: Rite; index: number }) {
  const { concept, product } = rite;
  const image = product?.featuredImage ?? null;
  const available = Boolean(product);

  return (
    <li
      className="relative isolate flex min-h-[100svh] w-full items-center overflow-hidden pt-[calc(var(--header-height)+7rem)] pb-16 lg:h-full lg:pt-24"
      style={{
        background: `radial-gradient(80% 70% at 68% 55%, ${concept.palette.glow}33, transparent 70%), ${concept.palette.ground}`,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.06] [background-image:repeating-linear-gradient(90deg,#b59660_0,#b59660_1px,transparent_1px,transparent_88px)]"
      />
      <span
        aria-hidden="true"
        className="font-heading pointer-events-none absolute -bottom-[0.18em] left-[4vw] -z-10 text-[38vw] leading-none text-[#e5d8c5]/[0.035] lg:text-[26vw]"
      >
        {concept.numeral}
      </span>

      <div className="max-w-page px-margin mx-auto grid w-full items-center gap-12 lg:grid-cols-[1fr_1fr]">
        <div className="order-2 lg:order-1">
          <p className="sv-kicker mb-6">
            Rite {concept.numeral} · {concept.register}
          </p>
          <h3 className="sv-display text-[clamp(3rem,2rem+5vw,7.5rem)] text-[#e5d8c5]">
            {product?.title ?? concept.name}
          </h3>
          <p className="font-heading mt-8 max-w-md text-xl leading-relaxed text-[#e5d8c5]/80 italic md:text-2xl">
            “{concept.epigraph}”
          </p>
          <ul role="list" className="mt-8 flex flex-wrap gap-2">
            {concept.mood.map((word) => (
              <li
                key={word}
                className="border border-[#b59660]/30 px-3 py-1.5 text-[0.625rem] tracking-[0.26em] text-[#e5d8c5]/80 uppercase"
              >
                {word}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            {available && product ? (
              <>
                <QuickAdd product={product} tone="solid" />
                <Link
                  to={`/products/${product.handle}`}
                  viewTransition
                  className="sv-link text-[0.6875rem] tracking-[0.26em] text-[#e5d8c5] uppercase"
                >
                  Enter the rite <Icon name="arrow" size={14} className="ms-2 inline" />
                </Link>
                <span className="text-sm text-[#a89d8e] tabular-nums">
                  {product.availableForSale ? formatPrice(product.priceRange.minVariantPrice) : "Sold out"}
                </span>
              </>
            ) : (
              <span className="sv-button pointer-events-none" aria-disabled="true">
                Forthcoming
              </span>
            )}
          </div>
        </div>

        <div className="order-1 flex justify-center lg:order-2">
          <div className="relative w-[min(62vw,340px)] lg:w-[min(30vw,420px)]">
            <div
              aria-hidden="true"
              className="absolute inset-[-20%] -z-10 rounded-full blur-3xl"
              style={{ background: `radial-gradient(closest-side, ${concept.palette.glow}55, transparent)` }}
            />
            {image ? (
              <ShopifyImage
                image={image}
                alt={image.altText ?? product?.title ?? concept.name}
                sizes="(min-width: 1024px) 30vw, 62vw"
                priority={index === 0}
                className="h-auto w-full object-contain"
              />
            ) : (
              <Flacon concept={concept} className="h-auto w-full" />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
