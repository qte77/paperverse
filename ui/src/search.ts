/** Full-text search wiring (STORY-011).
 *
 * `debounce` and `resultCentroid` are pure and unit-tested; `attachSearch` (DOM
 * input + db query + camera fly-to) is type-checked and build-smoked.
 */

import type { PapersDb } from "./db";

/** Return a debounced wrapper that runs `fn` only after `ms` of quiet. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, ms);
  };
}

/** Mean position of the selected points; throws on an empty selection. */
export function resultCentroid(
  positions: Float32Array,
  indices: number[],
): [number, number, number] {
  if (indices.length === 0) {
    throw new Error("resultCentroid: empty selection");
  }
  let x = 0;
  let y = 0;
  let z = 0;
  for (const idx of indices) {
    x += positions[idx * 3];
    y += positions[idx * 3 + 1];
    z += positions[idx * 3 + 2];
  }
  const n = indices.length;
  return [x / n, y / n, z / n];
}

/** Turn a user query into an FTS5 prefix query: each term gets a trailing `*`. */
export function toPrefixQuery(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 0)
    .map((term) => `${term}*`)
    .join(" ");
}

/** Wire the debounced search box: highlight matches and fly the camera to them. */
export function attachSearch(deps: {
  input: HTMLInputElement;
  db: PapersDb;
  positions: Float32Array;
  onResults: (indices: number[]) => void;
  flyTo: (target: readonly [number, number, number]) => void;
}): void {
  const run = (raw: string): void => {
    const query = toPrefixQuery(raw);
    const indices = query === "" ? [] : deps.db.search(query);
    deps.onResults(indices);
    if (indices.length > 0) {
      deps.flyTo(resultCentroid(deps.positions, indices));
    }
  };
  deps.input.addEventListener(
    "input",
    debounce(() => {
      run(deps.input.value);
    }, 300),
  );
}
