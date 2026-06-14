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
  // Constant screen-pixel size so points stay clearly visible at any cloud scale
  // or camera distance (the UMAP coordinate range is data-dependent).
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: 6,
    sizeAttenuation: false,
  });
  return new THREE.Points(geometry, material);
}
