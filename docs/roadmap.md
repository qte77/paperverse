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
auto-rotate + distance fog); perspective point sizing; richer hover tooltip;
neighbour-link lines on select; source + axis legend; `scriv` changelog tooling
([#58](https://github.com/qte77/paperverse/issues/58)). Partial delivery on
[#42](https://github.com/qte77/paperverse/issues/42) and
[#44](https://github.com/qte77/paperverse/issues/44).

## Next

Nothing queued — the deferred items under **Later** are the candidates.

## Later — visual & performance

- Visual appearance polish — *partial*; open: adaptive point sizing, colour-contrast
  audit — [#42](https://github.com/qte77/paperverse/issues/42) ·
  [plan](plans/visual-polish.md)
- Slight 3D depth effect — *partial*; open: round sprites, z-axis (date) label —
  [#44](https://github.com/qte77/paperverse/issues/44) · [plan](plans/depth-effect.md)
- Visualization performance — [#43](https://github.com/qte77/paperverse/issues/43) ·
  [plan](plans/performance.md)

## Data

- Replace the demo sample corpus (`data/`) with the real feed when the producer
  `gha-rxiv-feed-action` (its issue #107) lands a canonical schema.
