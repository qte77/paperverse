# Product Requirements Document: Paperverse

## Project Overview

Paperverse is a 3D multi-source paper cloud visualization that renders
arXiv, bioRxiv, and medRxiv papers in an interactive Three.js scene. A
Python pipeline ingests one canonical CSV schema from the unified
`gha-rxiv-feed-action` producer, computes 3D positions via UMAP, and
exports to SQLite plus a compact positions binary. A static TypeScript
frontend queries the database via sql.js (WASM) and renders papers as a
GPU-accelerated point cloud. Deployed to GitHub Pages with zero server
infrastructure.

Architecture follows the four-layer separation of
[ADR-0001](decisions/0001-backend-cli-ui-separation.md): L1 backend
`src/paperverse/` (in the wheel), L2 CLI, L3 N/A, L4 UI `ui/` (not in the
wheel); strict pydantic; EyeRest brand by pointer. Inspired by
paperscape.org (2D arXiv-only map).

## User Stories Reference

+ US-1: See papers from multiple sources in one 3D space
+ US-2: Search papers by title with instant results
+ US-3: Hover/click paper points for metadata
+ US-4: Papers clustered by category
+ US-5: Static site deployment, no server

## Functional Requirements

### Area 1: Data Model

#### Feature 1: Unified Paper Model

Define a frozen pydantic `BaseModel` (`frozen=True`, `extra="forbid"`)
representing a paper from any source. Normalize identifiers into a unified
`uid` (`arxiv:{id}`, `biorxiv:{doi}`, `medrxiv:{doi}`); keep `id`
(source-native) and `doi` distinct — an arXiv id is not a DOI. Include
source, title, categories (`list[str]`), published date, version,
authors, abstract, and an optional citation count.

#### Feature 2: Canonical CSV Adapter

