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

const SOURCE_VAR: Record<Source, DataVar> = {
  arxiv: "--data-caution",
  biorxiv: "--data-alt",
  medrxiv: "--data-negative",
};

/** CSS custom-property reference for a source's point colour. */
export function sourceColorVar(source: Source): string {
  return `var(${SOURCE_VAR[source]})`;
}
