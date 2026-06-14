# ADR-0002 — In-browser store & export data contract

**Status:** Accepted (2026-06-14)

**Relates to:** [ADR-0001](0001-backend-cli-ui-separation.md), which fixed the
four-layer split and explicitly deferred this data-contract record to a follow-up
ADR. Resolves issues #26 (claim verification) and #27 (landscape doc), both
closed; alternatives catalogued in
[`../visualization-prior-art.md`](../visualization-prior-art.md).

## Context

ADR-0001 set the one-way rule — `papers.db` and the positions binary are produced
by L1/L2 and consumed by L4 — but left the *data contract* (which store, and the
on-disk export format) to a follow-up ADR. STORY-006 (export) needed it pinned.

The original rationale ("only SQLite has in-browser full-text search") was produced
from model knowledge with no citations. Verifying it against first-party sources
(issue #26) falsified one premise: **DuckDB-WASM now ships an autoloadable `fts`
extension.** The store choice was therefore reopened and DuckDB-WASM + Parquet
reconsidered before committing.

## Decision

### Store — SQLite + FTS5, queried in-browser via sql.js

Keep a single SQLite `papers.db` with an FTS5 index, over DuckDB-WASM / Parquet.
The decider is **not** "only SQLite has in-browser FTS" (both do now) but the
prebuilt-static-read-only constraint plus cost:

1. DuckDB's prebuilt FTS index does not survive reopening: building it offline and
   `ATTACH`-ing the file in a new session — exactly the browser load pattern —
   fails to resolve the index tables
   ([duckdb#13523](https://github.com/duckdb/duckdb/issues/13523), closed "not
   planned").
2. `httpfs` is unavailable in DuckDB-WASM, so there is no lazy HTTP-Range loading;
   `sql.js-httpvfs` provides exactly that for SQLite on a static host.
3. Bundle size: an FTS5-enabled sql.js (`sql.js-fts5`) is ~1.16 MB WASM vs
   DuckDB-WASM's ~34 MB smallest variant, against a < 5 s page-load NFR.
4. Zero new pipeline dependencies — Python stdlib `sqlite3` ships FTS5 — vs adding
   `duckdb` / `pyarrow`.

The UI workload is row-lookup-by-point-index plus FTS over three text columns
(OLTP), not analytics (OLAP), so DuckDB's columnar strengths are unused here.

### Export data contract (L1 → L4)

`paperverse export` writes two artifacts into the output directory:

+ **`papers.db`** (cold metadata). A `papers` table keyed by `idx INTEGER PRIMARY
  KEY` — which equals the point index in the positions binary — with `uid`
  (UNIQUE), `source`, `title`, `categories` (JSON), `published` (ISO date),
  `version`, `authors`, `abstract`, `doi`, `x`, `y`, `z`, and `r` (point radius;
  a constant for now). Indexes on `source` and `published`. An **external-content**
  FTS5 virtual table (`content='papers'`) over `title, authors, abstract` — no
  text duplication, to keep `papers.db` under the < 100 MB NFR.
+ **`positions.bin`** (hot render path). Tightly-packed **little-endian Float32**
  `[x, y, z]` per point, in `papers.idx` order: point `i` ↔ `papers.idx = i`.

Per-point **color and size are derived in the UI** (color from `source` via the
zero-blue EyeRest palette), not baked into the binary — deferred until STORY-009
proves a need (YAGNI). The PRD's "x,y,z plus color/size per point" is honored as
intent; the shipped binary is pure x,y,z.

### UI consumption — forward constraint for STORY-009

The frontend MUST use an FTS5-enabled sql.js build (`sql.js-fts5`): the default
sql.js bundles FTS3, not FTS5. Lazy loading via `sql.js-httpvfs` is optional and,
on GitHub Pages, needs an explicit `fileLength` because the CDN's gzip
transfer-encoding breaks the `Content-Length` of Range responses.

## Consequences

+ The store decision is now cited and reproducible; issues #26/#27 are closed and
  the full landscape lives in
  [`../visualization-prior-art.md`](../visualization-prior-art.md).
+ STORY-009 is constrained to `sql.js-fts5` (heavier WASM than vanilla sql.js) and
  inherits the `fileLength` caveat if it adopts httpvfs.
+ The CLI shipped as a single flat `paperverse` command — no `ingest` / `layout` /
  `export` subcommands, because no intermediate on-disk format was ever defined
  (YAGNI) — refining ADR-0001's incidental "subcommands" wording. See STORY-007.
+ Revisit only if an analytical (OLAP) workload appears, which is DuckDB's domain.

## References

+ [ADR-0001](0001-backend-cli-ui-separation.md) — four-layer separation (deferred
  this contract).
+ [SQLite FTS5](https://www.sqlite.org/fts5.html);
  [duckdb#13523](https://github.com/duckdb/duckdb/issues/13523) (prebuilt FTS index
  + `ATTACH`).
+ [`../visualization-prior-art.md`](../visualization-prior-art.md),
  [`../PRD.md`](../PRD.md).
