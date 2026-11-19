import {
  AnalyticsEvent,
  buildProductSelectionSearchParams,
  canAddToCart,
  getSelectedProductOptions,
  gql,
  type SelectedOption,
} from "@shopify/hydrogen";
import { ShopPayButton } from "@shopify/hydrogen/react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useRouteLoaderData } from "react-router";

import { Flacon } from "~/components/brand/Flacon";
import { Icon } from "~/components/brand/Icon";
import { Sigil } from "~/components/brand/Sigil";
import { JsonLd } from "~/components/JsonLd";
import { LineReveal, Reveal } from "~/components/motion/Reveal";
import { Breadcrumbs } from "~/components/PageHeader";
import { ProductCard, PRODUCT_CARD_FRAGMENT } from "~/components/ProductCard";
import { RichText } from "~/components/RichText";
import { ShopifyImage } from "~/components/ShopifyImage";
import { conceptForHandle } from "~/content/fragrances";
import { openCartDrawer } from "~/lib/cart-drawer";
import {
  FRAGRANCE_METAFIELD_IDENTIFIERS,
  hasNotes,
  parseFragranceMetafields,
  type FragranceDetails,
} from "~/lib/fragrance-metafields";
import { shopifyImageUrl } from "~/lib/image";
import { formatPrice, salePercent } from "~/lib/money";
import { ProductProvider, useProductForm } from "~/lib/product";
import { htmlToBlocks, textToParagraphs } from "~/lib/rich-text";
import { buildMeta, canonicalUrl, pageTitle, truncate } from "~/lib/seo";
import { appConfigContext } from "~/lib/server/app-context";
import { storefrontClientContext } from "~/lib/storefront";
import type { loader as rootLoader } from "~/root";

import type { Route } from "./+types/product";

const PRODUCT_VARIANT_FRAGMENT = gql(`
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    quantityAvailable
    selectedOptions {
      name
      value
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    image {
      id
      url
      altText
      width
      height
    }
    product {
      title
      handle
    }
    sku
  }
`);

const PRODUCT_QUERY = gql(
  `
    query ProductPage(
      $handle: String!
      $selectedOptions: [SelectedOptionInput!]!
      $metafields: [HasMetafieldsIdentifier!]!
    ) {
      product(handle: $handle) {
        id
        handle
        title
        vendor
        productType
        description
        descriptionHtml
        requiresSellingPlan
        encodedVariantExistence
        encodedVariantAvailability
        seo {
          title
          description
        }
        collections(first: 1) {
          nodes {
            handle
            title
          }
        }
        metafields(identifiers: $metafields) {
          key
          value
          type
        }
        featuredImage {
          id
          url
          altText
          width
          height
        }
        images(first: 8) {
          nodes {
            id
            url
            altText
            width
            height
          }
        }
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
        variants(first: 20) {
          nodes {
            id
            sku
            title
            availableForSale
            price {
              amount
              currencyCode
            }
          }
        }
        options {
          name
          optionValues {
            name
            firstSelectableVariant {
              ...ProductVariantFields
            }
            swatch {
              color
              image {
                previewImage {
                  url
                }
              }
            }
          }
        }
        selectedOrFirstAvailableVariant(
          selectedOptions: $selectedOptions
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
          ...ProductVariantFields
        }
        adjacentVariants(
          selectedOptions: $selectedOptions
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
          ...ProductVariantFields
        }
      }
      productRecommendations(productHandle: $handle, intent: RELATED) {
        ...ProductCard
      }
    }
  `,
  [PRODUCT_VARIANT_FRAGMENT, PRODUCT_CARD_FRAGMENT],
);

