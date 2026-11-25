# Plan 0001: backlog after v0.2.0 and brand-kit colours

> Created 2026-11-25. This plan holds every open item. The older plans in this folder keep
> their design notes and link here for what is still open.

## Status (read first)

- **Shipped in this arc:** #186 (actions bump), #171 (robots.txt Content-Signal + llms.txt, #160).
- **Next, in order:** the rows of the [remaining-work table](#remaining-work), top to bottom.
  Agent rows first; owner rows wait for a single owner sitting.
- **Loop:** branch per topic from `origin/main` (work in a worktree; the main checkout may be
  stale), test first on non-trivial modules, run `make validate` and `make test_js`, open a PR,
  merge once every check is green, strike the row in the same PR.
- **Owner gates:** the brand-kit colour set (V2), the sync-PR fix for #187, and the go/no-go on
  the load-speed work (#43).
- **Watch-outs:**
  - `main` requires signed commits and the CodeFactor + CodeQL checks.
  - A PR opened by a workflow with its own `GITHUB_TOKEN` gets `pull_request` runs that wait
    for approval ([GitHub docs](https://docs.github.com/en/actions/concepts/security/github_token)),
    so the required CodeQL check never reports on sync PRs (#188 is a live case).
  - Hypothesis can fail its slow-input health check on a busy machine; run the gate with
    `CI=true`, which applies the derandomized profile.
  - Vitest stubs CSS imports as empty, `?raw` included; a test that reads a stylesheet needs
    `test.css.include` in `ui/vite.config.ts`.

## Decisions

- **Colours (owner, 2026-11-25):** the brand kit's data arc is re-stepped so every pair clears a
  pairwise CIEDE2000 gate, starting from paperverse's #141 values. Each repo then commits an
  unedited copy of the kit's generated `eyerest.css`, a test that the copy is unedited, and a
  scheduled check that reports a newer kit version. No local overrides. The cross-repo work is
  coordinated in the estate visualization plan (row V2 there).
- **`@types/sql.js` (default applied, owner may override):** pin the types to the runtime
  (`sql.js-fts5` 1.4.0) rather than pass `useOldExtensionFunctions` to satisfy the 1.16 types
  (#189).

## Source map

| Area | Where |
| --- | --- |
| Theme tokens (three blocks: light, `[data-theme="dark"]`, System dark) | `ui/src/theme.css` |
| Source to token map, zero-blue `DataVar` type | `ui/src/colors.ts:10-25` |
| Legend swatches | `ui/index.html` (`var(--data-caution)`, `var(--data-alt)`) |
| sql.js runtime and type shim | `ui/package.json`, `ui/src/sql-js-fts5.d.ts`, `ui/src/db.ts:40` |
| Point cloud (`THREE.Points` + `ShaderMaterial`) | `ui/src/scene.ts`, `ui/src/papers.ts` |
| First paint (`positions.bin` + `meta.json`), deferred db + WASM | `ui/src/main.ts:130-134` |
| `papers.db` schema | `src/paperverse/db.py:27-48` |
| Weekly real-feed sync (opens the sync PR) | `.github/workflows/sync-real-feed.yml` |
| Required checks | CodeQL (`.github/workflows/codeql.yaml`), CodeFactor (app) |
| Brand kit | `qte77/qte77` `brand/ui-kit/eyerest.css`, `brand/DESIGN.md` |
| Design notes per effort | [visual-polish](visual-polish.md) (#42), [performance](performance.md) (#43), [depth-effect](depth-effect.md) (#44) |

## Remaining work

| ID | Item | Gate | Done when |
| --- | --- | --- | --- |
| R1 | #185 npm bump: merge #189 (types pin), then let Dependabot rebuild #185 with vitest only | owner (signed merge) | #189 merged; #185 merged green or superseded |
| V2 | Kit colours: replace the hand-copied values in `ui/src/theme.css` with the unedited kit copy at the version the kit PR names; keep the dark-block parity test from `fix/dark-token-parity`; close #183. Do not change values before the kit PR lands | owner (kit PR) | kit copy committed with its unedited-copy test and the parity test green; #183 closed |
| S1 | #187 sync PRs: choose a fix (approve runs per PR, an App token or PAT for the sync, or CodeQL default setup) | owner | a sync PR gets every required check and merges |
| S2 | #187 add the `triage/kb-papers/` source from ai-agents-research | agent, after S1 | `arxiv-kb.jsonl` lands in `data/real/arxiv/`; `make validate` passes |
| S3 | #187 one catch-up sync of all weekly files; then close or supersede #188 | agent, after S1 | `main` holds every weekly file; the live page shows the real set |
| P1 | #43 load speed: code-split, defer WASM until first use, `sql.js-httpvfs`, culling / LOD, picking index, sql.js worker | owner (go/no-go) | per-item measurement on the live build shows the gain |
| P2 | #42 adaptive point sizing and a colour-contrast audit (the audit folds into V2's gate) | agent | sizing shipped with an e2e check; contrast covered by the kit gate |
| P3 | #44 z-axis tick labels | data (multi-year feed, S3) | ticks render once the real set spans several years |
| F1 | #139 semantic "near" via SPECTER2 embeddings + sqlite-vec | agent (own plan first) | plan written and approved; feature behind a flag |
| F2 | #140 citation-edge overlay | agent, after F1 | as stated in the issue |
