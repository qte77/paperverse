/** Maps a paper source to a zero-blue EyeRest data-palette CSS variable.
 *
 * Point colours reference the EyeRest `data` arc by CSS custom property
 * (never a raw hex, never a blue accent), so light/dark and variant flips
 * re-resolve every colour. The `DataVar` type makes "no blue accent"
 * compile-enforced: only the zero-blue arc roles are assignable.
 */

export type Source = "arxiv" | "biorxiv" | "medrxiv";

/** The zero-blue EyeRest categorical arc (no blue role exists by design). */
export const DATA_ARC = [
  "--data-positive",
  "--data-caution",
  "--data-negative",
  "--data-alt",
] as const;

type DataVar = (typeof DATA_ARC)[number];

export const SOURCE_VAR: Record<Source, DataVar> = {
  arxiv: "--data-caution",
  biorxiv: "--data-alt",
  medrxiv: "--data-negative",
};

/** CSS custom-property reference for a source's point colour. */
export function sourceColorVar(source: Source): string {
  return `var(${SOURCE_VAR[source]})`;
}

/**
 * Parse a `#rgb` or `#rrggbb` hex colour to RGB floats in 0..1.
 *
 * Used to turn a resolved EyeRest CSS variable into a per-vertex colour. Throws
 * on anything that is not a 3- or 6-digit hex string.
 */
export function hexToRgb01(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (match === null) {
    throw new Error(`not a hex colour: ${hex}`);
  }
  const digits = match[1];
  const full =
    digits.length === 3
      ? digits[0] + digits[0] + digits[1] + digits[1] + digits[2] + digits[2]
      : digits;
  const value = Number.parseInt(full, 16);
  return [((value >> 16) & 0xff) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255];
}
