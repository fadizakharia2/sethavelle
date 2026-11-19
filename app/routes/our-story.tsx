import { Link } from "react-router";

import { Icon } from "~/components/brand/Icon";
import { Sigil } from "~/components/brand/Sigil";
import { LineReveal, Reveal, ScrollLitText } from "~/components/motion/Reveal";
import { PageHeader } from "~/components/PageHeader";
import { buildMeta, pageTitle } from "~/lib/seo";

import type { Route } from "./+types/our-story";

export function meta({ matches }: Route.MetaArgs) {
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  return buildMeta({
    title: pageTitle("Our Story"),
    description: "Why a fragrance house would take a god of storms and chaos as its patron.",
    canonical: root?.origin ? `${root.origin}/our-story` : undefined,
  });
}

const PILLARS = [
  {
    title: "Darkness as a material",
    body: "We treat the night as something to compose with: shadow, smoke, velvet and candle-warmth, rather than an absence of light.",
  },
  {
    title: "Ritual over routine",
    body: "A fragrance should mark a threshold. Each of ours is conceived as a rite, with its own atmosphere, its own hour and its own story.",
  },
  {
    title: "Restraint, then excess",
    body: "Our aesthetic is aristocratic and exact. The drama is in the material, never in decoration for its own sake.",
  },
];

export default function OurStory({ matches }: Route.ComponentProps) {
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHeader
        kicker="Our Story"
        title="A house founded"
        italic="after dark"
        origin={root?.origin}
        crumbs={[
          { name: "House", path: "/" },
          { name: "Our Story", path: "/our-story" },
        ]}
      />
      <section className="max-w-page px-margin mx-auto w-full py-16 md:py-24">
        <ScrollLitText
          className="font-heading max-w-5xl text-[clamp(1.6rem,1.1rem+2vw,3.25rem)] leading-[1.22] text-[#e5d8c5]"
          text="SETHAVELLE began with a question: why are the most beautiful things in our stories so often the dangerous ones? The storm, the forbidden room, the stranger at the masked ball. We set out to make perfumes that carry that charge, and to present them with the gravity of an old house rather than the noise of a costume shop."
        />
      </section>

      <section aria-labelledby="pillars-heading" className="max-w-page px-margin mx-auto w-full pb-28">
        <h2 id="pillars-heading" className="sv-kicker mb-12">
          What we hold to
        </h2>
        <ol role="list" className="grid gap-px bg-[#b59660]/15 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <Reveal as="li" key={pillar.title} delay={index * 0.1} className="bg-[#0b0b0d] p-8 md:p-10">
              <span className="font-heading text-5xl text-[#b59660] italic">{["I", "II", "III"][index]}</span>
              <h3 className="font-heading mt-8 text-2xl text-[#e5d8c5]">{pillar.title}</h3>
              <p className="mt-4 leading-relaxed text-[#a89d8e]">{pillar.body}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="relative overflow-hidden border-t border-[#b59660]/10 py-28 text-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_100%,rgb(87_21_31/0.4),transparent)]"
        />
        <div className="px-margin relative mx-auto max-w-3xl">
          <Sigil className="mx-auto mb-10 h-24 w-auto text-[#b59660]" />
          <LineReveal
            className="sv-display text-[clamp(2.25rem,1.5rem+3vw,4.5rem)] text-[#e5d8c5]"
            lines={[
              "The night has a pedigree.",
              <span key="b" className="sv-italic text-[#b59660]">
                Wear it.
              </span>,
            ]}
          />
          <Reveal className="mt-12">
            <Link to="/shop" className="sv-button sv-button--solid" viewTransition>
              Discover the rites <Icon name="arrow" size={16} className="sv-arrow" />
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
