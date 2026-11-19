/**
 * Shopify CDN image helpers. The CDN resizes on the fly with `width`, so we
 * ship responsive srcsets instead of full-size originals.
 */
const SHOPIFY_CDN = /^https:\/\/cdn\.shopify\.com\//;

export function shopifyImageUrl(url: string, width: number): string {
  if (!SHOPIFY_CDN.test(url)) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("width", String(Math.round(width)));
    return parsed.toString();
  } catch {
    return url;
  }
}

export const DEFAULT_WIDTHS = [320, 480, 640, 800, 1080, 1400, 1800] as const;

export function shopifySrcSet(url: string, widths: readonly number[] = DEFAULT_WIDTHS): string | undefined {
  if (!SHOPIFY_CDN.test(url)) return undefined;
  return widths.map((width) => `${shopifyImageUrl(url, width)} ${width}w`).join(", ");
}
