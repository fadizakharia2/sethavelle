import type { ImgHTMLAttributes } from "react";

import { shopifyImageUrl, shopifySrcSet } from "~/lib/image";

type ImageData = {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

/**
 * Responsive Shopify image. Always reserves its box (width/height or an
 * aspect-ratio wrapper from the caller) so it never shifts layout.
 */
export function ShopifyImage({
  image,
  sizes,
  alt,
  priority = false,
  fallbackWidth = 800,
  ...rest
}: {
  image: ImageData;
  sizes: string;
  alt?: string;
  priority?: boolean;
  fallbackWidth?: number;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt">) {
  return (
    <img
      src={shopifyImageUrl(image.url, fallbackWidth)}
      srcSet={shopifySrcSet(image.url)}
      sizes={sizes}
      alt={alt ?? image.altText ?? ""}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      {...rest}
    />
  );
}
