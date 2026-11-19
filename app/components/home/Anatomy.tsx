import { LineReveal, Reveal } from "~/components/motion/Reveal";

const LAYERS = [
  {
    name: "Head",
    term: "Top notes",
    body: "The first impression, and the most fleeting. The opening lines of the rite, before the doors close.",
  },
  {
    name: "Heart",
    term: "Heart notes",
    body: "The character of the perfume, revealed once the opening has faded. Where the story is told.",
  },
  {
    name: "Shadow",
    term: "Base notes",
    body: "The slowest materials, the trail you leave in a room after you have gone.",
  },
];

/**
 * Editorial explainer of how a perfume is structured. It describes perfumery
 * in general — each fragrance's actual notes come from Shopify, on its page.
 */
export function Anatomy() {
  return (
    <section aria-labelledby="anatomy-heading" className="max-w-page px-margin mx-auto w-full py-28 md:py-40">
      <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="sv-kicker mb-5">Anatomy of a rite</p>
          <LineReveal
            className="sv-display text-[clamp(2.5rem,1.6rem+3.4vw,5rem)] text-[#e5d8c5]"
            lines={[
              "A perfume is",
              <span key="i" className="sv-italic text-[#b59660]">
                a descent.
              </span>,
            ]}
          />
          <Reveal delay={0.2}>
            <p className="sv-lede mt-8 max-w-md">
              Every SETHAVELLE composition unfolds in three movements. Each fragrance page lists its own
              notes, as published by the house.
            </p>
          </Reveal>
        </div>
        <ol role="list" className="relative">
          <span
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-[1.15rem] w-px bg-gradient-to-b from-[#b59660]/70 via-[#57151f] to-transparent md:left-[1.4rem]"
          />
          {LAYERS.map((layer, index) => (
            <Reveal
              as="li"
              key={layer.name}
              delay={index * 0.1}
              className="relative grid grid-cols-[2.5rem_1fr] gap-6 pb-20 last:pb-0 md:grid-cols-[3rem_1fr]"
            >
              <span className="relative z-10 flex size-9 items-center justify-center border border-[#b59660]/60 bg-[#0b0b0d] font-heading text-sm text-[#b59660] italic md:size-11">
                {["I", "II", "III"][index]}
              </span>
              <div style={{ paddingLeft: `${index * 1.5}rem` }}>
                <p className="text-[0.625rem] tracking-[0.3em] text-[#a89d8e] uppercase">{layer.term}</p>
                <h3
                  className="font-heading mt-2 text-5xl text-[#e5d8c5] md:text-7xl"
                  style={{ opacity: 1 - index * 0.14 }}
                >
                  {layer.name}
                </h3>
                <p className="mt-4 max-w-md leading-relaxed text-[#a89d8e]">{layer.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
