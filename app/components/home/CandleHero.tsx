import { m, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { Link } from "react-router";

import { Flacon } from "~/components/brand/Flacon";
import { Icon } from "~/components/brand/Icon";
import { PortalEngraving } from "~/components/brand/PortalEngraving";
import { EASE_OUT_EXPO, LineReveal } from "~/components/motion/Reveal";
import { FRAGRANCE_CONCEPTS } from "~/content/fragrances";
import { BRAND } from "~/content/site";
import { shopifyImageUrl } from "~/lib/image";

export type HeroImage = {
  url: string;
  altText: string | null;
  width?: number | null;
  height?: number | null;
};

/**
 * The opening scene: a dark portal that only exists where your light falls.
 *
 * The pointer (or, on touch screens, a slowly wandering flame) carries a
 * candle. Its position is eased toward the target in a rAF loop and written to
 * CSS custom properties directly — no React renders per frame, so input stays
 * responsive (INP). The loop pauses off-screen. Reduced motion: the candle
 * rests, nothing loops.
 */
export function CandleHero({ image }: { image: HeroImage | null }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const set = (x: number, y: number) => {
      el.style.setProperty("--lx", `${x.toFixed(1)}px`);
      el.style.setProperty("--ly", `${y.toFixed(1)}px`);
    };
    const bounds = el.getBoundingClientRect();
    let current = { x: bounds.width * 0.5, y: bounds.height * 0.42 };
    set(current.x, current.y);
    if (reduce) return;

    let target = { ...current };
    let lastPointer = -Infinity;
    let frame = 0;
    let visible = true;
    const start = performance.now();

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      target = { x: event.clientX - r.left, y: event.clientY - r.top };
      lastPointer = performance.now();
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      if (now - lastPointer > 4000) {
        // Wandering flame: a slow Lissajous drift around the portal.
        const r = el.getBoundingClientRect();
        const t = (now - start) / 1000;
        target = {
          x: r.width * (0.5 + 0.24 * Math.sin(t * 0.29)),
          y: r.height * (0.42 + 0.15 * Math.sin(t * 0.43 + 1.2)),
        };
      }
      current = {
        x: current.x + (target.x - current.x) * 0.075,
        y: current.y + (target.y - current.y) * 0.075,
      };
      set(current.x, current.y);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    observer.observe(el);
    el.addEventListener("pointermove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("pointermove", onMove);
    };
  }, [reduce]);

  const concept = FRAGRANCE_CONCEPTS[1]!;

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="sv-hero relative isolate flex min-h-[100svh] items-end overflow-hidden pt-[var(--header-height)]"
    >
      {/* Drifting oxblood haze */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-30">
        <div className="absolute -top-1/4 -left-1/4 h-[90%] w-[80%] rounded-full bg-[radial-gradient(closest-side,rgb(87_21_31/0.55),transparent)] blur-3xl motion-safe:animate-[sv-drift_26s_ease-in-out_infinite]" />
        <div className="absolute right-[-20%] bottom-[-30%] h-[80%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgb(87_21_31/0.4),transparent)] blur-3xl motion-safe:animate-[sv-drift_34s_ease-in-out_infinite_reverse]" />
      </div>

      {/* The portal: barely there everywhere, gilded where the light falls */}
      <PortalEngraving className="pointer-events-none absolute inset-0 -z-20 h-full w-full text-[#b59660] opacity-[0.07]" />
      <div aria-hidden="true" className="sv-candle-mask pointer-events-none absolute inset-0 -z-20">
        <PortalEngraving className="h-full w-full text-[#d2b67f] opacity-80" />
      </div>
      <div aria-hidden="true" className="sv-candle-glow pointer-events-none absolute inset-0 -z-10" />

      {/* Flacon */}
      <m.div
        className="pointer-events-none absolute top-[9%] right-[-4%] -z-10 flex w-[min(40vw,240px)] justify-center md:top-[12%] md:right-[8%] md:w-[min(26vw,380px)]"
        initial={reduce ? false : { opacity: 0, y: 40, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.8, ease: EASE_OUT_EXPO, delay: 0.35 }}
      >
        {/* Dimmed on small screens so the bottle sits behind, not against, the headline. */}
        <div className="w-full opacity-40 md:opacity-100">
          {image ? (
            <img
              src={shopifyImageUrl(image.url, 760)}
              alt={image.altText ?? ""}
              width={image.width ?? 760}
              height={image.height ?? 1000}
              fetchPriority="high"
              className="h-auto w-full object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.8)]"
            />
          ) : (
            <Flacon
              concept={concept}
              className="h-auto w-full drop-shadow-[0_40px_80px_rgba(87,21,31,0.45)]"
            />
          )}
        </div>
      </m.div>

      <div className="max-w-page px-margin relative mx-auto w-full pb-16 md:pb-24">
        <m.p
          className="sv-kicker mb-6"
          initial={reduce ? false : { opacity: 0, letterSpacing: "0.6em" }}
          animate={{ opacity: 1, letterSpacing: "0.34em" }}
          transition={{ duration: 1.6, ease: EASE_OUT_EXPO, delay: 0.1 }}
        >
          Maison de parfum · Of storms and candlelight
        </m.p>
        <LineReveal
          as="h1"
          immediate
          delay={0.2}
          className="sv-display text-[clamp(3.25rem,1.5rem+8.5vw,10.5rem)] text-[#e5d8c5]"
          lines={[
            <span key="a" id="hero-title">
              The Divine Art
            </span>,
            <span key="b" className="sv-italic ps-[0.9em] text-[#b59660]">
              of Darkness
            </span>,
          ]}
        />
        <m.div
          className="mt-10 flex max-w-xl flex-col gap-8 md:mt-12"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: EASE_OUT_EXPO, delay: 0.9 }}
        >
          <p className="sv-lede max-w-md">{BRAND.description}</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/shop" className="sv-button sv-button--solid" viewTransition>
              Discover the Rites <Icon name="arrow" size={16} className="sv-arrow" />
            </Link>
            <Link to="/mythology" className="sv-button" viewTransition>
              The Mythology
            </Link>
          </div>
        </m.div>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-6 left-1/2 hidden h-14 w-px -translate-x-1/2 overflow-hidden bg-[#b59660]/15 md:block"
      >
        <span className="block h-1/2 w-full bg-[#b59660] motion-safe:animate-[sv-scrollcue_2.4s_var(--ease-in-out-quint)_infinite]" />
      </div>
    </section>
  );
}
