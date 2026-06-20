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

/** Glyph + word shown on the cycling theme toggle, keyed by preference. */
export const THEME_TOGGLE_LABEL: Record<Preference, string> = {
  system: "◐ System",
  light: "○ Light",
  dark: "● Dark",
};

/** Human mode name (no glyph) shared by the toggle's a11y strings below. */
const THEME_MODE_NAME: Record<Preference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/** Dynamic accessible name for the cycling toggle, reflecting the active mode. */
export function themeToggleAria(pref: Preference): string {
  return `Theme: ${THEME_MODE_NAME[pref]} (activate to change)`;
}

/** Terse live-region announcement for a theme change (focus stays on the button,
 * so the changed accessible name alone isn't re-read by screen readers). */
export function themeAnnouncement(pref: Preference): string {
  return `Theme: ${THEME_MODE_NAME[pref]}`;
}

const PREFERENCE_CYCLE: Preference[] = ["system", "light", "dark"];

/** The next preference when the toggle is clicked: system -> light -> dark -> system. */
export function nextPreference(pref: Preference): Preference {
  return PREFERENCE_CYCLE[(PREFERENCE_CYCLE.indexOf(pref) + 1) % PREFERENCE_CYCLE.length];
}
