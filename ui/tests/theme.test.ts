import { describe, expect, it } from "vitest";

import { resolveTheme } from "../src/theme";

describe("resolveTheme", () => {
  it("follows the system preference by default", () => {
    expect(resolveTheme(true)).toBe("dark");
    expect(resolveTheme(false)).toBe("light");
  });

  it("lets an explicit override win over the system preference", () => {
    expect(resolveTheme(true, "light")).toBe("light");
    expect(resolveTheme(false, "dark")).toBe("dark");
  });
});
