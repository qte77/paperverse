import { describe, expect, it, vi } from "vitest";

import { debounce, resultCentroid } from "../src/search";

describe("debounce", () => {
  it("fires once after the quiet period, with the latest args", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d("a");
    d("b");
    d("c");
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith("c");
    vi.useRealTimers();
  });

  it("resets the timer on each call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d();
    vi.advanceTimersByTime(200);
    d(); // resets the 300ms window
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled(); // 400ms total, but only 200ms since the reset
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe("resultCentroid", () => {
  const positions = new Float32Array([0, 0, 0, 2, 4, 6]); // two points

  it("averages the selected points' coordinates", () => {
    expect(resultCentroid(positions, [0, 1])).toEqual([1, 2, 3]);
  });

  it("returns the point itself for a single index", () => {
    expect(resultCentroid(positions, [1])).toEqual([2, 4, 6]);
  });

  it("throws on an empty selection", () => {
    expect(() => resultCentroid(positions, [])).toThrow();
  });
});