export function meta({ data, matches }: Route.MetaArgs) {
  if (!data) return [{ title: pageTitle("Not found") }];
  const { product, canonical } = data;
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  void root;
  const image = product.featuredImage?.url ? shopifyImageUrl(product.featuredImage.url, 1200) : null;
  return buildMeta({
    title: pageTitle(product.seo.title ?? product.title),
    description: truncate(product.seo.description ?? product.description),
    canonical,
    image,
    type: "product",
  });
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle || !/^[a-z0-9][a-z0-9-]{0,254}$/i.test(handle)) {
    throw new Response("Not Found", { status: 404 });
  }

  const storefrontClient = context.get(storefrontClientContext);
  const config = context.get(appConfigContext);
  const selectedOptions = getSelectedProductOptions({
    searchParams: new URL(request.url).searchParams,
  });
  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: {
      handle,
      selectedOptions,
      metafields: [...FRAGRANCE_METAFIELD_IDENTIFIERS],
    },
  });

  if (!data?.product) throw new Response("Not Found", { status: 404 });

  const origin = config.siteUrl ?? new URL(request.url).origin;
  return {
    product: data.product,
    details: parseFragranceMetafields(data.product.metafields),
    descriptionBlocks: htmlToBlocks(data.product.descriptionHtml),
    relatedProducts: (data.productRecommendations ?? [])
      .filter((product) => product.handle !== data.product?.handle)
      .slice(0, 4),
    canonical: canonicalUrl(config.siteUrl, request.url),
    origin,
    demoMode: config.storefront.kind === "mock",
  };
}

type LoaderData = Route.ComponentProps["loaderData"];
type ProductData = LoaderData["product"];
type ProductVariant = NonNullable<ProductData["selectedOrFirstAvailableVariant"]>;

type ProductImage = {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

function variantUrl(
  product: { handle: string; options: Array<{ name: string }> },
  selectedOptions: SelectedOption[],
  handle = product.handle,
  base: URLSearchParams = new URLSearchParams(),
) {
  const params = buildProductSelectionSearchParams({
    selectedOptions,
    optionNames: product.options.map((option) => option.name),
    base,
  });
  const query = params.toString();
  return `/products/${handle}${query ? `?${query}` : ""}`;
}

function ProductViewedTracker({ product }: { product: ProductData }) {
  useEffect(() => {
    const selectedVariant = product.selectedOrFirstAvailableVariant;
    window.Shopify?.analytics?.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: product.id,
          title: product.title,
          price: selectedVariant?.price ?? product.priceRange.minVariantPrice,
          vendor: product.vendor ?? "",
          variantId: selectedVariant?.id ?? product.id,
          variantTitle: selectedVariant?.title ?? product.title,
          quantity: 1,
          sku: selectedVariant?.sku,
          productType: product.productType,
        },
      ],
    });
  }, [product]);

  return null;
}

function productJsonLd(product: ProductData, details: FragranceDetails, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: truncate(product.description, 500),
    image: product.images.nodes.slice(0, 4).map((image) => image.url),
    brand: { "@type": "Brand", name: product.vendor || "SETHAVELLE" },
    ...(details.family ? { category: details.family } : {}),
    url,
    offers: product.variants.nodes.map((variant) => ({
      "@type": "Offer",
      sku: variant.sku || undefined,
      name: variant.title,
      price: variant.price.amount,
      priceCurrency: variant.price.currencyCode,
      availability: variant.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    })),
  };
}

function useGalleryImages(product: ProductData, selectedVariant: ProductVariant | null) {
  return useMemo(() => {
    const images: ProductImage[] = [];
    const seen = new Set<string>();
    const addImage = (image: ProductImage | null | undefined) => {
      if (!image?.url || seen.has(image.url)) return;
      seen.add(image.url);
      images.push(image);
    };
    addImage(selectedVariant?.image ?? product.featuredImage ?? product.images.nodes[0]);
    for (const image of product.images.nodes) addImage(image);
    return images;
  }, [product, selectedVariant]);
}

