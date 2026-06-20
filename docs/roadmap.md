# Roadmap

Forward-looking index of open work. How the built system works is in
[`architecture.md`](architecture.md).

## v0.1 — Pipeline + interactive UI + Pages (shipped)

STORY-001–012 complete: canonical-CSV ingest → UMAP
layout → SQLite + FTS5 `papers.db` + Float32 `positions.bin` export → `paperverse` CLI →
Three.js + sql.js UI (scene, point cloud, hover/click, full-text search) → GitHub Pages.
Live at <https://qte77.github.io/paperverse/>.

## v0.1.1 — Theme picker (shipped)

System / Light / Dark picker with `localStorage` persistence and recolour-on-switch —
[#46](https://github.com/qte77/paperverse/issues/46) · [plan](plans/theme-picker.md).

## v0.1.2 — Brand, serve & visual polish (shipped)

Self-hosted Inter font + custom favicon
([#41](https://github.com/qte77/paperverse/issues/41) · [plan](plans/favicon.md));
node-free `make preview` (uv + `python -m http.server`); loading / empty / error
status overlay; theme picker beside the search input; subtle 3D depth (idle
auto-rotate + distance fog); perspective point sizing; round soft-edged sprites;
richer hover tooltip; neighbour-link lines on select; source + axis legend;
rAF-coalesced hover picking; `scriv` changelog tooling
([#58](https://github.com/qte77/paperverse/issues/58)). Partial delivery on
[#42](https://github.com/qte77/paperverse/issues/42),
[#44](https://github.com/qte77/paperverse/issues/44), and
[#43](https://github.com/qte77/paperverse/issues/43).

## v0.1.3 — Faster first paint + dated legend (shipped)

`meta.json` export sidecar (count, date range, per-point sources). First paint
renders from `positions.bin` + `meta.json`, while `papers.db` and the sql.js WASM
load in the background — the cloud no longer waits on them
([#43](https://github.com/qte77/paperverse/issues/43)). The depth-axis legend now
shows the corpus's real year span instead of "old → new"
([#44](https://github.com/qte77/paperverse/issues/44)).

## v0.1.4 — UI accessibility (shipped)

Theme toggle reserves its widest-label width so the centered toolbar no longer shifts on
cycle ([#76](https://github.com/qte77/paperverse/issues/76)) and exposes its mode via a
dynamic `aria-label` + an sr-only live region
([#75](https://github.com/qte77/paperverse/issues/75)); the cloud's idle auto-rotate is
gated by `prefers-reduced-motion`
([#77](https://github.com/qte77/paperverse/issues/77)); `#legend` carries `role="img"`
with a full text alternative
([#79](https://github.com/qte77/paperverse/issues/79)); and a keyboard-navigable
search-results listbox (`ui/src/results.ts` — Arrow/Home/End/Enter, Escape restores
focus) gives the mouse-only canvas a keyboard path
([#78](https://github.com/qte77/paperverse/issues/78)).

## Next

Nothing queued — the deferred items under **Later** are the candidates.

## Later — visual & performance

- Visual appearance polish — *partial*; open: adaptive point sizing, colour-contrast
  audit — [#42](https://github.com/qte77/paperverse/issues/42) ·
  [plan](plans/visual-polish.md)
- Slight 3D depth effect — *partial*; open: explicit 3D z-axis ticks (the legend
  now shows the real year span) —
  [#44](https://github.com/qte77/paperverse/issues/44) · [plan](plans/depth-effect.md)
- Visualization performance — *partial*; shipped: `papers.db` + WASM off the
  first-paint path; open: bundle code-split, culling/LOD, sql.js worker —
  [#43](https://github.com/qte77/paperverse/issues/43) ·
  [plan](plans/performance.md)

## Data

- Replace the demo sample corpus (`data/`) with the real feed when the producer
  `gha-rxiv-feed-action` (its issue #107) lands a canonical schema.
