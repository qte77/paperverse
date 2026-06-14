# Agent Requests

Open tasks and requests for paperverse beyond the story backlog
(`docs/backlog.json`). One request per item.

## Open

+ **Add the in-browser DB / serving options to the landscape doc.** Add an
  "In-browser serving & scaling" section to `docs/visualization-prior-art.md`
  covering the in-browser data-store options evaluated for STORY-006 —
  sql.js / `sql.js-httpvfs`, DuckDB-WASM, Parquet (+ hyparquet / arrow-js),
  Arrow IPC, IndexedDB — with their trade-offs, alongside the existing geo /
  render prior art. Today the doc only mentions sql.js / SQLite inline (as
  paperverse's own choice) and COPC; the alternatives are not in it.
+ **Revalidate all claims against first-party URLs.** The STORY-006 DB
  comparison (bundle sizes, FTS5 vs `LIKE` timings, whether DuckDB-WASM ships a
  usable FTS extension, `papers.db` size estimates) is currently model-knowledge
  only — `WebSearch` and `WebFetch` were blocked, so nothing is cited. Verify
  every claim against first-party sources (`sqlite.org`, `github.com/sql-js/sql.js`
  and `sql.js-httpvfs`, `duckdb.org` WASM docs, npm / bundlephobia for sizes) and
  cite them. Also re-validate the existing `visualization-prior-art.md` geo / viz
  links. **Blocks STORY-006, which is on hold until this is done.**
