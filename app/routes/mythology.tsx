import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Link } from "react-router";

import { Icon } from "~/components/brand/Icon";
import { PortalEngraving } from "~/components/brand/PortalEngraving";
import { LineReveal, Reveal } from "~/components/motion/Reveal";
import { PageHeader } from "~/components/PageHeader";
import { buildMeta, pageTitle } from "~/lib/seo";

import type { Route } from "./+types/mythology";

export function meta({ matches }: Route.MetaArgs) {
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  return buildMeta({
    title: pageTitle("The Mythology"),
    description:
      "Seth, lord of storms and the red desert, and the dark aristocracy that inspires SETHAVELLE.",
    canonical: root?.origin ? `${root.origin}/mythology` : undefined,
    type: "article",
  });
}

/**
 * Editorial retelling. Mythological statements reflect widely documented
 * Egyptian tradition; brand interpretation is clearly framed as ours.
 */
const CHAPTERS = [
  {
    numeral: "I",
    kicker: "The Red Land",
    title: "Lord of the desert",
    body: [
      "Ancient Egypt divided its world in two: the black land, made fertile by the Nile, and the red land, the desert beyond it. Seth belonged to the red land. He was a god of storms, of the wild places, of borders and of strangers.",
      "He was depicted with the head of an animal no one has ever identified with certainty, a creature with a curved snout and squared ears, as if even his likeness refused to be fully known.",
    ],
  },
  {
    numeral: "II",
    kicker: "The Brother",
    title: "The great betrayal",
    body: [
      "In the most famous myth, Seth murders his brother Osiris and contends with Horus for the throne of Egypt. It is a story of envy, ambition and power, and for later generations it made Seth the very image of disorder.",
    ],
  },
  {
    numeral: "III",
    kicker: "The Defender",
    title: "Guardian of the sun",
    body: [
      "Yet the same god was honoured. In other traditions Seth stands at the prow of the sun god's barque as it crosses the underworld each night, and his strength repels the serpent Apophis so that morning can come.",
      "Chaos, in this telling, is not the opposite of order. It is the force that defends it at the edge of the dark.",
    ],
  },
  {
    numeral: "IV",
    kicker: "The House",
    title: "What we inherit",
    body: [
      "SETHAVELLE takes that ambiguity as its signature: beauty that carries danger, power worn with restraint. To the desert god we add the candlelit rooms of an imagined aristocracy of the night, velvet, roses and old stone, and from both we compose our rites.",
    ],
  },
];

export default function Mythology({ matches }: Route.ComponentProps) {
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHeader
        kicker="The Mythology"
        title="Born of the storm,"
        italic="raised by the night"
        lede="The story of Seth, and of the dark house that took his name."
        origin={root?.origin}
        crumbs={[
          { name: "House", path: "/" },
          { name: "The Mythology", path: "/mythology" },
        ]}
      />
      <div className="relative">
        {CHAPTERS.map((chapter, index) => (
          <Chapter key={chapter.numeral} chapter={chapter} index={index} />
        ))}
      </div>
      <section className="border-t border-[#b59660]/10 py-24 text-center">
        <LineReveal
          className="sv-display text-[clamp(2rem,1.4rem+2.6vw,4rem)] text-[#e5d8c5]"
          lines={["Now, choose your rite."]}
        />
        <Reveal className="mt-10">
          <Link to="/shop" className="sv-button sv-button--solid" viewTransition>
            Enter the collection <Icon name="arrow" size={16} className="sv-arrow" />
          </Link>
        </Reveal>
      </section>
    </main>
  );
}

function Chapter({ chapter, index }: { chapter: (typeof CHAPTERS)[number]; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["12%", "-12%"]);
  const flip = index % 2 === 1;

  return (
    <section
      ref={ref}
      aria-labelledby={`chapter-${chapter.numeral}`}
      className="relative overflow-hidden border-t border-[#b59660]/10 py-24 md:py-36"
    >
      <div
        className={`max-w-page px-margin mx-auto grid items-center gap-16 lg:grid-cols-2 ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}
      >
        <div className="relative flex aspect-square items-center justify-center overflow-hidden">
          <m.span
            aria-hidden="true"
            style={reduce ? undefined : { y }}
            className="font-heading absolute text-[42vw] leading-none text-[#57151f]/60 lg:text-[22vw]"
          >
            {chapter.numeral}
          </m.span>
          <PortalEngraving className="relative h-full w-full text-[#b59660] opacity-25" />
        </div>
        <div>
          <p className="sv-kicker mb-5">
            {chapter.numeral} · {chapter.kicker}
          </p>
          <LineReveal
            as="h2"
            className="sv-display text-[clamp(2.25rem,1.5rem+3vw,4.5rem)] text-[#e5d8c5]"
            lines={[
              <span key="t" id={`chapter-${chapter.numeral}`}>
                {chapter.title}
              </span>,
            ]}
          />
          <div className="mt-8 max-w-xl space-y-5">
            {chapter.body.map((paragraph, i) => (
              <Reveal as="p" key={i} delay={i * 0.08} className="sv-lede">
                {paragraph}
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
