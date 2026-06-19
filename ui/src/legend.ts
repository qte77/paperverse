/** Axis legend caption.
 *
 * Pure string helper (no DOM), so it is unit-tested directly; main.ts writes the
 * result into the `#legend .axis` span once meta.json loads. Only the year is
 * shown: the z axis maps the full date range to depth, and years stay legible
 * through the scene fog. A zero-span corpus collapses to a single repeated year.
 */
const AXIS_PREFIX = "position = category similarity · depth = date";

export function formatDateRange(dateMin: string, dateMax: string): string {
  const yearMin = dateMin.slice(0, 4);
  const yearMax = dateMax.slice(0, 4);
  return `${AXIS_PREFIX} (${yearMin} → ${yearMax})`;
}
