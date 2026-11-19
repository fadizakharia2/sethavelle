/**
 * Fragrance facts live in Shopify metafields (namespace `sethavelle`), never in
 * code. See docs/SHOPIFY_SETUP.md for the definitions to create.
 */
export const FRAGRANCE_METAFIELD_IDENTIFIERS = [
  { namespace: "sethavelle", key: "top_notes" },
  { namespace: "sethavelle", key: "heart_notes" },
  { namespace: "sethavelle", key: "base_notes" },
  { namespace: "sethavelle", key: "story" },
  { namespace: "sethavelle", key: "concentration" },
  { namespace: "sethavelle", key: "olfactive_family" },
] as const;

export type FragranceDetails = {
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  story: string | null;
  concentration: string | null;
  family: string | null;
};

type Metafield = { key: string; value: string; type: string } | null;

function parseList(field: Metafield | undefined): string[] {
  if (!field?.value) return [];
  if (field.type.startsWith("list.")) {
    try {
      const parsed: unknown = JSON.parse(field.value);
      return Array.isArray(parsed)
        ? parsed
            .filter((item): item is string => typeof item === "string")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 24)
        : [];
    } catch {
      return [];
    }
  }
  return field.value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function parseText(field: Metafield | undefined, max = 4000): string | null {
  const value = field?.value?.trim();
  return value ? value.slice(0, max) : null;
}

export function parseFragranceMetafields(fields: readonly Metafield[] | null | undefined): FragranceDetails {
  const byKey = new Map((fields ?? []).filter(Boolean).map((field) => [field!.key, field]));
  return {
    topNotes: parseList(byKey.get("top_notes")),
    heartNotes: parseList(byKey.get("heart_notes")),
    baseNotes: parseList(byKey.get("base_notes")),
    story: parseText(byKey.get("story")),
    concentration: parseText(byKey.get("concentration"), 80),
    family: parseText(byKey.get("olfactive_family"), 80),
  };
}

export function hasNotes(details: FragranceDetails): boolean {
  return details.topNotes.length + details.heartNotes.length + details.baseNotes.length > 0;
}
