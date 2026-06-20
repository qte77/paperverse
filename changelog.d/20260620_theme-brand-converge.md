### Fixed

- The "System" theme preference now follows the OS again: `applyThemePreference` no longer writes a concrete `data-theme` for "system", so the `prefers-color-scheme` cascade is restored (it previously froze to whatever the OS was at load). (#101)

### Changed

- Converged UI theming onto the qte77 brand ui-kit: the theme storage key is now `qte77-theme` (shared across qte77.github.io project sites), a `themechange` event fires on each theme flip, the `--border` / `--text-muted` / `--primary` / `--primary-on` tokens are added (light + dark), `.sr-only` uses the modern `clip-path: inset(50%)`, and Inter is served as WOFF2 (TTF fallback). (#101)
