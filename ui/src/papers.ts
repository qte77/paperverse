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

/** Indices of the `k` points nearest to `index`, closest first, excluding `index`
 * itself. Proximity in the UMAP layout ≈ similarity, so these are a paper's
 * most-related neighbours. Ties break by ascending index; `k` is clamped to the
 * number of other points.
 *
 * `includeZ` (default `true`) selects the metric: full 3D distance weighs the
 * z=date axis, so neighbours are similar *and* near in time; `false` weighs only
 * the x/y topic plane, so same-topic papers link across the (time-stretched) z
 * axis regardless of year. */
export function nearestNeighbors(
  positions: Float32Array,
  index: number,
  k: number,
  includeZ = true,
): number[] {
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
    const dz = includeZ ? positions[i * 3 + 2] - oz : 0;
    ranked.push({ idx: i, d2: dx * dx + dy * dy + dz * dz });
  }
  ranked.sort((a, b) => a.d2 - b.d2 || a.idx - b.idx);
  return ranked.slice(0, k).map((e) => e.idx);
}

/** Indices in `next` not present in `prev` — the neighbours newly linked when the
 * link-weighting mode flips (topic ↔ time). Order follows `next`. Used to flash
 * just the links that changed, so the toggle is visibly doing something. */
export function changedNeighbors(prev: number[], next: number[]): number[] {
  const prevSet = new Set(prev);
  return next.filter((i) => !prevSet.has(i));
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

// Round soft-edged sprite shader. Discards fragments outside the unit circle
// and applies a smooth alpha falloff so points render as anti-aliased discs.
// Perspective size attenuation is handled manually (divide by -mv.z) because
// ShaderMaterial does not inherit PointsMaterial's sizeAttenuation. gl_PointSize
// is in FRAMEBUFFER pixels, so it is multiplied by `pixelRatio` (else points are
// ~half size on hi-dpi/retina screens); a CSS-pixel floor keeps far points
// (and large clouds) visible. Linear fog (fogNear/fogFar/fogColor) only lightly
// tints colour toward the page background for depth — kept subtle so points never
// wash out, especially on the light theme's bright background.
const _VERT = /* glsl */ `
  uniform float pointSize;
  uniform float pixelRatio;
  attribute vec3 color;
  varying vec3 vColor;
  varying float vFogDepth;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(4.0, pointSize * (300.0 / -mv.z)) * pixelRatio;
    gl_Position = projectionMatrix * mv;
    vFogDepth = -mv.z;
  }
`;
const _FRAG = /* glsl */ `
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  varying vec3 vColor;
  varying float vFogDepth;
  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float d = dot(uv, uv);
    if (d > 1.0) discard;
    // Bold disc with only a thin anti-aliased rim.
    float alpha = 1.0 - smoothstep(0.62, 1.0, d);
    // Subtle depth tint toward the background (max ~30%); points keep their colour
    // and full opacity so they stay clearly visible in both themes.
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    vec3 col = mix(vColor, fogColor, fogFactor * 0.3);
    gl_FragColor = vec4(col, alpha);
  }
`;

/** Build the Points cloud (hot render path) from positions + colour buffers. */
export function buildPointsCloud(positions: Float32Array, colors: Float32Array): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.ShaderMaterial({
    vertexShader: _VERT,
    fragmentShader: _FRAG,
    uniforms: {
      pointSize: { value: 0.1 },
      pixelRatio: { value: 1 },
      fogColor: { value: new THREE.Color(0x000000) },
      fogNear: { value: 0.1 },
      fogFar: { value: 1000 },
    },
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

/** Set the rendered point size (world units). */
export function setPointSize(points: THREE.Points, size: number): void {
  const mat = points.material as THREE.ShaderMaterial;
  mat.uniforms["pointSize"].value = size;
}

/** Set the device pixel ratio so point size is consistent across hi-dpi screens
 * (gl_PointSize is in framebuffer pixels). */
export function setPixelRatio(points: THREE.Points, ratio: number): void {
  const mat = points.material as THREE.ShaderMaterial;
  mat.uniforms["pixelRatio"].value = ratio;
}

/** Sync the cloud shader's fog uniforms so distant points fade toward the page bg. */
export function setCloudFog(
  points: THREE.Points,
  rgb: readonly [number, number, number],
  near: number,
  far: number,
): void {
  const u = (points.material as THREE.ShaderMaterial).uniforms;
  u["fogColor"].value.setRGB(rgb[0], rgb[1], rgb[2]);
  u["fogNear"].value = near;
  u["fogFar"].value = far;
}

/** A reusable line object linking a selected point to its neighbours. Holds a
 * pre-allocated buffer for up to `maxNeighbors` segments; hidden until updated. */
export function createNeighborLines(maxNeighbors: number, opacity = 0.35): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(maxNeighbors * 2 * 3), 3),
  );
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ transparent: true, opacity });
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

/** An older→newer time-axis arrow along world-z: tail at `zMin` (oldest), cone head
 * at `zMax` (newest). The arrowhead gives the depth=date dimension a direction, so
 * it reads as "the time axis, older → newer" rather than the stray bar that the
 * plain line (#80) did. Kept subtle (low opacity) so it hints rather than dominates. */
export function createDateAxis(
  x: number,
  y: number,
  zMin: number,
  zMax: number,
): THREE.ArrowHelper {
  const length = zMax - zMin;
  // Kept small (was 0.18) so the head doesn't balloon with the balanced z
  // time-stretch (#105) — it should mark the arrow's direction, not dominate it.
  const headLength = length * 0.06;
  const headWidth = headLength * 0.6;
  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(x, y, zMin),
    length,
    0xffffff,
    headLength,
    headWidth,
  );
  const lineMat = arrow.line.material as THREE.LineBasicMaterial;
  const coneMat = arrow.cone.material as THREE.MeshBasicMaterial;
  lineMat.transparent = true;
  lineMat.opacity = 0.4;
  coneMat.transparent = true;
  coneMat.opacity = 0.4;
  arrow.frustumCulled = false;
  return arrow;
}

/** Set the time-axis arrow colour (RGB 0–1) so it can track the theme. `setColor`
 * touches only the colour, so the opacity set in `createDateAxis` is preserved. */
export function setAxisColor(
  arrow: THREE.ArrowHelper,
  rgb: readonly [number, number, number],
): void {
  arrow.setColor(new THREE.Color(rgb[0], rgb[1], rgb[2]));
}
