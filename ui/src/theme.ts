/** Light/dark scheme selection for the EyeRest-themed UI. */

export type Theme = "light" | "dark";

/**
 * Resolve the active theme.
 *
 * Defaults to the user's system preference (`prefers-color-scheme`); an
 * explicit override (e.g. a manual toggle) always wins over the system value.
 */
export function resolveTheme(
  systemPrefersDark: boolean,
  override: Theme | null = null,
): Theme {
  if (override !== null) {
    return override;
  }
  return systemPrefersDark ? "dark" : "light";
}

/** A user theme preference: follow the OS, or force a scheme. */
export type Preference = "system" | "light" | "dark";

/** Resolve a user preference to the active theme (`system` follows the OS). */
export function themeForPreference(pref: Preference, systemPrefersDark: boolean): Theme {
  return resolveTheme(systemPrefersDark, pref === "system" ? null : pref);
}