function ProductGallery({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: ProductVariant | null;
}) {
  const images = useGalleryImages(product, selectedVariant);
  const [activeIndex, setActiveIndex] = useState(0);
  const primaryImageUrl = images[0]?.url;
  const [shownPrimary, setShownPrimary] = useState(primaryImageUrl);
  const concept = conceptForHandle(product.handle);

  // A new variant brings a new image set: return to its first frame.
  if (shownPrimary !== primaryImageUrl) {
    setShownPrimary(primaryImageUrl);
    setActiveIndex(0);
  }

  if (images.length === 0) {
    return (
      <div
        className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-[#141216] lg:sticky lg:top-[var(--header-height)] lg:h-[calc(100svh-var(--header-height))] lg:aspect-auto"
        data-testid="product-gallery"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_60%,rgb(87_21_31/0.45),transparent)]"
        />
        {concept ? (
          <Flacon concept={concept} className="relative h-[72%] w-auto" />
        ) : (
          <Sigil
            title={`${product.title} — imagery forthcoming`}
            className="relative h-1/3 w-auto text-[#b59660]/50"
          />
        )}
      </div>
    );
  }

  return (
    <div data-testid="product-gallery" className="relative">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`${product.title} images`}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:flex-col lg:overflow-visible"
        // Scrollable regions must be keyboard-reachable (WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        onScroll={(event) => {
          const track = event.currentTarget;
          if (track.clientWidth > 0 && window.matchMedia("(max-width: 1023px)").matches) {
            setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
          }
        }}
      >
        {images.map((image, index) => (
          <div
            key={image.url}
            role="group"
            aria-roledescription="slide"
            aria-label={`Image ${index + 1} of ${images.length}`}
            className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-[#141216]"
          >
            <ShopifyImage
              image={image}
              alt={image.altText ?? `${product.title}, image ${index + 1}`}
              sizes="(min-width: 1024px) 55vw, 100vw"
              priority={index === 0}
              fallbackWidth={1200}
              className="h-full w-full object-cover"
              data-testid={index === 0 ? "product-gallery-image" : undefined}
            />
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <div aria-hidden="true" className="absolute inset-x-0 bottom-5 flex justify-center gap-2 lg:hidden">
          {images.map((image, index) => (
            <span
              key={image.url}
              className={`h-px transition-[width,background-color] duration-300 ${index === activeIndex ? "w-8 bg-[#b59660]" : "w-4 bg-[#e5d8c5]/35"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PriceBlock({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: ProductVariant | null;
}) {
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = selectedVariant?.compareAtPrice;
  const percent = salePercent(price, compareAt);

  return (
    <div className="flex flex-wrap items-baseline gap-3 tabular-nums" data-product-price>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={`${price.amount}-${price.currencyCode}`}
          initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="font-heading text-2xl text-[#e5d8c5]"
        >
          <span className="sr-only">{compareAt && percent ? "Sale price: " : "Price: "}</span>
          {formatPrice(price)}
        </m.span>
      </AnimatePresence>
      {compareAt && percent ? (
        <>
          <s className="text-sm text-[#a89d8e]">
            <span className="sr-only">Regular price: </span>
            {formatPrice(compareAt)}
          </s>
          <span className="text-[0.625rem] tracking-[0.24em] text-[#d8798a] uppercase">Save {percent}%</span>
        </>
      ) : null}
    </div>
  );
}

function Availability({ selectedVariant }: { selectedVariant: ProductVariant | null }) {
  if (!selectedVariant) return null;
  const quantity = selectedVariant.quantityAvailable;
  let label = "Available";
  let tone = "bg-[#9fb98a]";
  if (!selectedVariant.availableForSale) {
    label = "Sold out";
    tone = "bg-[#d8798a]";
  } else if (quantity != null && quantity > 0 && quantity <= 5) {
    label = `Only ${quantity} remaining`;
    tone = "bg-[#d9b46c]";
  }
  return (
    <p
      className="flex items-center gap-2.5 text-xs tracking-[0.18em] text-[#a89d8e] uppercase"
      data-product-inventory
    >
      <span aria-hidden="true" className={`inline-block size-1.5 rotate-45 ${tone}`} />
      {label}
    </p>
  );
}

function isPlainActivation(event: MouseEvent<HTMLAnchorElement>) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    (!event.currentTarget.target || event.currentTarget.target === "_self")
  );
}

function VariantOptions({ product }: { product: ProductData }) {
  const { options, register } = useProductForm();
  const location = useLocation();
  const baseParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  // Products with only Shopify's "Default Title" option have nothing to choose.
  const visible = options.filter(
    (option) => !(option.values.length === 1 && option.values[0]?.name === "Default Title"),
  );
  if (visible.length === 0) return null;

  return (
    <div className="space-y-6">
      {visible.map((option) => {
        const selectedValue = option.values.find((value) => value.selected)?.name;
        return (
          <fieldset key={option.name}>
            <legend className="mb-3 flex w-full items-baseline justify-between text-[0.625rem] tracking-[0.28em] text-[#a89d8e] uppercase">
              <span>{option.name}</span>
              {selectedValue ? (
                <span className="font-heading text-sm tracking-normal text-[#e5d8c5] normal-case italic">
                  {selectedValue}
                </span>
              ) : null}
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label={option.name}>
              {option.values.map((variantOption) => {
                const valueName = variantOption.name;
                const registered = register("optionValue", { optionName: option.name, value: valueName });
                const isCrossProduct = variantOption.handle !== product.handle;
                const linkTarget = variantUrl(
                  product,
                  variantOption.selectedOptions,
                  variantOption.handle,
                  baseParams,
                );
                const soldOut = !variantOption.available;
                const className = `relative inline-flex min-h-12 min-w-16 items-center justify-center border px-5 text-sm transition-[border-color,background-color,color,transform] duration-200 ease-[var(--ease-ui)] active:scale-[0.97] ${
                  variantOption.selected
                    ? "border-[#b59660] bg-[#b59660]/10 text-[#e5d8c5]"
                    : "border-[#b59660]/25 text-[#e5d8c5]/80 hover:border-[#b59660]/60"
                } ${soldOut ? "text-[#e5d8c5]/40 line-through decoration-[#b59660]/50" : ""}`;
                const content = (
                  <>
                    {valueName}
                    {soldOut ? <span className="sr-only"> (sold out)</span> : null}
                  </>
                );

                if (!isCrossProduct && !variantOption.exists) {
                  return (
                    <button
                      key={valueName}
                      type="button"
                      disabled
                      className={`${className} cursor-not-allowed opacity-40`}
                      aria-pressed={variantOption.selected}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <Link
                    key={valueName}
                    to={linkTarget}
                    replace={!isCrossProduct}
                    preventScrollReset
                    className={className}
                    aria-current={variantOption.selected ? "true" : undefined}
                    onClick={
                      isCrossProduct
                        ? undefined
                        : (event) => {
                            if (!isPlainActivation(event)) return;
                            registered.onClick();
                            event.preventDefault();
                          }
                    }
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function QuantitySelector({
  quantity,
  setQuantity,
}: {
  quantity: number;
  setQuantity: (quantity: number) => void;
}) {
  const { register } = useProductForm();
  const clamp = (value: number) => Math.min(10, Math.max(1, value));

  return (
    <div className="inline-flex h-14 items-center border border-[#b59660]/30" data-testid="quantity-stepper">
      <button
        type="button"
        className="inline-flex size-12 items-center justify-center text-[#e5d8c5]/70 hover:text-[#e5d8c5] disabled:opacity-30"
        aria-label="Decrease quantity"
        onClick={() => setQuantity(clamp(quantity - 1))}
        disabled={quantity <= 1}
      >
        <Icon name="minus" size={14} />
      </button>
      <label htmlFor="quantity" className="sr-only">
        Quantity
      </label>
      <input
        type="number"
        id="quantity"
        {...register("quantity", { value: quantity })}
        min={1}
        max={10}
        step={1}
        inputMode="numeric"
        className="number-reset !w-10 !border-0 !bg-transparent !p-0 text-center tabular-nums"
        onChange={(event) => setQuantity(clamp(Number.parseInt(event.currentTarget.value, 10) || 1))}
      />
      <button
        type="button"
        className="inline-flex size-12 items-center justify-center text-[#e5d8c5]/70 hover:text-[#e5d8c5] disabled:opacity-30"
        aria-label="Increase quantity"
        onClick={() => setQuantity(clamp(quantity + 1))}
        disabled={quantity >= 10}
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

function AddToCart({
  product,
  quantity,
  setQuantity,
  selectedVariant,
}: {
  product: ProductData;
  quantity: number;
  setQuantity: (quantity: number) => void;
  selectedVariant: ProductVariant | null;
}) {
  const { options, register, formProps, errors, pending } = useProductForm();
  const addable = canAddToCart(product, options);
  const buttonText = pending
    ? "Adding…"
    : addable
      ? "Add to bag"
      : selectedVariant
        ? "Sold out"
        : "Select an option";
  const messages = [...errors.userErrors, ...errors.networkErrors];

  return (
    <>
      <form {...formProps({ afterSubmit: openCartDrawer })} className="flex gap-3">
        <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
        <input type="hidden" {...register("merchandiseId", {})} />
        <button
          {...register("addToCart", {})}
          className="sv-button sv-button--solid h-14 flex-1"
          disabled={!addable || pending}
          data-testid="add-to-cart"
        >
          {buttonText}
        </button>
      </form>
      {selectedVariant && addable ? (
        <div className="mt-3 [&_shopify-buy-button]:w-full">
          <ShopPayButton
            variants={[{ id: selectedVariant.id, quantity }]}
            disabled={!addable || pending}
            width="100%"
            borderRadius="0px"
          />
        </div>
      ) : null}
      <div role="alert" aria-live="assertive" className="mt-3 grid gap-1 text-sm">
        {messages.map((error) => (
          <p key={error.message} className="text-[#d8798a]">
            {error.message}
          </p>
        ))}
        {errors.warnings.map((warning) => (
          <p key={warning.message} className="text-[#d9b46c]">
            {warning.message}
          </p>
        ))}
      </div>
    </>
  );
}

function NotesPyramid({ details }: { details: FragranceDetails }) {
  const tiers = [
    { label: "Head", sub: "Top notes", notes: details.topNotes, width: "w-[62%]" },
    { label: "Heart", sub: "Heart notes", notes: details.heartNotes, width: "w-[81%]" },
    { label: "Shadow", sub: "Base notes", notes: details.baseNotes, width: "w-full" },
  ].filter((tier) => tier.notes.length > 0);

  return (
    <div className="space-y-2">
      {tiers.map((tier, index) => (
        <Reveal key={tier.label} delay={index * 0.08} className={`mx-auto ${tier.width}`}>
          <div className="border border-[#b59660]/20 bg-[#141216] px-5 py-4 text-center">
            <p className="text-[0.5625rem] tracking-[0.3em] text-[#b59660] uppercase">
              {tier.label} · {tier.sub}
            </p>
            <p className="font-heading mt-2 text-lg leading-snug text-[#e5d8c5] italic">
              {tier.notes.join(" · ")}
            </p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group border-b border-[#b59660]/15" open={defaultOpen}>
      <summary className="sv-summary flex min-h-14 items-center justify-between text-[0.6875rem] tracking-[0.26em] text-[#e5d8c5] uppercase">
        {title}
        <span className="sv-plus text-[#b59660]" aria-hidden="true" />
      </summary>
      <div className="pb-6 text-sm leading-relaxed text-[#a89d8e]">{children}</div>
    </details>
  );
}

function ProductInfo({
  product,
  selectedVariant,
  details,
  descriptionBlocks,
  demoMode,
}: {
  product: ProductData;
  selectedVariant: ProductVariant | null;
  details: FragranceDetails;
  descriptionBlocks: LoaderData["descriptionBlocks"];
  demoMode: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const concept = conceptForHandle(product.handle);
  const collection = product.collections.nodes[0];
  const root = useRouteLoaderData<typeof rootLoader>("root");

  return (
    <div className="flex flex-col gap-8 px-[var(--spacing-margin)] pt-10 pb-16 lg:sticky lg:top-[var(--header-height)] lg:self-start lg:px-14 lg:pt-14">
      <Breadcrumbs
        origin={root?.origin}
        crumbs={[
          { name: "House", path: "/" },
          collection
            ? { name: collection.title, path: `/collections/${collection.handle}` }
            : { name: "Shop", path: "/shop" },
          { name: product.title, path: `/products/${product.handle}` },
        ]}
      />
      <div>
        <p className="sv-kicker mb-5">
          {[concept ? `Rite ${concept.numeral}` : null, details.concentration ?? product.productType]
            .filter(Boolean)
            .join(" · ") || "SETHAVELLE"}
        </p>
        <LineReveal
          as="h1"
          immediate
          className="sv-display text-[clamp(2.75rem,1.8rem+3.2vw,5.25rem)] text-[#e5d8c5]"
          lines={[product.title]}
        />
        {details.family ? (
          <p className="font-heading mt-4 text-lg text-[#b59660] italic">{details.family}</p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 border-y border-[#b59660]/15 py-5">
        <PriceBlock product={product} selectedVariant={selectedVariant} />
        <Availability selectedVariant={selectedVariant} />
      </div>

      <div data-product-form className="space-y-6">
        <VariantOptions product={product} />
        <AddToCart
          product={product}
          quantity={quantity}
          setQuantity={setQuantity}
          selectedVariant={selectedVariant}
        />
        <p className="text-xs text-[#a89d8e]">Taxes and shipping are calculated at checkout.</p>
      </div>

      <div>
        <Disclosure title="The Composition" defaultOpen>
          {hasNotes(details) ? (
            <NotesPyramid details={details} />
          ) : demoMode ? (
            <p className="border border-dashed border-[#b59660]/30 p-4 text-xs">
              Placeholder: notes appear here once the <code>sethavelle.top_notes</code>,{" "}
              <code>heart_notes</code> and <code>base_notes</code> metafields are filled in Shopify.
            </p>
          ) : (
            <p>The full composition will be revealed at launch.</p>
          )}
        </Disclosure>
        {descriptionBlocks.length > 0 ? (
          <Disclosure title="Description">
            <RichText blocks={descriptionBlocks} />
          </Disclosure>
        ) : null}
        <Disclosure title="Shipping & Returns">
          <p>
            Delivery options, timing and costs are shown at checkout for your address. Read our full{" "}
            <Link
              to="/shipping-returns"
              className="text-[#e5d8c5] underline decoration-[#b59660]/50 underline-offset-4"
            >
              shipping and returns policy
            </Link>
            .
          </p>
        </Disclosure>
      </div>
    </div>
  );
}

function Story({ product, details }: { product: ProductData; details: FragranceDetails }) {
  const concept = conceptForHandle(product.handle);
  const paragraphs = textToParagraphs(details.story);
  if (!concept && paragraphs.length === 0) return null;

  return (
    <section
      aria-labelledby="story-heading"
      className="relative overflow-hidden border-t border-[#b59660]/10 py-28 md:py-40"
      style={
        concept
          ? {
              background: `radial-gradient(60% 60% at 50% 40%, ${concept.palette.glow}22, transparent), ${concept.palette.ground}`,
            }
          : undefined
      }
    >
      <div className="px-margin mx-auto max-w-4xl text-center">
        <p className="sv-kicker mb-6" id="story-heading">
          The Rite
        </p>
        {concept ? (
          <LineReveal
            className="font-heading text-[clamp(1.75rem,1.2rem+2.2vw,3.25rem)] leading-snug text-[#e5d8c5] italic"
            lines={[`“${concept.epigraph}”`]}
          />
        ) : null}
        {paragraphs.length > 0 ? (
          <div className="sv-lede mx-auto mt-10 max-w-2xl space-y-6 text-left md:text-center">
            {paragraphs.map((paragraph, index) => (
              <Reveal key={index} as="p" delay={index * 0.06}>
                {paragraph}
              </Reveal>
            ))}
          </div>
        ) : null}
        <Sigil className="mx-auto mt-16 h-20 w-auto text-[#b59660]/50" />
      </div>
    </section>
  );
}

function RelatedProducts({ products }: { products: LoaderData["relatedProducts"] }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="max-w-page px-margin mx-auto w-full py-24">
      <div className="mb-12 flex items-end justify-between border-t border-[#b59660]/15 pt-12">
        <h2 id="related-heading" className="font-heading text-3xl text-[#e5d8c5] md:text-5xl">
          Kindred <span className="sv-italic text-[#b59660]">rites</span>
        </h2>
      </div>
      <ul role="list" className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-8 lg:grid-cols-4">
        {products.map((product, index) => (
          <Reveal as="li" key={product.id} delay={index * 0.06}>
            <ProductCard product={product} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

function ProductPageContent({ loaderData }: { loaderData: LoaderData }) {
  const { product, details, descriptionBlocks, demoMode } = loaderData;
  const { selectedVariant } = useProductForm();

  return (
    <>
      <section className="grid lg:grid-cols-[1.15fr_1fr]">
        <ProductGallery product={product} selectedVariant={selectedVariant} />
        <ProductInfo
          product={product}
          selectedVariant={selectedVariant}
          details={details}
          descriptionBlocks={descriptionBlocks}
          demoMode={demoMode}
        />
      </section>
      <Story product={product} details={details} />
    </>
  );
}

export default function ProductRoute({ loaderData }: Route.ComponentProps) {
  const { product, relatedProducts, details, canonical } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <ProductProvider
      product={product}
      onSelect={(result) => {
        const url = variantUrl(
          product,
          result.selectedOptions,
          result.selectedVariant?.product?.handle,
          new URLSearchParams(location.search),
        );
        void navigate(url, {
          replace: true,
          preventScrollReset: true,
          ...(result.status === "resolved" ? { defaultShouldRevalidate: false } : {}),
        });
      }}
    >
      <JsonLd data={productJsonLd(product, details, canonical)} />
      <ProductViewedTracker product={product} />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        <ProductPageContent loaderData={loaderData} />
        <RelatedProducts products={relatedProducts} />
      </main>
    </ProductProvider>
  );
}
