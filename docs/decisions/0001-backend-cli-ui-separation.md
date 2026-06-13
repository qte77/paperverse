# ADR-0001 — Backend / CLI / UI separation (four-layer, greenfield)

**Status:** Accepted (2026-06-13)

**Relates to:** the analyze-stock-kpi (scrape) ADR
`docs/decisions/0007-package-vs-infrastructure-boundary.md` (the
three-scope package-vs-infrastructure boundary this mirrors) and its
`0008-ui-promotion-to-ui.md` (top-level `ui/` promotion); the qte77
brand system `qte77/qte77/brand/DESIGN.md` (EyeRest). Paired with the
kit's ADR-0001 — same separation schema, intentionally identical
wording.

## Context

paperverse is a 3D academic-paper-cloud visualizer: a Python pipeline
(ingest weekly arXiv/bioRxiv/medRxiv CSVs, normalize, UMAP 3D layout,
SQLite export) plus a static Three.js + sql.js(WASM) frontend that
queries a build-time-bundled `papers.db` in-browser, deployed to
GitHub Pages.

The repo is pre-implementation — only `docs/PRD.md` and
`docs/UserStory.md` exist; no `src/paperverse/`, no CLI, no UI, no
`docs/decisions/`. This is the cleanest moment to fix the distribution
boundary before code is written, adopting the same separation schema
as scrape and the kit so the three repos share one mental model and
one ADR text.

A downstream user who runs `pip install paperverse` should get the CLI
and pipeline library and nothing else: no `ui/`, no Vite/Three.js
bundle, no GitHub Actions, no dev-loop tooling.

## Decision

The repository splits into four layers, with one direction rule.
Imports flow one way only: `L4 → L3 → L2 → L1`.

### Layer 1 — Backend / library (`src/paperverse/`)

Ships in the wheel (wheel scope = `src/paperverse/`). Pure, offline
Python: source adapters (arxiv/biorxiv/medrxiv), ingest registry, UMAP
layout, SQLite export, and the `Paper` model. Config via
`AppSettings(BaseSettings)`.

### Layer 2 — CLI (`src/paperverse/__main__.py` + `[project.scripts]`)

Ships in the wheel. `[project.scripts] paperverse` with subcommands
`ingest` / `layout` / `export`, end-to-end CSV dirs → `papers.db` and
positions binary. Argument parsing via
`AppSettings(BaseSettings, cli_parse_args=True)` — no Click.

### Layer 3 — LLM-orchestration — N/A

paperverse has no runtime LLM tier: the UMAP layout is deterministic
numpy. There is no analogue of the kit's `cc-workflow-*.js`. Dev-time
autonomous tooling (the ralph loop) is Scope-2 infrastructure, not a
product tier; see Deviation 1.

### Layer 4 — UI (`ui/`, top-level)

Static Three.js + sql.js(WASM) site, Vite-built → `dist/` → GitHub
Pages. Not shipped in the wheel — `ui/` sits outside `src/`, so the
wheel boundary (Layer 1) is unchanged.

### Rule — Direction (one-way only)

+ Layers 2/3/4 MAY import from Layer 1. The CLI and the UI build
  consume the library API and its outputs.
+ Layer 1 MUST NOT reference Layer 2/3/4 paths or artifacts. Pipeline
  code must not assume `ui/` exists, must not read `.github/`, must not
  depend on the dev-loop tooling.
+ `papers.db` (and the positions binary) is consumed only by `ui/`,
  bundled at build time. Pipeline code writes them only to
  user-controlled paths (`--output`, CWD); it never reads them back as
  a UI artifact.

### Three deviations from the scrape/kit archetype

1. `ralph/` is dev-infra (Scope 2), not the product orchestration tier.
   The ralph autonomous-dev loop builds the product; the product
   (Layers 1/2/4) MUST NOT import or depend on `ralph/`, and `ralph/`
   never ships in the wheel. Status: the submodule is removed for now
   (2026-06-13); the principle stands and governs any re-adoption.
2. No `data` branch. The UI consumes a build-time-bundled `papers.db`
   (SQLite via sql.js), not a cross-origin `data`-branch fetch. The
   one-way rule still holds — only the transport differs.
3. Weak `lib/` reuse. The renderer is Three.js + sql.js, not Chart.js;
   only the separation discipline and EyeRest brand tokens transfer
   from the scrape `ui/` scaffold, not the chart `lib/` (AHA — don't
   force the archetype onto a different renderer).

### Stack conventions (override the PRD)

+ Strict pydantic. `Paper` and payloads are pydantic `BaseModel`s
  (`frozen=True`, `extra="forbid"`); the CLI is
  `AppSettings(BaseSettings, cli_parse_args=True)`. No dataclass, no
  Click. This overrides the PRD's "Click + dataclass" for portfolio
  consistency with the kit/scrape `AGENTS.md` convention;
  pre-implementation made aligning free.
+ Brand by pointer. Apply EyeRest (`qte77/qte77/brand/DESIGN.md`,
  zero-blue / warm amber) by token reference — never copied, never raw
  hex. Encode paper source (arxiv/biorxiv/medrxiv) via the zero-blue
  EyeRest `data` / variant palette — never a blue accent (the brand's
  defining constraint). The UI defaults to the user's system theme
  (`prefers-color-scheme`), light/dark, with a manual toggle.

## Consequences

+ `pip install paperverse` users get the CLI and pipeline library only
  — no Vite/Three.js bundle, no Actions runner, no dev-loop tooling.
+ The UI (`ui/`) is a downstream consumer of pipeline outputs, deployed
  to Pages; a maintained, EyeRest-branded surface, not part of the
  wheel or public API.
+ The producer data contract (one canonical CSV schema across servers;
  arXiv id is not a DOI) is governed by the upstream producer
  `gha-rxiv-feed-action` (issue #107) and will be recorded in a
  follow-up data-contract ADR, not here.
+ Establishes `docs/decisions/`. Next: scaffold `src/paperverse/`, the
  CLI, and `ui/` against the canonical schema, test-first.

## References

+ scrape `docs/decisions/0007-package-vs-infrastructure-boundary.md`
  (and `0008-ui-promotion-to-ui.md`) — the mirrored three-scope /
  one-way model.
+ qte77 brand `qte77/qte77/brand/DESIGN.md` (EyeRest).
+ Producer schema alignment: `gha-rxiv-feed-action` issue #107.
+ [`../PRD.md`](../PRD.md), [`../UserStory.md`](../UserStory.md),
  [`../backlog.json`](../backlog.json).
