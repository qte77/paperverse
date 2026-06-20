import { describe, expect, it } from "vitest";

import type { Source } from "../src/colors";
import {
  applyHighlight,
  buildColorBuffer,
  dimColors,
  nearestNeighbors,
  paintPoints,
  parsePositions,
  restorePoints,
} from "../src/papers";

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

describe("dimColors", () => {
  it("blends every colour toward the background by (1 - factor)", () => {
    expect(dimColors(new Float32Array([1, 0, 0.5]), 0.5, [0, 0, 0])).toEqual(
      new Float32Array([0.5, 0, 0.25]),
    );
    expect(dimColors(new Float32Array([0, 0, 0]), 0.5, [1, 1, 1])).toEqual(
      new Float32Array([0.5, 0.5, 0.5]),
    );
  });

  it("leaves colours unchanged at factor 1", () => {
    const c = new Float32Array([0.25, 0.5, 0.75]);
    expect(dimColors(c, 1, [1, 1, 1])).toEqual(c);
  });
});

describe("restorePoints", () => {
  it("copies baseline colours at the given points, leaving the rest", () => {
    const baseline = new Float32Array([1, 1, 1, 2, 2, 2, 3, 3, 3]);
    const working = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    restorePoints(working, baseline, [1]);
    expect(working).toEqual(new Float32Array([0, 0, 0, 2, 2, 2, 0, 0, 0]));
  });
});

describe("nearestNeighbors", () => {
  // four points on the x-axis at x = 0, 1, 2, 5
  const line = new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 5, 0, 0]);

  it("returns the k nearest point indices, closest first, excluding self", () => {
    expect(nearestNeighbors(line, 0, 2)).toEqual([1, 2]);
    expect(nearestNeighbors(line, 3, 2)).toEqual([2, 1]);
  });

  it("clamps k to the number of other points", () => {
    expect(nearestNeighbors(line, 0, 10)).toEqual([1, 2, 3]);
  });

  it("returns an empty list for k <= 0", () => {
    expect(nearestNeighbors(line, 0, 0)).toEqual([]);
  });

  it("breaks ties by ascending index (deterministic)", () => {
    // points 1 and 2 are equidistant (distance 1) from point 0
    const tie = new Float32Array([0, 0, 0, 1, 0, 0, -1, 0, 0]);
    expect(nearestNeighbors(tie, 0, 1)).toEqual([1]);
    expect(nearestNeighbors(tie, 0, 2)).toEqual([1, 2]);
  });
});

describe("nearestNeighbors link weighting (includeZ)", () => {
  // z encodes date; with the time-stretch it dominates raw 3D distance. Point 1 is
  // closer in full 3D (small z gap), point 2 is closest in the x/y topic plane but
  // far along z. The includeZ flag decides which one links.
  const cloud = new Float32Array([
    0, 0, 0, // 0: origin (the selected paper)
    5, 0, 1, // 1: nearer in 3D (z-close), farther across topic
    2, 0, 6, // 2: nearest in the x/y topic plane, but far along z (a different year)
  ]);

  it("includes z by default (3D), ranking the z-near point first", () => {
    // d2: point 1 = 25 + 1 = 26; point 2 = 4 + 36 = 40 -> point 1 wins.
    expect(nearestNeighbors(cloud, 0, 1)).toEqual([1]);
  });

  it("with includeZ=false weighs only x/y, so an x/y-near point outranks a z-near one", () => {
    // d2 (z ignored): point 1 = 25; point 2 = 4 -> point 2 (topic-near) now wins,
    // i.e. same-topic papers link across the time axis.
    expect(nearestNeighbors(cloud, 0, 1, false)).toEqual([2]);
  });
});
