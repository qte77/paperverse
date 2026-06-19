import { describe, expect, it } from "vitest";

import { formatDateRange } from "../src/legend";

describe("formatDateRange", () => {
  it("renders the year span from ISO date endpoints", () => {
    expect(formatDateRange("2019-03-15", "2025-11-01")).toBe(
      "position = category similarity · depth = date (2019 → 2025)",
    );
  });

  it("uses only the year, dropping month and day", () => {
    expect(formatDateRange("2019-12-31", "2020-01-01")).toBe(
      "position = category similarity · depth = date (2019 → 2020)",
    );
  });

  it("collapses a zero-span (single-paper) range to one repeated year", () => {
    expect(formatDateRange("2020-05-10", "2020-05-10")).toBe(
      "position = category similarity · depth = date (2020 → 2020)",
    );
  });
});
