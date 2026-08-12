// Maps the color slugs stored in product_variants.color to real hex
// values for swatches. Keep this in sync with whatever color slugs
// your seed data / admin panel actually uses.
export const COLOR_MAP: Record<string, string> = {
  indigo: "#4b5566",
  black: "#131212",
  ecru: "#e7ddc9",
  sage: "#9aa484",
  "lavender-wash": "#B19BB2",
  white: "#f4f2ee",
};

export function colorToHex(slug: string): string {
  return COLOR_MAP[slug] ?? "#F2F0F1"; // falls back to brand gray if unmapped
}
