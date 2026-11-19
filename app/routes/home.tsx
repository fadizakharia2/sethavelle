import { gql } from "@shopify/hydrogen";
import { Link, useRouteLoaderData } from "react-router";

import { Icon } from "~/components/brand/Icon";
import { Anatomy } from "~/components/home/Anatomy";
import { CandleHero, type HeroImage } from "~/components/home/CandleHero";
import { MythologyTeaser } from "~/components/home/MythologyTeaser";
import { RitesGallery, type Rite } from "~/components/home/RitesGallery";
import { JsonLd } from "~/components/JsonLd";
import { LineReveal, Reveal, ScrollLitText } from "~/components/motion/Reveal";
import { NewsletterForm } from "~/components/NewsletterForm";
import { ProductCard, PRODUCT_CARD_FRAGMENT, type ProductCardData } from "~/components/ProductCard";
import { FRAGRANCE_CONCEPTS } from "~/content/fragrances";
import { BRAND } from "~/content/site";
import { buildMeta, organizationJsonLd, pageTitle } from "~/lib/seo";
import { storefrontClientContext } from "~/lib/storefront";
import type { loader as rootLoader } from "~/root";

import type { Route } from "./+types/home";

const HOME_QUERY = gql(
  `
    query Home($rite1: String!, $rite2: String!, $rite3: String!) {
      rite1: product(handle: $rite1) { ...ProductCard }
      rite2: product(handle: $rite2) { ...ProductCard }
      rite3: product(handle: $rite3) { ...ProductCard }
      products(first: 8, sortKey: BEST_SELLING) {
        nodes { ...ProductCard }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

export function meta({ matches }: Route.MetaArgs) {
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  return buildMeta({
    title: pageTitle(),
    description: BRAND.description,
    canonical: root?.origin ? `${root.origin}/` : undefined,
  });
}

export async function loader({ context }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const [c1, c2, c3] = FRAGRANCE_CONCEPTS;
  const { data, errors } = await storefrontClient.graphql(HOME_QUERY, {
    variables: { rite1: c1!.handle, rite2: c2!.handle, rite3: c3!.handle },
  });
  if (errors?.length) console.error("Home query returned errors");

  const riteProducts = [data?.rite1 ?? null, data?.rite2 ?? null, data?.rite3 ?? null];
  const featured: ProductCardData[] = data?.products.nodes ?? [];
  const heroProduct = riteProducts[1] ?? riteProducts[0] ?? riteProducts[2];
  const heroImage: HeroImage | null = heroProduct?.featuredImage ?? null;

  return { riteProducts, featured, heroImage };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const root = useRouteLoaderData<typeof rootLoader>("root");
  const rites: Rite[] = FRAGRANCE_CONCEPTS.map((concept, index) => ({
    concept,
    product: loaderData.riteProducts[index] ?? null,
  }));

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 -mt-0">
      {root?.origin ? <JsonLd data={organizationJsonLd(root.origin)} /> : null}
      <CandleHero image={loaderData.heroImage} />

      <section aria-label="Manifesto" className="max-w-page px-margin mx-auto w-full py-32 md:py-48">
        <p className="sv-kicker mb-10 text-center">◆ The House ◆</p>
        <ScrollLitText
          className="font-heading mx-auto max-w-5xl text-center text-[clamp(1.75rem,1.1rem+2.6vw,3.75rem)] leading-[1.18] text-[#e5d8c5]"
          text="Seth was the storm at the edge of the ordered world, the god who would not kneel. We compose for those who feel more at home in candlelight than in daylight: perfumes with the gravity of ritual and the poise of old nobility."
        />
      </section>

      <RitesGallery rites={rites} />

      <MythologyTeaser />

      <Anatomy />

      {loaderData.featured.length > 0 ? (
        <section aria-labelledby="featured-heading" className="max-w-page px-margin mx-auto w-full pb-32">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6 border-t border-[#b59660]/15 pt-16">
            <div>
              <p className="sv-kicker mb-4">From the vault</p>
              <LineReveal
                className="sv-display text-[clamp(2.25rem,1.5rem+3vw,4.5rem)] text-[#e5d8c5]"
                lines={[
                  <span key="h" id="featured-heading">
                    The Collection
                  </span>,
                ]}
              />
            </div>
            <Link
              to="/shop"
              viewTransition
              className="sv-link text-[0.6875rem] tracking-[0.26em] text-[#e5d8c5] uppercase"
            >
              View everything <Icon name="arrow" size={14} className="ms-2 inline" />
            </Link>
          </div>
          <ul role="list" className="grid grid-cols-2 gap-x-4 gap-y-14 md:gap-x-8 lg:grid-cols-4">
            {loaderData.featured.map((product, index) => (
              <Reveal as="li" key={product.id} delay={(index % 4) * 0.07}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="letters-heading"
        className="relative overflow-hidden border-t border-[#b59660]/15 bg-[#57151f]/[0.18] py-28 md:py-36"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_100%,rgb(87_21_31/0.55),transparent)]"
        />
        <div className="px-margin relative mx-auto max-w-3xl text-center">
          <p className="sv-kicker mb-6">By invitation</p>
          <LineReveal
            className="sv-display text-[clamp(2.25rem,1.5rem+3vw,4.5rem)] text-[#e5d8c5]"
            lines={[
              <span key="a" id="letters-heading">
                Receive the letters
              </span>,
              <span key="b" className="sv-italic text-[#b59660]">
                of the house.
              </span>,
            ]}
          />
          <p className="sv-lede mx-auto mt-6 max-w-lg">
            Launches, private salons and the occasional piece of forbidden history. Rarely, and never shared.
          </p>
          <div className="mx-auto mt-12 max-w-xl text-left">
            <NewsletterForm variant="feature" />
          </div>
        </div>
      </section>
    </main>
  );
}
