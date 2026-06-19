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
