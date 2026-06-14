import { describe, expect, it } from "vitest";

import type { Source } from "../src/colors";
import { buildColorBuffer, parsePositions } from "../src/papers";

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
