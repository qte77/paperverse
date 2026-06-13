import { describe, expect, it } from "vitest";

import { DATA_ARC, sourceColorVar, type Source } from "../src/colors";

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
