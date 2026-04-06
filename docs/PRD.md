# Product Requirements Document: Paperverse

## Project Overview

Paperverse is a 3D multi-source paper cloud visualization that renders arXiv, bioRxiv, and medRxiv papers in an interactive Three.js scene. A Python pipeline ingests CSV data from existing GitHub Actions scrapers, computes 3D positions via UMAP, and exports to SQLite. A static frontend queries the database via sql.js (WASM) and renders papers as a GPU-accelerated point cloud. Deployed to GitHub Pages with zero server infrastructure.

Inspired by paperscape.org (2D arXiv-only map).

## User Stories Reference

- US-1: See papers from multiple sources in one 3D space
- US-2: Search papers by title with instant results
- US-3: Hover/click paper points for metadata
- US-4: Papers clustered by category
- US-5: Static site deployment, no server

## Functional Requirements

### Area 1: Data Model

#### Feature 1: Unified Paper Model

Define a frozen Python dataclass representing a paper from any source. Normalize arXiv IDs (`arxiv:2301.12345`) and bioRxiv DOIs (`biorxiv:10.1101/...`) into a unified `uid` format. Include source, title, categories, published date, version, optional authors and DOI.

#### Feature 2: arXiv CSV Adapter

Parse weekly CSV files from gha-arxiv-stats-action (`Published,ISOWeek,Updated,ID,Version,Title,Categories`) into Paper objects. Handle multi-category papers (semicolon-separated). Deduplicate by (ID, version).

#### Feature 3: bioRxiv/medRxiv CSV Adapter

Parse weekly CSV files from gha-biorxiv-stats-action (`Date,ISOWeek,DOI,Version,Category,Title,Authors`) into Paper objects. Support both bioRxiv and medRxiv via source field. Deduplicate by (DOI, version).

#### Feature 4: Multi-Source Ingestion

Combine adapters via registry pattern. Ingest from multiple data directories. Deduplicate across sources. Return sorted list of Paper objects.

### Area 2: Layout and Storage

#### Feature 5: UMAP Layout Engine

Compute 3D positions from paper category vectors using UMAP. One-hot encode categories, reduce to 3 dimensions. Z-axis weighted by publication date for chronological depth. Deterministic output with fixed random seed.

#### Feature 6: SQLite Export

Write Paper objects with 3D positions to SQLite database. Schema: papers table with uid, source, title, categories (JSON), published, version, authors, doi, x, y, z, r. Create indexes on source and published. Create FTS5 virtual table on title and authors.

#### Feature 7: Pipeline CLI

Click-based CLI with subcommands: `ingest` (CSV dirs → Paper list), `layout` (Paper list → positions), `export` (Papers + positions → papers.db). Support `--sources`, `--data-dir`, `--output`, `--seed` flags.

### Area 3: Frontend Visualization

#### Feature 8: Three.js Scene Setup

Create Three.js scene with WebGPU renderer and WebGL2 fallback. Add OrbitControls for rotate/zoom/pan. Responsive canvas that fills viewport. Dark background.

#### Feature 9: Paper Points Rendering

Load papers.db via sql.js. Query positions and source into Float32Arrays. Create BufferGeometry Points with per-point color (source → hue, category → lightness). Handle 100K+ points at 60fps. (depends: Feature 6, Feature 8)

#### Feature 10: Interaction

Raycasting on Points for hover detection. Show tooltip with title on hover. On click, query full metadata from SQLite and show detail panel (title, authors, categories, source, date, link). (depends: Feature 9)

#### Feature 11: Full-Text Search

FTS5 query via sql.js on title/authors. Search input field with debounced query. Highlight matching points (change color/size). Animate camera to centroid of results. (depends: Feature 9)

### Area 4: Deployment

#### Feature 12: GitHub Pages Deployment

GitHub Actions workflow: install uv, run pipeline CLI, build Vite frontend, deploy dist/ to GitHub Pages. Trigger on push to main. (depends: Feature 7, Feature 9)

## Non-Functional Requirements

- 100K+ papers rendered at 60fps (Three.js Points with BufferGeometry)
- SQLite database < 100MB for 500K papers
- Page load < 5s on broadband (sql.js WASM ~1MB + papers.db)
- All Python pipeline code has TDD tests (pytest + Hypothesis)
- Frontend tests via Vitest
- Python 3.12+, ruff linting, strict typing

## Out of Scope

- Citation network / cross-source linking (v0.3+)
- Paper embeddings / semantic similarity (v0.4+)
- Time-lapse animation (v0.5+)
- Additional sources beyond arXiv/bioRxiv/medRxiv
- User accounts or saved views
- N-body simulation (using UMAP instead)
