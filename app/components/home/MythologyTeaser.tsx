import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Link } from "react-router";

import { Icon } from "~/components/brand/Icon";
import { LineReveal, Reveal } from "~/components/motion/Reveal";

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;

const SIGIL_PATHS = [
  circle(50, 52, 34),
  circle(50, 52, 22),
  circle(50, 52, 44),
  "M50 2 V116",
  "M50 8 L64 1.5 L67 7 L56 11.5",
  "M50 106 L42 117 M50 106 L58 117",
  "M6 52 H28 M72 52 H94",
];

const CHAPTERS = [
  {
    numeral: "I",
    title: "Lord of the Red Land",
    body: "In Egyptian myth, Seth ruled the desert beyond the fertile Nile: the red land of storms, foreign roads and things that do not bend.",
  },
  {
    numeral: "II",
    title: "The Necessary Chaos",
    body: "He was feared and yet indispensable. Standing at the prow of the sun's barque, Seth was said to repel the serpent Apophis each night so that dawn could come.",
  },
  {
    numeral: "III",
    title: "Our Inheritance",
    body: "We take from him not cruelty but sovereignty: the beauty of what is untamed, worn with the composure of an old aristocracy.",
  },
];

/** Sigil that inks itself as you read, beside three short chapters. */
export function MythologyTeaser() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.6"] });
  const draw = useTransform(scrollYProgress, [0, 0.85], [0, 1]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-12, 0]);

  return (
    <section
      ref={ref}
      aria-labelledby="myth-heading"
      className="relative overflow-hidden border-y border-[#b59660]/10 bg-[#0b0b0d] py-28 md:py-40"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_50%,rgb(87_21_31/0.25),transparent)]"
      />
      <div className="max-w-page px-margin relative mx-auto grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex justify-center">
          <m.svg
            viewBox="0 0 100 120"
            className="h-[min(70vh,560px)] w-auto text-[#b59660]"
            fill="none"
            stroke="currentColor"
            strokeWidth={0.45}
            aria-hidden="true"
            style={{ rotate: reduce ? 0 : rotate }}
          >
            {SIGIL_PATHS.map((d, index) => (
              <m.path
                key={index}
                d={d}
                strokeDasharray={index === 2 ? "0.6 2.4" : undefined}
                style={reduce || index === 2 ? undefined : { pathLength: draw }}
              />
            ))}
          </m.svg>
        </div>
        <div>
          <p className="sv-kicker mb-5">The Mythology</p>
          <LineReveal
            className="sv-display text-[clamp(2.5rem,1.6rem+3.6vw,5.25rem)] text-[#e5d8c5]"
            lines={[
              "Born of the storm,",
              <span key="i" className="sv-italic text-[#b59660]">
                raised by the night.
              </span>,
            ]}
          />
          <ol role="list" className="mt-14 space-y-10">
            {CHAPTERS.map((chapter, index) => (
              <Reveal
                as="li"
                key={chapter.numeral}
                delay={index * 0.08}
                className="grid grid-cols-[3rem_1fr] gap-4 border-t border-[#b59660]/15 pt-8"
              >
                <span className="font-heading text-lg text-[#b59660] italic">{chapter.numeral}</span>
                <div>
                  <h3 className="font-heading text-2xl text-[#e5d8c5]">{chapter.title}</h3>
                  <p className="mt-3 max-w-lg leading-relaxed text-[#a89d8e]">{chapter.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          <Reveal className="mt-12">
            <Link to="/mythology" viewTransition className="sv-button">
              Read the full mythology <Icon name="arrow" size={16} className="sv-arrow" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
