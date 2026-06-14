import { describe, expect, it } from "vitest";

import type { Source } from "../src/colors";
import { applyHighlight, buildColorBuffer, paintPoints, parsePositions } from "../src/papers";

describe("parsePositions", () => {
  it("views the buffer as one float32 triple per point", () => {
    const buffer = new Float32Array([0, 1.5, 0.25, 2, 3, 4]).buffer;
    const positions = parsePositions(buffer);
    expect(positions).toEqual(new Float32Array([0, 1.5, 0.25, 2, 3, 4]));
    expect(positions.length / 3).toBe(2); // two points
  });

  it("accepts an empty buffer as zero points", () => {
    expect(parsePositions(new ArrayBuffer(0)).length).toBe(0);
  });

  it("rejects a buffer whose length is not a whole number of points", () => {
    expect(() => parsePositions(new ArrayBuffer(8))).toThrow(); // 8 % 12 != 0
  });
});

describe("buildColorBuffer", () => {
  const rgb: Record<Source, [number, number, number]> = {
    arxiv: [1, 0, 0],
    biorxiv: [0, 1, 0],
    medrxiv: [0, 0, 1],
  };

  it("packs each point's source colour as r,g,b in order", () => {
    const buffer = buildColorBuffer(["arxiv", "medrxiv", "biorxiv"], rgb);
    expect(buffer).toEqual(new Float32Array([1, 0, 0, 0, 0, 1, 0, 1, 0]));
  });

  it("emits three floats per point", () => {
    expect(buildColorBuffer(["arxiv", "arxiv"], rgb).length).toBe(2 * 3);
  });

  it("returns an empty buffer for no points", () => {
    expect(buildColorBuffer([], rgb).length).toBe(0);
  });
});

describe("applyHighlight", () => {
  it("writes the highlight colour at the given points and restores the rest", () => {
    const baseline = new Float32Array([1, 1, 1, 2, 2, 2, 3, 3, 3]);
    const working = new Float32Array(9);
    applyHighlight(working, baseline, [1], [9, 9, 9]);
    expect(working).toEqual(new Float32Array([1, 1, 1, 9, 9, 9, 3, 3, 3]));
  });

  it("restores fully when nothing is highlighted", () => {
    const baseline = new Float32Array([1, 2, 3, 4, 5, 6]);
    const working = new Float32Array([0, 0, 0, 0, 0, 0]);
    applyHighlight(working, baseline, [], [9, 9, 9]);
    expect(working).toEqual(baseline);
  });

  it("is idempotent across repeated calls (resets from baseline each time)", () => {
    const baseline = new Float32Array([1, 1, 1, 2, 2, 2]);
    const working = new Float32Array(6);
    applyHighlight(working, baseline, [0], [7, 8, 9]);
    applyHighlight(working, baseline, [0], [7, 8, 9]);
    expect(working).toEqual(new Float32Array([7, 8, 9, 2, 2, 2]));
  });
});

describe("paintPoints", () => {
  it("writes rgb at the given points and leaves the rest untouched (no reset)", () => {
    const buffer = new Float32Array([1, 1, 1, 2, 2, 2, 3, 3, 3]);
    paintPoints(buffer, [2], [9, 9, 9]);
    expect(buffer).toEqual(new Float32Array([1, 1, 1, 2, 2, 2, 9, 9, 9]));
  });

  it("no-ops for empty indices", () => {
    const buffer = new Float32Array([1, 2, 3]);
    paintPoints(buffer, [], [9, 9, 9]);
    expect(buffer).toEqual(new Float32Array([1, 2, 3]));
  });
});
