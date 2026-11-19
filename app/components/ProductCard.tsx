import { gql, type StorefrontApi } from "@shopify/hydrogen";
import { Link } from "react-router";

import { Flacon } from "~/components/brand/Flacon";
import { Sigil } from "~/components/brand/Sigil";
import { ShopifyImage } from "~/components/ShopifyImage";
import { conceptForHandle } from "~/content/fragrances";
import { compareMoney, formatPrice } from "~/lib/money";

export const PRODUCT_CARD_FRAGMENT = gql(`
  fragment ProductCard on Product {
    id
    handle
    title
    productType
    featuredImage {
      url
      altText
      width
      height
    }
    images(first: 2) {
      nodes {
        url
        altText
        width
        height
      }
    }
    availableForSale
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
`);

const _PRODUCT_CARD_SHAPE_QUERY = gql(
  `query ProductCardShape { products(first: 1) { nodes { ...ProductCard } } }`,
  [PRODUCT_CARD_FRAGMENT],
);

export type ProductCardData = StorefrontApi.ResultOf<
  typeof _PRODUCT_CARD_SHAPE_QUERY
>["products"]["nodes"][number];

type ProductCardProps = {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
};

export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw",
}: ProductCardProps) {
  const primaryImage = product.featuredImage ?? product.images.nodes[0] ?? null;
  const hoverImage = product.images.nodes.find((image) => image.url !== primaryImage?.url) ?? null;
  const price = product.priceRange.minVariantPrice;
  const hasRange = compareMoney(product.priceRange.maxVariantPrice, price) > 0;
  const compareAt = product.compareAtPriceRange.minVariantPrice;
  const onSale = compareMoney(compareAt, price) > 0;
  const concept = conceptForHandle(product.handle);

  return (
    <article className="group relative flex flex-col" aria-label={product.title} data-testid="product-card">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#141216]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_70%,rgb(87_21_31/0.35),transparent)] opacity-60 transition-opacity duration-700 group-hover:opacity-100"
        />
        {primaryImage ? (
          <ShopifyImage
            image={primaryImage}
            alt={primaryImage.altText ?? product.title}
            sizes={sizes}
            priority={priority}
            className="relative h-full w-full object-cover transition-[transform,filter,opacity] duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.035]"
          />
        ) : concept ? (
          <div className="relative flex h-full items-center justify-center p-[14%]">
            <Flacon
              concept={concept}
              className="h-full w-auto transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:-translate-y-2"
            />
          </div>
        ) : (
          <div className="relative flex h-full items-center justify-center">
            <Sigil className="h-1/3 w-auto text-[#b59660]/35" />
          </div>
        )}
        {hoverImage ? (
          <div className="pointer-events-none absolute inset-0 opacity-0 blur-sm transition-[opacity,filter] duration-700 ease-[var(--ease-ui)] group-hover:opacity-100 group-hover:blur-0">
            <ShopifyImage image={hoverImage} alt="" sizes={sizes} className="h-full w-full object-cover" />
          </div>
        ) : null}
        {!product.availableForSale ? (
          <span className="absolute start-4 top-4 border border-[#e5d8c5]/30 bg-[#0b0b0d]/70 px-2.5 py-1 text-[0.5625rem] tracking-[0.28em] text-[#e5d8c5] uppercase backdrop-blur">
            Sold out
          </span>
        ) : null}
        <span
          aria-hidden="true"
          className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 bg-[#b59660] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 pt-5">
        {product.productType ? (
          <p className="text-[0.5625rem] tracking-[0.3em] text-[#b59660] uppercase">{product.productType}</p>
        ) : null}
        <h3 className="font-heading text-xl leading-tight text-[#e5d8c5] md:text-2xl">
          <Link
            to={`/products/${product.handle}`}
            viewTransition
            className="after:absolute after:inset-0 focus-visible:outline-none group-has-[:focus-visible]:underline"
          >
            {product.title}
          </Link>
        </h3>
        <p className="text-sm text-[#a89d8e] tabular-nums">
          {onSale ? (
            <>
              <span className="sr-only">Sale price: </span>
              <span className="text-[#e5d8c5]">{formatPrice(price)}</span>{" "}
              <s className="ms-1 opacity-70">
                <span className="sr-only">Regular price: </span>
                {formatPrice(compareAt)}
              </s>
            </>
          ) : (
            <>
              {hasRange ? "From " : null}
              <span className="sr-only">Price: </span>
              {formatPrice(price)}
            </>
          )}
        </p>
      </div>
    </article>
  );
}
