/** Build the paper point cloud from the export artifacts.
 *
 * The pure helpers (parsePositions, buildColorBuffer, applyHighlight) are
 * unit-tested; the Three.js / DOM glue (resolveSourceRgb, buildPointsCloud) is
 * type-checked and build-smoked, not unit-tested — jsdom has no WebGL/CSS cascade.
 */

import * as THREE from "three";

import { hexToRgb01, SOURCE_VAR, type Source } from "./colors";

const SOURCES: Source[] = ["arxiv", "biorxiv", "medrxiv"];

/** Point size in world units; also the raycaster pick threshold (see interaction.ts). */
export const POINT_SIZE = 0.05;

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

/** Reset `working` to `baseline`, then write `rgb` at each highlighted point. */
export function applyHighlight(
  working: Float32Array,
  baseline: Float32Array,
  indices: number[],
  rgb: readonly [number, number, number],
): void {
  working.set(baseline);
  for (const idx of indices) {
    working[idx * 3] = rgb[0];
    working[idx * 3 + 1] = rgb[1];
    working[idx * 3 + 2] = rgb[2];
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
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: POINT_SIZE,
    sizeAttenuation: true,
  });
  return new THREE.Points(geometry, material);
}
