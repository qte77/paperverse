# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Types of changes:

- `Added` for new features.
- `Changed` for changes in existing functionality.
- `Deprecated` for soon-to-be removed features.
- `Removed` for now removed features.
- `Fixed` for any bugfixes.
- `Security` in case of vulnerabilities.

<!-- scriv-insert-here -->

## [0.1.6] - 2026-06-21

### Added

- Self-hosted Inter font and a custom favicon (the qte77 mark). (#41)
- `make preview`: node-free local serve of the built UI via `uv run python -m http.server` (PORT default 8143).
- Loading / empty / error status overlay during the data + WASM fetch.
- Subtle 3D depth: gentle idle auto-rotation and distance fog toward the page background. (#44)
- Reset-view button and perspective point sizing (near points larger, far points smaller).
- Neighbour-link lines: clicking a paper draws faint lines to its nearest neighbours in the UMAP layout. (#42, #44)
- Source + axis legend (colour key, and what the x·y / z axes encode).
- Round soft-edged point sprites instead of flat squares. (#61)
- `scriv` changelog tooling. (#58)

- `meta.json` export artifact: paper count, date range, and the per-point source list (parallel to `positions.bin`). (#43, #44)

- `NOTICE` file attributing the third-party components bundled in the web UI (three.js and sql.js-fts5 under MIT, the Inter font under the SIL Open Font License 1.1), plus an `OFL.txt` shipped beside the vendored Inter fonts — copied verbatim from the canonical qte77 brand source (`brand/fonts/LICENSES/OFL.txt`) per its documented vendoring convention.

- Neighbour-link weighting toggle: links can weigh topic similarity (the x/y plane only, so same-topic papers connect across the time axis) or full 3D distance, via a toolbar button defaulting to Topic. The choice is persisted and re-draws the current selection live. (#106)
- Cloud-view controls: a Pause button stops and resumes the idle auto-rotation (reduced-motion-honest), and a cycling View button snaps the camera to look straight down the X, Y, or Z axis. (#108)

- A demo↔real dataset toggle in the toolbar: switch between the bundled demo corpus and the curated real AI-agent feed (seeded from the rxiv paper-eval). The build now bundles both datasets under `data/<dataset>/`; the choice persists and applies on reload. (#92)

- Hypothesis property-based tests for the pipeline's pure logic — `date_axis` and `l2_normalize_rows` (layout), `build_meta` and `build_positions` (export), and `ingest` dedup/version/date-sort — asserting invariants across empty/single/constant-date/unordered/duplicate-uid/float32 edge cases. (#83)

- Ingest now reads the curated rxiv paper-eval JSONL feed (`*.jsonl`) alongside canonical CSV, selecting the loader by file extension — the foundation for visualizing real AI-agent papers. (#92)

- Keyboard access to the point cloud: search results are now a focusable, arrow/Home/End-navigable listbox where Enter opens a paper's detail — the accessible equivalent of clicking a point in the mouse-only canvas. Escape closes the detail panel and restores focus. (#78)

- The real-paper detail panel now shows the paper-eval `summary` and `key findings` (persisted into `papers.db`); these sections stay hidden for demo papers, which have neither. (#92)

- The point-cloud scene now honors `prefers-reduced-motion`: idle auto-rotation is disabled (the cloud stays static but still draggable) and responds live to the OS setting. (#77)

- A weekly `sync-real-feed` workflow that pulls the curated AI-agent paper feed from `qte77/ai-agents-research` into `data/real/` and opens a PR; merging refreshes the deployed Real dataset (gh-pages already redeploys on `data/**`). (#92)

- The theme toggle exposes its current mode to assistive tech via a dynamic `aria-label` and announces each change through an sr-only live region. (#75)

- A subtle older → newer direction arrow along the depth (date) axis in the point cloud, so the time dimension and its direction are legible on-canvas; theme-aware and skipped for a single-date corpus. (#82)

### Changed

- Theme picker moved beside the search input.
- Richer hover tooltip: title plus a `source · date` meta line.
- Renamed `make serve_ui` to `make preview`.
- Hover picking coalesced to one raycast per frame via `requestAnimationFrame`. (#60)

- First paint no longer waits on the database: the point cloud renders from `positions.bin` + `meta.json`, while `papers.db` and the sql.js WASM load in the background and enable search, hover, and click once ready. (#43)
- The depth-axis legend shows the corpus's real year span (e.g. `date (2019 → 2025)`) instead of `old → new`. (#44)

- Slightly faster idle auto-rotation and a touch more aerial depth-fog so the 3D reads at a glance (kept subtle). (#44)

- The theme control is now a compact cycling button (`◐ System · ○ Light · ● Dark`), matching the qte77.github.io theme toggle, instead of a dropdown. (#42)

- The time (z) axis is now scaled to the x/y topic spread, so the cloud visibly stretches by date (it was a near-flat disk) and the nearest-neighbour links weigh topic and era comparably — instead of z being so small it was effectively ignored. Same-topic papers now thread up the time axis. (#99)

- The time-axis arrowhead is smaller so it no longer balloons with the balanced z time-stretch. (#108)

- Reorganized the bundled corpus into a symmetric `data/demo/<source>/` + `data/real/<source>/` layout (the demo corpus was previously at `data/<source>/`). Build, deploy, and the demo↔real toggle are unchanged. (#100)

- The 3D layout now reduces papers with UMAP's `cosine` metric (correct for the sparse TF-IDF feature vectors, where Euclidean distance concentrates) and pins numba to a single thread (`n_jobs=1` + `NUMBA_NUM_THREADS=1` in CI) so builds are reproducible. (#99)

- Real papers with a blank `authors` field now fall back to the eval's extracted `subjects` for the contributors line, so a real paper no longer opens with an empty author slot. (#92)

- Layout x/y now reflects text similarity: UMAP runs over each paper's TF-IDF (title + abstract) blended with its categories, instead of categories alone, so topically related papers cluster together. The z axis still encodes publication date. (#98)

- The weekly `sync-real-feed` workflow now auto-merges its own PR (`gh pr merge --auto --squash`), so a new curated week refreshes the deployed Real dataset on green with no manual merge step. (#92)

- Converged UI theming onto the qte77 brand ui-kit: the theme storage key is now `qte77-theme` (shared across qte77.github.io project sites), a `themechange` event fires on each theme flip, the `--border` / `--text-muted` / `--primary` / `--primary-on` tokens are added (light + dark), `.sr-only` uses the modern `clip-path: inset(50%)`, and Inter is served as WOFF2 (TTF fallback). (#101)

### Removed

- Dropped the unused `r REAL NOT NULL DEFAULT 1.0` column from the `papers` table schema — it was never inserted or read since inception (dead schema). (#107)

### Fixed

- The point cloud rendered as near-invisible 1px specks: `WebGPURenderer` ignores `gl_PointSize` (in both its WebGPU and WebGL backends), so the sprites never sized. Switched to the classic `WebGLRenderer`, which honours `gl_PointSize`; also scaled point size by `devicePixelRatio`, enlarged the sprites, and stopped the fog washing colours into the background — the cloud now renders properly in both themes. (#42)
- A browser without WebGL2 now shows a clear message instead of a stuck "Loading…" overlay. (#42)

- A saved Dark preference no longer flashes light on load: the theme is applied before the stylesheet, and `prefers-color-scheme` now drives System mode in CSS. (#42)

- The source colour key is now exposed to assistive tech: `#legend` carries `role="img"` with a complete text alternative naming each source, instead of an `aria-label` on a generic `<div>` that screen readers don't reliably announce. (#79)

- The "System" theme preference now follows the OS again: `applyThemePreference` no longer writes a concrete `data-theme` for "system", so the `prefers-color-scheme` cascade is restored (it previously froze to whatever the OS was at load). (#101)

- The centered toolbar no longer shifts sideways as the theme toggle cycles; the button now reserves its widest label's width. (#76)

### Security

- Bump `msgpack` to 1.2.1 and `pydantic-settings` to 2.14.2 to clear known advisories (GHSA-6v7p-g79w-8964, GHSA-4xgf-cpjx-pc3j).
