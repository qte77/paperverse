# Architecture

How paperverse is built. See [`PRD.md`](PRD.md) / [`UserStory.md`](UserStory.md) for
*what* and *why*, the [ADRs](decisions/) for *key decisions*, and
[`visualization-prior-art.md`](visualization-prior-art.md) for renderer/landscape
research.

## Principles

- **KISS / DRY / YAGNI / AHA** and **strict TDD** (behaviour tests, value-add only) —
  see [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
- **Strict pydantic** at the L1 boundary (`BaseModel` frozen + `extra="forbid"`;
  `BaseSettings` CLI). No Click, no dataclass.
- **EyeRest brand by pointer** — zero-blue; colours reference CSS tokens, never raw hex.

## Four-layer system (ADR-0001)

One-way imports `L4 → L1`:

- **L1 — backend** (`src/paperverse/`): the `Paper` model, CSV ingest, UMAP layout, the
  SQLite + positions export. Ships in the wheel.
- **L2 — CLI** (`src/paperverse/__main__.py`, the `paperverse` command): the end-to-end
  pipeline.
- **L3 — N/A**: layout is deterministic numpy; there is no runtime LLM tier.
- **L4 — UI** (`ui/`): a static Three.js + sql.js site, Vite-built → GitHub Pages. Not
  in the wheel.

Why SQLite + FTS5 in the browser (over DuckDB-WASM / Parquet) and the export data
contract: [ADR-0002](decisions/0002-in-browser-store-and-data-contract.md).

## Data flow

```text
data/<source>/**/*.csv   (Date,ISOWeek,DOI,Version,Category,Title,Authors,Abstract)
        │  ingest  (one Paper per uid, date-sorted; source inferred from dir)
        ▼
   list[Paper]  ─►  layout  (UMAP x/y on category + TF-IDF(title+abstract), seeded; z = date)
        │                       │  dict[uid -> (x, y, z)]
        ▼                       ▼
   export ─►  papers.db       (papers table + source/published indexes + ext-content FTS5)
          └►  positions.bin   (LE Float32 [x,y,z] per point; point i == papers.idx)
        │
        ▼   Vite build bundles both into the site (ADR-0001: no data branch)
   Three.js + sql.js-fts5 UI  ─►  GitHub Pages
```

## Module map

```text
src/paperverse/
  models.py              Paper (frozen pydantic) + Source enum; uid = "{source}:{id}"
  adapters/csv_loader.py one canonical CSV loader for all sources
  ingest.py              ingest(data_root) -> date-sorted, deduped list[Paper]
  layout.py              layout(papers, seed) -> dict[uid -> (x,y,z)]  (UMAP + date z)
  db.py                  build_db / build_positions / export
  __main__.py            AppSettings(BaseSettings) CLI via CliApp.run
ui/src/
  scene.ts        createScene -> SceneHandle (WebGPU + WebGL2, OrbitControls, frameSphere,
                  flyTo, setFogColor) + idle auto-rotate + distance fog
  papers.ts       parsePositions / buildColorBuffer / buildPointsCloud (perspective size) +
                  highlight helpers / nearestNeighbors / neighbour-line helpers
  colors.ts       Source -> EyeRest data-arc token; hexToRgb01
  db.ts           openPapersDb (sql.js-fts5) -> sourcesByIdx / paperByIdx / search
  interaction.ts  raycast hover/click -> tooltip (title + source·date) + detail panel +
                  onSelect (neighbour links)
  search.ts       debounced FTS5 prefix search -> highlight + camera fly-to
  main.ts         mount: fetch -> build cloud -> frame -> wire interaction + search;
                  status overlay, source legend, reset-view button
  theme.ts/.css   system theme + vendored EyeRest tokens (light/dark)
```

## Public types

| Type | Where | Role |
| --- | --- | --- |
| `Paper` | `models.py` | frozen pydantic paper; computed `uid` |
| `PapersDb` | `ui/src/db.ts` | in-browser handle: `sourcesByIdx` / `paperByIdx` / `search` |
| `SceneHandle` | `ui/src/scene.ts` | camera/controls + `add` / `frameSphere` / `flyTo` / `setFogColor` / `dispose` |

## External boundaries

- **Producer** — `gha-rxiv-feed-action` emits the canonical CSV (one schema across
  arxiv/biorxiv/medrxiv; an arXiv id rides the DOI column). Schema gated by its issue
  #107; paperverse ships a demo `data/` corpus until then.
- **sql.js-fts5 WASM** (~1.16 MB) — FTS5-enabled SQLite in the browser; the default
  sql.js bundles FTS3 only. Served from the Pages base path.
- **GitHub Pages** — the Vite build with the bundled `papers.db` / `positions.bin`
  deploys via `.github/workflows/gh-pages.yaml`.

## What's not here

- No `data` branch — artifacts are bundled at build time (ADR-0001).
- No runtime LLM tier (L3) — layout is deterministic.
- No real arXiv/bioRxiv/medRxiv feed yet — a demo corpus stands in until producer #107.
