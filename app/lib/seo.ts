import type { MetaDescriptor } from "react-router";

import { BRAND } from "~/content/site";

/**
 * Serializes JSON-LD safely for a <script> element. JSON.stringify alone does
 * not escape `</script>` or HTML comment openers, so merchant-controlled text
 * (product titles, descriptions) could break out of the script. Escaping `<`,
 * `>`, `&` and the JS line separators closes that hole.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function absoluteUrl(origin: string, path: string): string {
  return new URL(path, origin).toString();
}

/** Canonical URL: configured site URL when set, else the request origin; no query string. */
export function canonicalUrl(
  siteUrl: string | undefined,
  requestUrl: string,
  keepParams: string[] = [],
): string {
  const current = new URL(requestUrl);
  const base = siteUrl ? new URL(siteUrl) : new URL(current.origin);
  const url = new URL(current.pathname, base);
  for (const key of keepParams) {
    const value = current.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function truncate(text: string | null | undefined, max = 158): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export function pageTitle(page?: string): string {
  return page ? `${page} — ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline}`;
}

export function buildMeta({
  title,
  description,
  canonical,
  image,
  type = "website",
  noindex = false,
}: {
  title: string;
  description?: string;
  canonical?: string;
  image?: string | null;
  type?: "website" | "product" | "article";
  noindex?: boolean;
}): MetaDescriptor[] {
  const meta: MetaDescriptor[] = [
    { title },
    { property: "og:title", content: title },
    { property: "og:type", content: type },
    { property: "og:site_name", content: BRAND.name },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
  ];
  if (description) {
    meta.push(
      { name: "description", content: description },
      { property: "og:description", content: description },
      { name: "twitter:description", content: description },
    );
  }
  if (canonical) {
    meta.push(
      { tagName: "link", rel: "canonical", href: canonical },
      { property: "og:url", content: canonical },
    );
  }
  if (image) meta.push({ property: "og:image", content: image }, { name: "twitter:image", content: image });
  if (noindex) meta.push({ name: "robots", content: "noindex, nofollow" });
  return meta;
}

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(origin: string, crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(origin, crumb.path),
    })),
  };
}

export function organizationJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: absoluteUrl(origin, "/"),
    slogan: BRAND.tagline,
  };
}
