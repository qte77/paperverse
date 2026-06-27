import { describe, expect, it } from "vitest";

import { DATA_ARC, hexToRgb01, sourceColorVar, type Source } from "../src/colors";

const SOURCES: Source[] = ["arxiv", "biorxiv", "medrxiv"];

describe("sourceColorVar", () => {
  it("maps every source to a zero-blue EyeRest data-arc variable", () => {
    for (const source of SOURCES) {
      const token = sourceColorVar(source).slice("var(".length, -1);
      expect(DATA_ARC).toContain(token);
    }
  });

  it("gives each source a distinct colour so sources stay distinguishable", () => {
    const vars = SOURCES.map(sourceColorVar);
    expect(new Set(vars).size).toBe(SOURCES.length);
  });
});

describe("hexToRgb01", () => {
  it("converts #rrggbb to 0..1 floats", () => {
    const [r, g, b] = hexToRgb01("#a07410"); // EyeRest --data-caution (light)
    expect(r).toBeCloseTo(160 / 255);
    expect(g).toBeCloseTo(116 / 255);
    expect(b).toBeCloseTo(16 / 255);
  });

  it("expands the short #rgb form", () => {
    expect(hexToRgb01("#abc")).toEqual(hexToRgb01("#aabbcc"));
  });

  it("maps the bounds and is case-insensitive", () => {
    expect(hexToRgb01("#FFFFFF")).toEqual([1, 1, 1]);
    expect(hexToRgb01("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb01("#fff")).toEqual([1, 1, 1]);
  });

  it("throws on a malformed hex string", () => {
    expect(() => hexToRgb01("nope")).toThrow();
    expect(() => hexToRgb01("#12")).toThrow();
    expect(() => hexToRgb01("#1234567")).toThrow();
  });
});
