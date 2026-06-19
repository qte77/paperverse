### Added

- `meta.json` export artifact: paper count, date range, and the per-point source list (parallel to `positions.bin`). (#43, #44)

### Changed

- First paint no longer waits on the database: the point cloud renders from `positions.bin` + `meta.json`, while `papers.db` and the sql.js WASM load in the background and enable search, hover, and click once ready. (#43)
- The depth-axis legend shows the corpus's real year span (e.g. `date (2019 → 2025)`) instead of `old → new`. (#44)
