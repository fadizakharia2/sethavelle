import { gql } from "@shopify/hydrogen";
import { Link } from "react-router";

import { Flacon } from "~/components/brand/Flacon";
import { Icon } from "~/components/brand/Icon";
import { PortalEngraving } from "~/components/brand/PortalEngraving";
import { LineReveal, Reveal } from "~/components/motion/Reveal";
import { Breadcrumbs } from "~/components/PageHeader";
import { ProductCard, PRODUCT_CARD_FRAGMENT } from "~/components/ProductCard";
import { ShopifyImage } from "~/components/ShopifyImage";
import { FRAGRANCE_CONCEPTS } from "~/content/fragrances";
import { toRoman } from "~/lib/roman";
import { buildMeta, canonicalUrl, pageTitle, truncate } from "~/lib/seo";
import { appConfigContext } from "~/lib/server/app-context";
import { storefrontClientContext } from "~/lib/storefront";

import type { Route } from "./+types/shop";

const MAX_CHAPTERS = 8;
const PRODUCTS_PER_CHAPTER = 6;

const SHOP_QUERY = gql(
  `
    query ShopChapters($chapters: Int!, $perChapter: Int!, $allHandle: String!) {
      all: collection(handle: $allHandle) {
        handle
      }
      collections(first: $chapters, sortKey: TITLE) {
        nodes {
          handle
          title
          description
          image {
            url
            altText
            width
            height
          }
          products(first: $perChapter) {
            nodes {
              ...ProductCard
            }
          }
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

const HIDDEN_HANDLES = new Set(["frontpage"]);

export function meta({ data }: Route.MetaArgs) {
  return buildMeta({
    title: pageTitle("Shop"),
    description: "The vault of SETHAVELLE: every fragrance of the house, gathered into chapters.",
    canonical: data?.canonical,
  });
}

/**
 * The shop as a book of chapters: one chapter per collection, each with its
 * first rites. Filtering and sorting live on each collection page (and on
 * the "shop all" collection, offered as the full ledger when it exists).
 */
export async function loader({ context, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const config = context.get(appConfigContext);
  const canonical = canonicalUrl(config.siteUrl, request.url);
  const origin = config.siteUrl ?? new URL(request.url).origin;

  const { data, errors } = await storefrontClient.graphql(SHOP_QUERY, {
    variables: {
      chapters: MAX_CHAPTERS + 2,
      perChapter: PRODUCTS_PER_CHAPTER,
      allHandle: config.shopAllHandle,
    },
  });
  if (errors?.length) console.error("Shop query returned errors");

  const chapters = (data?.collections.nodes ?? [])
    .filter((c) => c.handle !== config.shopAllHandle && !HIDDEN_HANDLES.has(c.handle))
    .filter((c) => c.products.nodes.length > 0)
    .slice(0, MAX_CHAPTERS)
    .map((c) => ({ ...c, description: truncate(c.description, 220) }));

  return { chapters, ledgerHandle: data?.all?.handle ?? null, canonical, origin };
}

type Chapter = Route.ComponentProps["loaderData"]["chapters"][number];

const crumbs = [
  { name: "House", path: "/" },
  { name: "Shop", path: "/shop" },
];

export default function ShopRoute({ loaderData }: Route.ComponentProps) {
  const { chapters, ledgerHandle, origin } = loaderData;

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <section className="relative isolate overflow-hidden border-b border-[#b59660]/15">
        <PortalEngraving className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-[#b59660] opacity-[0.05]" />
        <div
          aria-hidden="true"
          className="absolute -top-1/3 left-1/4 -z-10 h-[120%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgb(87_21_31/0.4),transparent)] blur-3xl"
        />
        <div className="max-w-page px-margin mx-auto grid w-full gap-14 pt-10 pb-20 md:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:pb-28">
          <div>
            <Breadcrumbs crumbs={crumbs} origin={origin} />
            <p className="sv-kicker mt-10 mb-6">The Vault</p>
            <LineReveal
              as="h1"
              immediate
              className="sv-display text-[clamp(3rem,1.8rem+5.5vw,8rem)] text-[#e5d8c5]"
              lines={[
                <span key="a">Every rite</span>,
                <span key="b" className="sv-italic ps-[0.6em] text-[#b59660]">
                  has its chapter.
                </span>,
              ]}
            />
            <p className="sv-lede mt-8 max-w-md">
              Read the house as a book. Each chapter gathers rites of one lineage; open any of them to filter,
              sort and see everything it holds.
            </p>
          </div>

          {chapters.length > 0 ? (
            <nav aria-label="Chapters" className="lg:pb-2">
              <p className="sv-kicker mb-5 !text-[0.625rem]">Contents</p>
              <ol className="space-y-1">
                {chapters.map((chapter, index) => (
                  <li key={chapter.handle}>
                    <a
                      href={`#chapter-${chapter.handle}`}
                      className="group flex min-h-11 items-baseline gap-4 text-[#e5d8c5]/80 transition-colors hover:text-[#e5d8c5]"
                    >
                      <span className="w-8 shrink-0 text-[0.625rem] tracking-[0.24em] text-[#b59660]">
                        {toRoman(index + 1)}
                      </span>
                      <span className="font-heading text-xl transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1">
                        {chapter.title}
                      </span>
                      <span
                        aria-hidden="true"
                        className="mb-1 flex-1 border-b border-dotted border-[#b59660]/30"
                      />
                      <span className="text-xs text-[#a89d8e] tabular-nums">
                        {chapter.products.nodes.length}
                        {chapter.products.nodes.length === PRODUCTS_PER_CHAPTER ? "+" : ""}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
        </div>
      </section>

      {chapters.length > 0 ? (
        chapters.map((chapter, index) => (
          <ChapterSection key={chapter.handle} chapter={chapter} index={index} />
        ))
      ) : (
        <SealedVault />
      )}

      {ledgerHandle ? (
        <section className="max-w-page px-margin mx-auto w-full py-24">
          <Reveal className="sv-panel sv-frame flex flex-col items-start justify-between gap-8 p-10 md:flex-row md:items-center md:p-14">
            <div>
              <p className="sv-kicker mb-4">The full ledger</p>
              <p className="font-heading max-w-xl text-3xl text-[#e5d8c5] md:text-4xl">
                Every rite on one page, to filter by availability and price and sort as you wish.
              </p>
            </div>
            <Link
              to={`/collections/${ledgerHandle}`}
              viewTransition
              className="sv-button sv-button--solid shrink-0"
            >
              Open the ledger <Icon name="arrow" size={16} className="sv-arrow" />
            </Link>
          </Reveal>
        </section>
      ) : null}
    </main>
  );
}

