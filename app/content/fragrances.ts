/**
 * The three launch concepts.
 *
 * IMPORTANT: these are creative directions, not product facts. Prices, notes,
 * concentration, size, ingredients and longevity come ONLY from Shopify
 * (product data + `sethavelle.*` metafields — see docs/SHOPIFY_SETUP.md).
 * Nothing here is shown as a fact about a formula.
 *
 * `handle` is the Shopify product handle the concept maps to. When a product
 * with that handle exists, the storefront uses Shopify's title, price, image
 * and availability; otherwise the concept renders as "Forthcoming" with no
 * price and no add-to-cart.
 */
export type FragranceConcept = {
  handle: string;
  name: string;
  numeral: string;
  register: string;
  epigraph: string;
  mood: string[];
  palette: { liquid: string; glow: string; ground: string; accent: string };
};

export const FRAGRANCE_CONCEPTS: readonly FragranceConcept[] = [
  {
    handle: "vampiric-royalty",
    name: "Vampiric Royalty",
    numeral: "I",
    register: "Feminine",
    epigraph: "A coronation held after midnight, in a hall that does not appear on any map.",
    mood: ["Seductive", "Regal", "Romantic"],
    palette: { liquid: "#6d1a28", glow: "#9c2c3d", ground: "#1a0609", accent: "#c9a46a" },
  },
  {
    handle: "darkness",
    name: "Darkness",
    numeral: "II",
    register: "Unisex",
    epigraph: "Obsidian, shadow and stone. The hour before the first lamp is lit.",
    mood: ["Mysterious", "Sophisticated", "Powerful"],
    palette: { liquid: "#1c1a20", glow: "#4a4652", ground: "#0b0b0d", accent: "#b59660" },
  },
  {
    handle: "hellhound",
    name: "Hellhound",
    numeral: "III",
    register: "Masculine",
    epigraph: "The guardian at the threshold: smoke on black stone, a crimson eye in the dark.",
    mood: ["Commanding", "Rebellious", "Intense"],
    palette: { liquid: "#3a0b0f", glow: "#a3202b", ground: "#100506", accent: "#b8865a" },
  },
] as const;

export function conceptForHandle(handle: string | null | undefined) {
  return FRAGRANCE_CONCEPTS.find((concept) => concept.handle === handle) ?? null;
}
