import { describe, expect, it } from "vitest";

import { nextPreference, resolveTheme, themeForPreference } from "../src/theme";

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

describe("themeForPreference", () => {
  it("follows the system value when the preference is 'system'", () => {
    expect(themeForPreference("system", true)).toBe("dark");
    expect(themeForPreference("system", false)).toBe("light");
  });

  it("uses the explicit preference, ignoring the system value", () => {
    expect(themeForPreference("light", true)).toBe("light");
    expect(themeForPreference("dark", false)).toBe("dark");
  });
});

describe("nextPreference", () => {
  it("cycles system -> light -> dark and wraps back to system", () => {
    expect(nextPreference("system")).toBe("light");
    expect(nextPreference("light")).toBe("dark");
    expect(nextPreference("dark")).toBe("system");
  });
});
