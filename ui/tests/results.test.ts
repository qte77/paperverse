import { describe, expect, it } from "vitest";

import { nextListIndex } from "../src/results";

describe("nextListIndex", () => {
  it("moves down and clamps at the last item", () => {
    expect(nextListIndex(0, "ArrowDown", 3)).toBe(1);
    expect(nextListIndex(2, "ArrowDown", 3)).toBe(2);
  });

  it("moves up and clamps at the first item", () => {
    expect(nextListIndex(2, "ArrowUp", 3)).toBe(1);
    expect(nextListIndex(0, "ArrowUp", 3)).toBe(0);
  });

  it("lands on the first item from an unselected state", () => {
    expect(nextListIndex(-1, "ArrowDown", 3)).toBe(0);
    expect(nextListIndex(-1, "ArrowUp", 3)).toBe(0);
  });

  it("jumps to the ends with Home and End", () => {
    expect(nextListIndex(1, "Home", 3)).toBe(0);
    expect(nextListIndex(1, "End", 3)).toBe(2);
  });

  it("leaves the index unchanged for non-navigation keys", () => {
    expect(nextListIndex(1, "Enter", 3)).toBe(1);
    expect(nextListIndex(1, "a", 3)).toBe(1);
  });

  it("returns -1 for an empty list regardless of key", () => {
    expect(nextListIndex(-1, "ArrowDown", 0)).toBe(-1);
    expect(nextListIndex(0, "End", 0)).toBe(-1);
  });
});
