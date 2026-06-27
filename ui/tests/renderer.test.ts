import { describe, expect, it } from "vitest";

import { axisViewpoint, computeRenderSize, obliqueViewpoint } from "../src/renderer";

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

describe("axisViewpoint", () => {
  const center = [10, 20, 30] as const;
  const radius = 4;
  const fov = 60;
  // The same fit distance frameSphere uses, mirrored so the sphere fills the view.
  const dist = (radius * 1.4) / Math.sin((fov * Math.PI) / 360);

  it("offsets the camera along +z for the z axis, world-y up (topic plane face-on)", () => {
    const { position, up } = axisViewpoint("z", center, radius, fov);
    expect(position).toEqual([center[0], center[1], center[2] + dist]);
    expect(up).toEqual([0, 1, 0]);
  });

  it("offsets along +x for the x axis, world-y up", () => {
    const { position, up } = axisViewpoint("x", center, radius, fov);
    expect(position).toEqual([center[0] + dist, center[1], center[2]]);
    expect(up).toEqual([0, 1, 0]);
  });

  it("offsets along +y for the y axis with a top-down (-z) up-vector", () => {
    const { position, up } = axisViewpoint("y", center, radius, fov);
    expect(position).toEqual([center[0], center[1] + dist, center[2]]);
    expect(up).toEqual([0, 0, -1]);
  });

  it("places the camera farther than the sphere radius so the cloud fits", () => {
    const offset = axisViewpoint("z", center, radius, fov).position[2] - center[2];
    expect(offset).toBeGreaterThan(radius);
    expect(offset).toBeCloseTo(dist);
  });
});

describe("obliqueViewpoint", () => {
  const center = [10, 20, 30] as const;
  const radius = 4;
  const fov = 60;
  // Same fit distance as frameSphere/axisViewpoint so the cloud still fills the view.
  const dist = (radius * 1.4) / Math.sin((fov * Math.PI) / 360);

  it("places the camera at the same fit distance as the axis views", () => {
    const { position } = obliqueViewpoint(center, radius, fov);
    const dx = position[0] - center[0];
    const dy = position[1] - center[1];
    const dz = position[2] - center[2];
    expect(Math.hypot(dx, dy, dz)).toBeCloseTo(dist);
  });

  it("keeps world-y up so the oblique view is never upside-down", () => {
    expect(obliqueViewpoint(center, radius, fov).up).toEqual([0, 1, 0]);
  });

  it("offsets along all three axes — a true oblique, not an axis-aligned view", () => {
    // This is the whole point: head-on (axis-aligned) hides the z=date depth.
    const { position } = obliqueViewpoint(center, radius, fov);
    expect(position[0]).not.toBeCloseTo(center[0]);
    expect(position[1]).not.toBeCloseTo(center[1]);
    expect(position[2]).not.toBeCloseTo(center[2]);
  });

  it("honours the polar/azimuth angles (polar 0 looks straight down +y)", () => {
    const { position } = obliqueViewpoint(center, radius, fov, 0, 0);
    expect(position[0]).toBeCloseTo(center[0]);
    expect(position[1]).toBeCloseTo(center[1] + dist);
    expect(position[2]).toBeCloseTo(center[2]);
  });
});
