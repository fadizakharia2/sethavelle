import { gql, type StorefrontApi } from "@shopify/hydrogen";
import { Link } from "react-router";

import { Sigil } from "~/components/brand/Sigil";
import { ShopifyImage } from "~/components/ShopifyImage";

export const COLLECTION_CARD_FRAGMENT = gql(`
  fragment CollectionCard on Collection {
    id
    handle
    title
    description
    image {
      url
      altText
      width
      height
    }
    products(first: 1) {
      nodes {
        featuredImage {
          url
          altText
          width
          height
        }
      }
    }
  }
`);

const _COLLECTION_CARD_SHAPE_QUERY = gql(
  `query CollectionCardShape { collections(first: 1) { nodes { ...CollectionCard } } }`,
  [COLLECTION_CARD_FRAGMENT],
);

export type CollectionCardData = StorefrontApi.ResultOf<
  typeof _COLLECTION_CARD_SHAPE_QUERY
>["collections"]["nodes"][number];

export function CollectionCard({
  collection,
  index = 0,
  priority = false,
}: {
  collection: CollectionCardData;
  index?: number;
  priority?: boolean;
}) {
  const image = collection.image ?? collection.products.nodes[0]?.featuredImage ?? null;

  return (
    <article className="group relative" data-testid="collection-card">
      <div className="sv-frame relative aspect-[4/5] overflow-hidden bg-[#242126]">
        {image ? (
          <ShopifyImage
            image={image}
            alt={image.altText ?? collection.title}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            priority={priority}
            className="h-full w-full object-cover opacity-80 transition-[transform,opacity] duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04] group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Sigil className="h-1/3 w-auto text-[#b59660]/40" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d]/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
          <p className="sv-kicker mb-3 !text-[0.625rem]">{String(index + 1).padStart(2, "0")} — Collection</p>
          <h3 className="font-heading text-3xl text-[#e5d8c5] md:text-4xl">
            <Link
              to={`/collections/${collection.handle}`}
              viewTransition
              className="after:absolute after:inset-0"
            >
              {collection.title}
            </Link>
          </h3>
        </div>
      </div>
    </article>
  );
}
