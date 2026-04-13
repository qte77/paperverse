# User Story: Paperverse

## Problem Statement

Paperscape.org visualizes 2M+ arXiv papers as a 2D tiled map, but it only supports arXiv, uses a dated tech stack (C/Go/CoffeeScript), and has no 3D capability. Researchers working across domains (e.g., ML + neuroscience) cannot see cross-source relationships between arXiv, bioRxiv, and medRxiv papers.

## Target Users

- Researchers exploring interdisciplinary connections across preprint servers
- Data scientists investigating publication trends and category clustering
- Science communicators visualizing the landscape of academic publishing

## Value Proposition

A modern, interactive 3D paper cloud that unifies arXiv, bioRxiv, and medRxiv into a single visualization — enabling discovery of cross-domain patterns invisible in siloed preprint servers. Zero-server static deployment via GitHub Pages.

## User Stories

- As a researcher, I want to see papers from arXiv and bioRxiv in the same 3D space so that I can discover cross-domain connections
- As a user, I want to search papers by title so that I can find and navigate to specific work
- As a user, I want to hover over a paper point to see its title and click to see full metadata so that I can explore the cloud interactively
- As a researcher, I want papers clustered by category so that I can see the structure of research fields
- As a user, I want the visualization to load from a static site so that no server setup is required

## Success Criteria

- Ingests CSV data from existing gha-arxiv-stats-action and gha-biorxiv-stats-action
- Renders 100K+ papers at 60fps in 3D (Three.js WebGPU with WebGL2 fallback)
- Full-text search via SQLite FTS5 in browser (sql.js)
- Deploys as static site to GitHub Pages via GitHub Actions
- All pipeline code has TDD tests (pytest + Hypothesis)

## Constraints

- No server — static site only (GitHub Pages)
- Data from existing GHA CSV actions, no new scrapers
- Python 3.12+ for pipeline, vanilla JS + Three.js for frontend
- SQLite as data store (not static JSON) for scalability
- Strict TDD: behavior tests, not implementation tests

## Out of Scope

- Citation network / cross-source linking (v0.3+)
- Paper embeddings / semantic similarity (v0.4+)
- Time-lapse animation (v0.5+)
- Additional sources beyond arXiv/bioRxiv/medRxiv
- User accounts or saved views
