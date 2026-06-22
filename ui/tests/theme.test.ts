import { describe, expect, it } from "vitest";

import {
  nextPreference,
  preferenceFromSources,
  resolveTheme,
  themeAnnouncement,
  themeForPreference,
  themeToggleAria,
} from "../src/theme";

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

describe("themeToggleAria", () => {
  it("names the active mode with the activate-to-change affordance", () => {
    expect(themeToggleAria("system")).toBe("Theme: System (activate to change)");
    expect(themeToggleAria("light")).toBe("Theme: Light (activate to change)");
    expect(themeToggleAria("dark")).toBe("Theme: Dark (activate to change)");
  });
});

describe("themeAnnouncement", () => {
  it("announces the active mode tersely for the live region", () => {
    expect(themeAnnouncement("system")).toBe("Theme: System");
    expect(themeAnnouncement("light")).toBe("Theme: Light");
    expect(themeAnnouncement("dark")).toBe("Theme: Dark");
  });
});

describe("preferenceFromSources", () => {
  it("lets the ?theme= URL param win over a conflicting stored value", () => {
    expect(preferenceFromSources("dark", "light")).toBe("dark");
    expect(preferenceFromSources("system", "dark")).toBe("system");
  });

  it("falls back to the stored value when the URL param is absent or invalid", () => {
    expect(preferenceFromSources(null, "light")).toBe("light");
    expect(preferenceFromSources("bogus", "dark")).toBe("dark");
  });

  it("defaults to 'system' when both sources are absent or invalid", () => {
    expect(preferenceFromSources(null, null)).toBe("system");
    expect(preferenceFromSources("x", "y")).toBe("system");
  });
});
