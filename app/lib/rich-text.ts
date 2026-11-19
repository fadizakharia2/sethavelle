/**
 * Merchant HTML (product descriptions, Shopify policies) → plain text blocks.
 *
 * We never inject merchant HTML into the page. Instead the markup is reduced
 * to a list of headings, paragraphs and list items holding *text only*; React
 * escapes that text when it renders. Scripts, styles, attributes, links and
 * event handlers cannot survive the conversion, so there is no XSS surface to
 * sanitize.
 */
export type TextBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  copy: "©",
  reg: "®",
  trade: "™",
  eacute: "é",
  egrave: "è",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function clean(text: string): string {
  return decodeEntities(text.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function htmlToBlocks(html: string | null | undefined, maxBlocks = 400): TextBlock[] {
  if (!html) return [];
  const source = html
    // Drop dangerous/irrelevant elements with their contents.
    .replace(/<(script|style|iframe|object|embed|template|noscript|svg|math)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n");

  const blocks: TextBlock[] = [];
  const blockPattern = /<(h[1-6]|p|ul|ol|blockquote|div|section)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushParagraphs = (text: string) => {
    for (const part of text.split(/\n{1,}/)) {
      const value = clean(part);
      if (value) blocks.push({ type: "paragraph", text: value });
    }
  };

  while ((match = blockPattern.exec(source)) && blocks.length < maxBlocks) {
    pushParagraphs(source.slice(lastIndex, match.index));
    lastIndex = blockPattern.lastIndex;
    const tag = match[1]!.toLowerCase();
    const inner = match[2] ?? "";

    if (tag === "ul" || tag === "ol") {
      const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi)]
        .map((item) => clean(item[1] ?? ""))
        .filter(Boolean);
      if (items.length) blocks.push({ type: "list", ordered: tag === "ol", items });
    } else if (tag.startsWith("h")) {
      const text = clean(inner);
      if (text) blocks.push({ type: "heading", level: tag === "h1" || tag === "h2" ? 2 : 3, text });
    } else if (tag === "div" || tag === "section") {
      blocks.push(...htmlToBlocks(inner, maxBlocks - blocks.length));
    } else {
      pushParagraphs(inner);
    }
  }
  pushParagraphs(source.slice(lastIndex));
  return blocks.slice(0, maxBlocks);
}

/** Plain text → paragraphs (for metafield multi-line text). */
export function textToParagraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
