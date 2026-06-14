# Roadmap

Forward-looking index of open work. Shipped stories are recorded in
[`backlog.json`](backlog.json); how the built system works is in
[`architecture.md`](architecture.md).

## v0.1 — Pipeline + interactive UI + Pages (shipped)

STORY-001–012 complete (see [`backlog.json`](backlog.json)): canonical-CSV ingest → UMAP
layout → SQLite + FTS5 `papers.db` + Float32 `positions.bin` export → `paperverse` CLI →
Three.js + sql.js UI (scene, point cloud, hover/click, full-text search) → GitHub Pages.
Live at <https://qte77.github.io/paperverse/>.

## v0.1.1 — Theme picker (shipped)

System / Light / Dark picker with `localStorage` persistence and recolour-on-switch —
[#46](https://github.com/qte77/paperverse/issues/46) · [plan](plans/theme-picker.md).

## Next

Nothing queued — the deferred items under **Later** are the candidates.

## Later — visual & performance

- Custom favicon — [#41](https://github.com/qte77/paperverse/issues/41) ·
  [plan](plans/favicon.md)
- Visual appearance polish — [#42](https://github.com/qte77/paperverse/issues/42) ·
  [plan](plans/visual-polish.md)
- Slight 3D depth effect — [#44](https://github.com/qte77/paperverse/issues/44) ·
  [plan](plans/depth-effect.md)
- Visualization performance — [#43](https://github.com/qte77/paperverse/issues/43) ·
  [plan](plans/performance.md)

## Data

- Replace the demo sample corpus (`data/`) with the real feed when the producer
  `gha-rxiv-feed-action` (its issue #107) lands a canonical schema.
