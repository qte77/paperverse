# Plan: Theme picker (System / Light / Dark)

> Tracking: [#46](https://github.com/qte77/paperverse/issues/46) · Status: shipped

## Context

The UI follows the OS `prefers-color-scheme` and applies the resolved theme as a
`data-theme` attribute (`ui/src/main.ts`), which drives the vendored EyeRest tokens in
`ui/src/theme.css` (light + dark already present). There is no way to override the OS
preference. This adds a System / Light / Dark picker, persists the choice, and
re-colours both the page and the point cloud on switch.

## Repo facts the plan respects

- `ui/src/theme.ts` — `resolveTheme(systemPrefersDark, override)` already returns the
  active theme with override support (override wins; `null` = follow system).
- `ui/src/main.ts` sets `document.documentElement.dataset.theme` once at startup and
  derives point colours from the resolved theme (`resolveSourceRgb` reads `--data-*`,
  plus the `dimColors` "dimmed" buffer used by search). A switch must re-resolve these,
  not just flip `data-theme`.
- `ui/src/theme.css` defines light (`:root` / `[data-theme="light"]`) and dark
  (`[data-theme="dark"]`) EyeRest tokens — values from `qte77/qte77/brand/DESIGN.md`.

## Approach

- `theme.ts`: add `Preference = "system" | "light" | "dark"` and a pure
  `themeForPreference(pref, systemPrefersDark): Theme` (delegates to `resolveTheme` —
  `system` → `override=null`, else the explicit theme).
- `index.html`: a small three-way control (top-right), EyeRest-styled via the tokens.
- Persistence: read/write the preference in `localStorage` (e.g. `paperverse-theme`).
- Apply: a small controller (in `main.ts`/`theme.ts`) that, on load and on change, sets
  `data-theme = themeForPreference(pref, mql.matches)`, then re-runs the colour pipeline
  (rebuild baseline via `resolveSourceRgb`, recompute `dimColors`, `repaint`).
- While the preference is `system`, attach a `matchMedia('(prefers-color-scheme: dark)')`
  `change` listener so the OS toggle is followed live; detach otherwise.

## TDD (value-add only)

- `themeForPreference` — `system`+dark→dark, `system`+light→light, explicit `light`/
  `dark` ignore the system value. Persistence + DOM + `matchMedia` are glue (tsc + build).

## Files

Edit: `ui/src/theme.ts`, `ui/src/main.ts`, `ui/index.html`, `ui/tests/theme.test.ts`.

## Out of scope

The EyeRest **variant** switcher (Green / BluBlock / Dusk) — separate effort; this is
scheme (light/dark) only.