Parse weekly CSV files from the unified `gha-rxiv-feed-action` producer.
All servers emit ONE canonical schema
`Date,ISOWeek,DOI,Version,Category,Title,Authors,Abstract` (arXiv conforms
via gha-rxiv-feed-action#107; its id rides in the `DOI` column). A single
canonical loader handles every source — no per-server schema branching.
Handle multi-category papers (semicolon-separated). Deduplicate by
(`uid`, version).

#### Feature 3: Multi-Source Selection

The loader tags `source` (arxiv/biorxiv/medrxiv) from its data directory
(`data/<server>/`). One loader, source-tagged records — there is no
separate per-server adapter.

#### Feature 4: Multi-Source Ingestion

Combine sources via a registry. Ingest from multiple data directories.
Deduplicate across sources by `uid`. Return a list of Paper objects
sorted by published date.

### Area 2: Layout and Storage

#### Feature 5: UMAP Layout Engine

Compute 3D positions from paper category vectors using UMAP. One-hot
encode categories, reduce to 3 dimensions. Z-axis weighted by publication
date for chronological depth. Deterministic output with a fixed random
seed.

#### Feature 6: SQLite + Positions Export (hot/cold split)

Emit two artifacts: a compact `Float32Array` positions binary (the hot
render path — `x,y,z` plus color/size per point) and a SQLite `papers.db`
(the cold metadata path). `papers.db` schema: papers table with uid,
source, title, categories (JSON), published, version, authors, abstract,
doi, x, y, z, r. Index source and published; FTS5 virtual table on title,
authors, abstract. The UI renders from the positions binary and lazily
queries `papers.db` for metadata.

> Note (STORY-006): the shipped positions binary is pure little-endian Float32
> `x,y,z`; per-point color/size is derived in the UI (color from `source`),
> deferred to STORY-009. The store choice and full export contract are recorded
> in [ADR-0002](decisions/0002-in-browser-store-and-data-contract.md).

#### Feature 7: Pipeline CLI

A pydantic `AppSettings(BaseSettings, cli_parse_args=True)` CLI (no
Click), exposed as `[project.scripts] paperverse`, with subcommands
`ingest` (CSV dirs → Paper list), `layout` (Paper list → positions),
`export` (Papers + positions → papers.db + positions binary). Support
`--sources`, `--data-dir`, `--output`, `--seed`.

> Note (STORY-007): the CLI shipped as a single flat `paperverse` command (run via
> pydantic-settings `CliApp.run`), not `ingest`/`layout`/`export` subcommands — no
> intermediate on-disk format was defined, so the end-to-end command meets every
> acceptance criterion (YAGNI). See
> [ADR-0002](decisions/0002-in-browser-store-and-data-contract.md).

### Area 3: Frontend Visualization

#### Feature 8: Three.js Scene Setup

Create a Three.js scene (TypeScript) with WebGPU renderer and WebGL2
fallback. Add OrbitControls for rotate/zoom/pan. Responsive canvas that
fills the viewport. Defaults to the user's system theme
(`prefers-color-scheme`, light/dark) with a manual toggle; EyeRest brand
tokens by pointer.

> Note (a11y #75–77): the toggle exposes its mode via a dynamic `aria-label` + an
> sr-only live region (#75) and reserves a stable width so the centered toolbar doesn't
> shift on cycle (#76); the idle auto-rotate is gated by `prefers-reduced-motion` (#77).

#### Feature 9: Paper Points Rendering

Load the positions binary into a BufferGeometry Points buffer (hot path);
open `papers.db` via sql.js for lazy metadata. Per-point color encodes
source via the ZERO-BLUE EyeRest `data`/variant palette — never a blue
accent (the brand's defining constraint). Handle 100K+ points at 60fps.
(depends: Feature 6, Feature 8)

#### Feature 10: Interaction

Raycasting on Points for hover detection. Show a tooltip with title on
hover. On click, lazily query full metadata from SQLite and show a detail
panel (title, authors, categories, source, date, link). (depends:
Feature 9)

> Note (a11y #78): a keyboard-navigable ARIA listbox over the search results mirrors the
> click path via a shared `openDetail` (Arrow/Home/End/Enter; Escape closes the panel and
> restores focus), making papers reachable without a pointer (`ui/src/results.ts`).

#### Feature 11: Full-Text Search

FTS5 query via sql.js on title/authors/abstract. Search input with
debounced query. Highlight matching points (change color/size). Animate
camera to the centroid of results. (depends: Feature 9)

> Note (a11y #78): search hits also render in the keyboard-navigable listbox described
> under Feature 10.

### Area 4: Deployment

#### Feature 12: GitHub Pages Deployment

GitHub Actions workflow: install uv, run the pipeline CLI, build the Vite
`ui/` to `dist/`, deploy to GitHub Pages. Trigger on push to main.
(depends: Feature 7, Feature 9)

## Non-Functional Requirements

+ 100K+ papers rendered at 60fps (Three.js Points with BufferGeometry)
+ SQLite database < 100MB for 500K papers (corpus is all-categories,
  time-bounded)
+ Page load < 5s on broadband (sql.js WASM ~1MB + papers.db)
+ All Python pipeline code has TDD tests (pytest + Hypothesis), Red→Green
  per behaviour
+ Frontend tests via Vitest
+ Baseline accessibility: a keyboard path to papers (results listbox + Escape),
  ARIA on controls and the legend, and `prefers-reduced-motion` honoured (#75–79)
+ Python 3.12+, strict pydantic, ruff (graduated rule set),
  `max-complexity = 10`

## Out of Scope

+ Citation network / cross-source linking (v0.3+; citation counts
  available via gha-rxiv-feed-action `INCLUDE_CITATIONS`)
+ Paper embeddings / semantic similarity (v0.4+)
+ Time-lapse animation (v0.5+)
+ Additional sources beyond arXiv/bioRxiv/medRxiv
+ User accounts or saved views
+ N-body simulation (using UMAP instead)
