import { serializeJsonLd } from "~/lib/seo";

/** Escaped structured data. Never pass HTML here. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
