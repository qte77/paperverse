/** Pure rendering helpers: backend selection and viewport sizing.
 *
 * Kept free of any `three` import so they unit-test without a GPU/browser.
 * The imperative scene wiring (see `scene.ts`) consumes them.
 */

/** Resolved renderer sizing plus the camera aspect for a viewport. */
export interface RenderSize {
  /** Device-independent width passed to `renderer.setSize`. */
  width: number;
  /** Device-independent height passed to `renderer.setSize`. */
  height: number;
  /** Device pixel ratio, clamped to `[1, maxPixelRatio]`. */
  pixelRatio: number;
  /** `width / height`, for `camera.aspect`. */
  aspect: number;
}

/**
 * Resolve renderer size and camera aspect for a CSS viewport.
 *
 * Floors fractional CSS pixels to whole device-independent pixels, guards a
 * zero dimension (so the aspect stays finite during layout), and clamps the
 * device pixel ratio to `[1, maxPixelRatio]` to avoid over-rendering on hi-dpi
 * displays.
 */
export function computeRenderSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  maxPixelRatio = 2,
): RenderSize {
  const width = Math.max(1, Math.floor(cssWidth));
  const height = Math.max(1, Math.floor(cssHeight));
  const pixelRatio = Math.min(Math.max(devicePixelRatio, 1), maxPixelRatio);
  return { width, height, pixelRatio, aspect: width / height };
}

/** A camera placement that looks straight down one world axis at a bounding sphere. */
export interface AxisViewpoint {
  /** World-space camera position. */
  position: [number, number, number];
  /** Camera up-vector. */
  up: [number, number, number];
}

/**
 * Where to put the camera to view a bounding sphere face-on down a world axis.
 *
 * Mirrors `scene.ts` `frameSphere`'s fit distance (`radius * 1.4 / sin(fov/2)`)
 * so the sphere fills the view, but offsets along the chosen axis instead of a
 * fixed +z. The up-vector is per-axis so each snap reads naturally: looking down
 * z (topic plane) or x keeps world-y up; looking down y is top-down, so -z is up.
 * Pure (no `three`) so it unit-tests without a GPU.
 */
export function axisViewpoint(
  axis: "x" | "y" | "z",
  center: readonly [number, number, number],
  radius: number,
  fov: number,
): AxisViewpoint {
  const safeRadius = Math.max(radius, 0.01);
  const dist = (safeRadius * 1.4) / Math.sin((fov * Math.PI) / 360);
  const unit: Record<"x" | "y" | "z", [number, number, number]> = {
    x: [1, 0, 0],
    y: [0, 1, 0],
    z: [0, 0, 1],
  };
  const up: Record<"x" | "y" | "z", [number, number, number]> = {
    x: [0, 1, 0],
    y: [0, 0, -1],
    z: [0, 1, 0],
  };
  const u = unit[axis];
  return {
    position: [center[0] + u[0] * dist, center[1] + u[1] * dist, center[2] + u[2] * dist],
    up: up[axis],
  };
}
