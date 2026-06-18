/** Build the paper point cloud from the export artifacts.
 *
 * The pure helpers (parsePositions, buildColorBuffer, applyHighlight) are
 * unit-tested; the Three.js / DOM glue (resolveSourceRgb, buildPointsCloud) is
 * type-checked and build-smoked, not unit-tested — jsdom has no WebGL/CSS cascade.
 */

import * as THREE from "three";

import { hexToRgb01, SOURCE_VAR, type Source } from "./colors";

const SOURCES: Source[] = ["arxiv", "biorxiv", "medrxiv"];

/** Default raycaster pick threshold in world units (interaction.ts); main.ts
 * scales it to the loaded cloud's radius. */
export const POINT_SIZE = 0.1;

/** View a positions binary as float32 `[x, y, z]` per point (point `i` == row `i`). */
export function parsePositions(buffer: ArrayBuffer): Float32Array {
  if (buffer.byteLength % 12 !== 0) {
    throw new Error(
      `positions binary is not a whole number of points: ${buffer.byteLength} bytes`,
    );
  }
  return new Float32Array(buffer);
}

/** Pack each point's source colour as r,g,b floats, in point order. */
export function buildColorBuffer(
  sources: Source[],
  rgb: Record<Source, readonly [number, number, number]>,
): Float32Array {
  const out = new Float32Array(sources.length * 3);
  for (let i = 0; i < sources.length; i++) {
    const [r, g, b] = rgb[sources[i]];
    out[i * 3] = r;
    out[i * 3 + 1] = g;
    out[i * 3 + 2] = b;
  }
  return out;
}

/** Write `rgb` at each point index, leaving the rest of `buffer` untouched. */
export function paintPoints(
  buffer: Float32Array,
  indices: number[],
  rgb: readonly [number, number, number],
): void {
  for (const idx of indices) {
    buffer[idx * 3] = rgb[0];
    buffer[idx * 3 + 1] = rgb[1];
    buffer[idx * 3 + 2] = rgb[2];
  }
}

/** Reset `working` to `baseline`, then paint `rgb` at the highlighted points. */
export function applyHighlight(
  working: Float32Array,
  baseline: Float32Array,
  indices: number[],
  rgb: readonly [number, number, number],
): void {
  working.set(baseline);
  paintPoints(working, indices, rgb);
}

/** Blend each colour toward `bg` by `1 - factor` (1 = unchanged, 0 = full bg). */
export function dimColors(
  colors: Float32Array,
  factor: number,
  bg: readonly [number, number, number],
): Float32Array {
  const out = new Float32Array(colors.length);
  for (let i = 0; i < colors.length; i += 3) {
    out[i] = colors[i] * factor + bg[0] * (1 - factor);
    out[i + 1] = colors[i + 1] * factor + bg[1] * (1 - factor);
    out[i + 2] = colors[i + 2] * factor + bg[2] * (1 - factor);
  }
  return out;
}

/** Copy `baseline` colours back into `working` at the given point indices. */
export function restorePoints(
  working: Float32Array,
  baseline: Float32Array,
  indices: number[],
): void {
  for (const idx of indices) {
    working[idx * 3] = baseline[idx * 3];
    working[idx * 3 + 1] = baseline[idx * 3 + 1];
    working[idx * 3 + 2] = baseline[idx * 3 + 2];
  }
}

/** Indices of the `k` points nearest to `index` (Euclidean, 3D), closest first,
 * excluding `index` itself. Proximity in the UMAP layout ≈ similarity, so these
 * are a paper's most-related neighbours. Ties break by ascending index; `k` is
 * clamped to the number of other points. */
export function nearestNeighbors(positions: Float32Array, index: number, k: number): number[] {
  if (k <= 0) return [];
  const count = positions.length / 3;
  const ox = positions[index * 3];
  const oy = positions[index * 3 + 1];
  const oz = positions[index * 3 + 2];
  const ranked: { idx: number; d2: number }[] = [];
  for (let i = 0; i < count; i++) {
    if (i === index) continue;
    const dx = positions[i * 3] - ox;
    const dy = positions[i * 3 + 1] - oy;
    const dz = positions[i * 3 + 2] - oz;
    ranked.push({ idx: i, d2: dx * dx + dy * dy + dz * dz });
  }
  ranked.sort((a, b) => a.d2 - b.d2 || a.idx - b.idx);
  return ranked.slice(0, k).map((e) => e.idx);
}

/** Resolve each source's EyeRest data-arc CSS variable to an RGB triple. */
export function resolveSourceRgb(el: Element): Record<Source, [number, number, number]> {
  const styles = getComputedStyle(el);
  const entries = SOURCES.map(
    (source) =>
      [source, hexToRgb01(styles.getPropertyValue(SOURCE_VAR[source]).trim())] as const,
  );
  return Object.fromEntries(entries) as Record<Source, [number, number, number]>;
}

/** Build the Points cloud (hot render path) from positions + colour buffers. */
export function buildPointsCloud(positions: Float32Array, colors: Float32Array): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  // Perspective size: nearer points render larger, farther ones smaller — a depth
  // cue. The world-space `size` is data-dependent, so main.ts scales it to the
  // loaded cloud via setPointSize once the bounding sphere is known.
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.1,
    sizeAttenuation: true,
  });
  return new THREE.Points(geometry, material);
}

/** Set the rendered point size (world units; pairs with sizeAttenuation). */
export function setPointSize(points: THREE.Points, size: number): void {
  (points.material as THREE.PointsMaterial).size = size;
}

/** A reusable line object linking a selected point to its neighbours. Holds a
 * pre-allocated buffer for up to `maxNeighbors` segments; hidden until updated. */
export function createNeighborLines(maxNeighbors: number): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(maxNeighbors * 2 * 3), 3),
  );
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.visible = false;
  return lines;
}

/** Point `lines` at the segments from `fromIdx` to each neighbour, then show
 * them (or hide when there are none). */
export function updateNeighborLines(
  lines: THREE.LineSegments,
  positions: Float32Array,
  fromIdx: number,
  neighborIdxs: number[],
): void {
  const attr = lines.geometry.getAttribute("position") as THREE.BufferAttribute;
  const buf = attr.array as Float32Array;
  const ox = positions[fromIdx * 3];
  const oy = positions[fromIdx * 3 + 1];
  const oz = positions[fromIdx * 3 + 2];
  let v = 0;
  for (const n of neighborIdxs) {
    buf[v++] = ox;
    buf[v++] = oy;
    buf[v++] = oz;
    buf[v++] = positions[n * 3];
    buf[v++] = positions[n * 3 + 1];
    buf[v++] = positions[n * 3 + 2];
  }
  lines.geometry.setDrawRange(0, neighborIdxs.length * 2);
  attr.needsUpdate = true;
  lines.visible = neighborIdxs.length > 0;
}

/** Set the neighbour-line colour (RGB 0–1) so it can track the theme. */
export function setLineColor(
  lines: THREE.LineSegments,
  rgb: readonly [number, number, number],
): void {
  (lines.material as THREE.LineBasicMaterial).color.setRGB(rgb[0], rgb[1], rgb[2]);
}