function ChapterSection({ chapter, index }: { chapter: Chapter; index: number }) {
  const numeral = toRoman(index + 1);
  const href = `/collections/${chapter.handle}`;

  return (
    <section
      id={`chapter-${chapter.handle}`}
      aria-labelledby={`chapter-${chapter.handle}-title`}
      className="scroll-mt-[calc(var(--header-height)+1rem)] border-b border-[#b59660]/10"
    >
      <div className="max-w-page px-margin mx-auto grid w-full gap-12 py-20 md:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <header className="lg:sticky lg:top-[calc(var(--header-height)+3rem)] lg:self-start">
          <p
            aria-hidden="true"
            className="font-heading text-[clamp(5rem,3rem+8vw,11rem)] leading-[0.8] text-transparent [-webkit-text-stroke:1px_rgb(181_150_96/0.55)]"
          >
            {numeral}
          </p>
          <p className="sv-kicker mt-8 mb-4">Chapter {numeral}</p>
          <h2
            id={`chapter-${chapter.handle}-title`}
            className="sv-display text-[clamp(2.25rem,1.6rem+2.6vw,4rem)] text-[#e5d8c5]"
          >
            {chapter.title}
          </h2>
          {chapter.description ? <p className="sv-lede mt-6 max-w-sm">{chapter.description}</p> : null}
          <div className="mt-10 flex items-center gap-6">
            {chapter.image ? (
              <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-t-[999px] border border-[#b59660]/30">
                <ShopifyImage
                  image={chapter.image}
                  alt=""
                  sizes="6rem"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <Link
              to={href}
              viewTransition
              className="sv-link text-[0.6875rem] tracking-[0.26em] text-[#e5d8c5] uppercase"
            >
              Enter the chapter <Icon name="arrow" size={14} className="ms-2 inline" />
            </Link>
          </div>
        </header>

        <ul role="list" className="grid grid-cols-2 gap-x-4 gap-y-14 md:gap-x-8">
          {chapter.products.nodes.map((product, i) => (
            <Reveal
              as="li"
              key={product.id}
              delay={(i % 2) * 0.08}
              className={i % 2 === 1 ? "md:translate-y-20" : undefined}
            >
              <ProductCard
                product={product}
                priority={index === 0 && i < 2}
                sizes="(min-width: 1024px) 26vw, 46vw"
              />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** No published collections yet: show the three rites as forthcoming. */
function SealedVault() {
  return (
    <section className="max-w-page px-margin mx-auto w-full py-24">
      <p className="sv-kicker mb-10 text-center">The vault is sealed · the rites are forthcoming</p>
      <ul role="list" className="grid gap-6 md:grid-cols-3">
        {FRAGRANCE_CONCEPTS.map((concept) => (
          <li
            key={concept.handle}
            className="sv-frame relative flex flex-col items-center overflow-hidden border border-[#b59660]/15 px-8 pt-12 pb-10 text-center"
            style={{
              background: `radial-gradient(70% 60% at 50% 40%, ${concept.palette.glow}26, transparent 70%), ${concept.palette.ground}`,
            }}
          >
            <Flacon concept={concept} className="h-56 w-auto" />
            <p className="sv-kicker mt-8 mb-2 !text-[0.625rem]">
              Rite {concept.numeral} · {concept.register}
            </p>
            <p className="font-heading text-3xl text-[#e5d8c5]">{concept.name}</p>
            <p className="font-heading mt-3 text-[#e5d8c5]/70 italic">“{concept.epigraph}”</p>
          </li>
        ))}
      </ul>
      <div className="mt-12 text-center">
        <Link to="/" className="sv-button">
          Return to the house
        </Link>
      </div>
    </section>
  );
}
