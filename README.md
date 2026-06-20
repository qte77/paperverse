# paperverse

> Explore arXiv, bioRxiv, and medRxiv papers as one navigable 3D cloud — in your browser.

[![Validate](https://github.com/qte77/paperverse/actions/workflows/validate.yml/badge.svg)](https://github.com/qte77/paperverse/actions/workflows/validate.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

**[Open the live demo →](https://qte77.github.io/paperverse/)**

A 3D academic-paper cloud — a static GitHub Pages visualization of arXiv, bioRxiv,
and medRxiv papers. A Python pipeline ingests weekly canonical CSVs, lays the
papers out in 3D with UMAP, and exports a SQLite + FTS5 database, a Float32
positions binary, and a small `meta.json` sidecar; a Three.js + sql.js frontend
renders the cloud and searches it entirely in the browser.

## Architecture

Four layers with one-way imports (`L4 → L1`); see
[ADR-0001](docs/decisions/0001-backend-cli-ui-separation.md) and
[docs/architecture.md](docs/architecture.md) for the full picture.

- **L1 — backend** (`src/paperverse/`): the `Paper` model, CSV ingest, UMAP
  layout, and the SQLite + positions export. Ships in the wheel.
- **L2 — CLI** (`paperverse` command): the end-to-end pipeline.
- **L4 — UI** (`ui/`): a static Three.js + sql.js site, built with Vite. Not in
  the wheel.

Why SQLite + FTS5 in the browser (over DuckDB-WASM / Parquet) and the export data
contract: [ADR-0002](docs/decisions/0002-in-browser-store-and-data-contract.md).

## Install

Requires Python 3.12+ and [uv](https://docs.astral.sh/uv/).

```bash
uv sync
```

## Usage

Lay out and export a corpus to `papers.db`, `positions.bin`, and `meta.json`:

```bash
uv run paperverse --data-dir data --output dist/data
```

`--data-dir` holds one subdirectory per source, each with canonical CSVs
(`Date,ISOWeek,DOI,Version,Category,Title,Authors,Abstract`):

```text
data/
  arxiv/.../*.csv
  biorxiv/.../*.csv
  medrxiv/.../*.csv
```

| Flag | Default | Description |
| --- | --- | --- |
| `--data-dir` | `data` | Root holding one CSV subdirectory per source |
| `--output` | `dist/data` | Directory to receive `papers.db`, `positions.bin`, and `meta.json` |
| `--sources` | all | Restrict to sources; repeatable (`--sources arxiv --sources biorxiv`) |
| `--seed` | `42` | UMAP seed for reproducible layouts |

> paperverse is an internal pipeline tool, not a published library — there is no
> `pip install paperverse` or public API. Use the `paperverse` CLI (above) to run the
> pipeline, or the hosted UI to explore.

## Development

```bash
make setup      # uv sync + lychee + markdownlint-cli2
make validate   # ruff + pyright (strict) + markdownlint + pip-audit + pytest (cov >= 90%)
make test       # fast pytest (red-green-refactor loop)
make test_js    # ui/ vitest
make preview    # build the UI and serve it at http://localhost:8143
```

Run `make help` for all recipes. See [CONTRIBUTING.md](CONTRIBUTING.md) for the
principles, testing, and branch/PR workflow, and the [roadmap](docs/roadmap.md) for
what's next.

## Status

v0.1 is shipped and **live at <https://qte77.github.io/paperverse/>** — the full
pipeline (ingest → layout → export → CLI) and the interactive UI (3D point cloud,
hover/click, full-text search, theme picker, depth cues, neighbour links with a
topic/time toggle, pause + axis-snap views, source legend) deployed to GitHub Pages. What shipped and what's next:
[roadmap.md](docs/roadmap.md); how it's built: [architecture.md](docs/architecture.md).

## License

Apache-2.0 — see [LICENSE](LICENSE). Third-party components bundled in the web UI
(three.js and sql.js-fts5 under MIT, the Inter font under the SIL OFL 1.1) are
attributed in [NOTICE](NOTICE).
