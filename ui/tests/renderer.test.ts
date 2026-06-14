import { describe, expect, it } from "vitest";

import { computeRenderSize, detectBackend } from "../src/renderer";

describe("detectBackend", () => {
  it("uses WebGPU when the navigator exposes it", () => {
    expect(detectBackend({ gpu: {} })).toBe("webgpu");
  });

  it("falls back to WebGL2 when WebGPU is absent or empty", () => {
    expect(detectBackend({})).toBe("webgl2");
    expect(detectBackend({ gpu: undefined })).toBe("webgl2");
    expect(detectBackend({ gpu: null })).toBe("webgl2");
  });
});

describe("computeRenderSize", () => {
  it("derives the camera aspect from a non-square viewport", () => {
    expect(computeRenderSize(800, 600, 1).aspect).toBeCloseTo(4 / 3);
  });

  it("clamps the device pixel ratio to avoid over-rendering on hi-dpi", () => {
    expect(computeRenderSize(800, 600, 3, 2).pixelRatio).toBe(2);
    expect(computeRenderSize(800, 600, 0.5).pixelRatio).toBe(1);
  });

  it("guards a zero-height viewport so the aspect stays finite", () => {
    const size = computeRenderSize(800, 0, 1);
    expect(size.height).toBe(1);
    expect(Number.isFinite(size.aspect)).toBe(true);
  });

  it("floors fractional CSS dimensions to whole device-independent pixels", () => {
    const size = computeRenderSize(800.7, 600.9, 1);
    expect(size.width).toBe(800);
    expect(size.height).toBe(600);
  });
});
