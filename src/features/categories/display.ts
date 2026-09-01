import type { Category } from "./types";

/** URL slug from category name (API has no slug field). */
export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Optional emoji for known agronomy category slugs; unknown → null (use Package icon). */
const CATEGORY_EMOJI_BY_SLUG: Record<string, string> = {
  tractor: "🚜",
  "tractor-parts": "🚜",
  irrigation: "💧",
  sprayers: "💨",
  "sprayers-spreaders": "💨",
  harvest: "🌾",
  "harvest-equipment": "🌾",
  seeds: "🌽",
  "seeds-inputs": "🌽",
  tools: "🔧",
  "tools-workshop": "🔧",
};

export function categoryEmoji(category: Category): string | null {
  const slug = slugifyCategory(category.name);
  if (CATEGORY_EMOJI_BY_SLUG[slug]) return CATEGORY_EMOJI_BY_SLUG[slug]!;
  // Fuzzy: match if slug contains a known key
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI_BY_SLUG)) {
    if (slug.includes(key) || key.includes(slug)) return emoji;
  }
  return null;
}

export function findCategoryBySlug(
  categories: Category[],
  slug: string,
): Category | undefined {
  return categories.find((c) => slugifyCategory(c.name) === slug);
}
