# Plan 0001: backlog after v0.2.0 and brand-kit colours

> Created 2026-11-25. This plan holds every open item. The older plans in this folder keep
> their design notes and link here for what is still open.

## Status and handoff (read first)

**Resumed 2026-11-26.** Lanes A (D1) and B (P1a) shipped. Lane C (V2) is prepared on a local
branch and waits for qte77/qte77#242. Next: step 3 below.

- **Shipped in this arc:** #171 (robots.txt + llms.txt, #160), #186 (actions bump), #189
  (`@types/sql.js` pinned to the 1.4 runtime), #190 (this plan), #191 (vitest 5.1.1),
  #192 (reusable-workflow pins, D1), #194 (sql.js in its own chunk, P1a).
- **Next, in order:**
  1. Spawn lanes A, B and C from the [parallel lanes](#parallel-lanes) table in one message.
     Each one is a subagent with its own git worktree (Agent tool, `isolation: "worktree"`).
     Each brief names its lane row and the limits listed under the table.
  2. Main thread, one at a time: merge lane A's PR (D1), then lane B's (P1a). Bring each branch
     up to date right before its merge and pin the merge to the reviewed head commit. After
     the B deploy, run the smoke e2e once more against the live site.
  3. Hold lane C (V2) until the brand-kit PR qte77/qte77#242 has merged. Then copy the kit
     file, review the new workflow, run the gates, merge and close #183.
  4. After each merge, strike its row in this plan. Only the main thread edits this file, so
     lanes never conflict on it.
- **Review tiers:** workflow-pin bumps by bots get the deterministic pin check. Lock files and
  code get one fresh reviewer. Workflows, tokens and permissions get the strongest reviewer.
- **Owner gates:** #187 fix choice (S1), go/no-go on the rest of the load-speed work (P1b), and
  the final kit colours (qte77/qte77#242).
- **Commands:**
  - Full gate: `CI=true make validate`.
  - UI tests: `make test_js`.
  - UI build: `npm --prefix ui run build`.
  - Local serve: `make preview`.
  - README screenshots / headless browser: `make screenshots`.
- **Watch-outs:**
  - `main` requires signed commits and the CodeFactor + CodeQL checks.
  - A PR opened by a workflow with its own `GITHUB_TOKEN` gets `pull_request` runs that wait
    for approval ([GitHub docs](https://docs.github.com/en/actions/concepts/security/github_token)).
    So the required CodeQL check never reports on sync PRs (#188 is a live case).
  - Hypothesis can fail its slow-input health check on a busy machine. `CI=true` applies the
    derandomized profile.
  - Vitest stubs CSS imports as empty, `?raw` included.
  - `@types/sql.js` stays on 1.4.x to match the `sql.js-fts5` 1.4.0 runtime. Dependabot skips
    its minor and major updates.
  - Self-hosted only: no CDN or other third-party runtime request (owner, 2026-11-25).

## Parallel lanes

How the open rows run in parallel. What is open lives only in the
[remaining-work table](#remaining-work).

| Lane | Row | Branch (own worktree) | Touches only | Ends at |
| --- | --- | --- | --- | --- |
| A | D1 | the Dependabot branch of #192 | four trailing pin comments in `.github/workflows/bump-my-version.yaml`, `lint-md-links.yml`, `publish-release.yaml`, `tag-release.yaml` | pushed, CI green |
| B | P1a | `perf/lazy-sqljs` | `ui/src/main.ts`, `docs/plans/performance.md`, one `changelog.d/` fragment | PR open, gates + smoke e2e green |
| C | V2 | `feat/eyerest-kit-copy` | `ui/src/theme.css`, `ui/src/vendor/eyerest.css`, one drift-check workflow, one `changelog.d/` fragment | prepared locally; copy + PR wait for qte77/qte77#242 |

No two lanes touch the same file.

**Limits for every lane:**

- No merging; the main thread merges.
- No ruleset or settings changes.
- Run the full gate before pushing.
- Report the head SHA and the results.

**Lane steps:**

- **A:**
  1. Set all four comments to `# main 2026-11-24 (qte77/.github#77)`.
  2. Push.
- **B:**
  1. Change `main.ts:2` to `import type { PaperMeta } from "./db";`.
  2. In the background load, use `const [{ openPapersDb }, dbResponse] = await Promise.all([import("./db"), fetch(...)])`. Vite then puts `db` + `sql.js-fts5` in their own chunk, and the UX stays as it is.
  3. Build before and after, and report the entry-chunk size. Check that no new external URLs appear.
  4. Run one headless-browser smoke on the local build, desktop and mobile:

     - the cloud renders;
     - search enables;
     - a query returns results;
     - a click opens details;
     - no console errors or failed requests.
- **C:**
  1. Reduce `ui/src/theme.css` to its header, the Inter `@font-face` rules, `--font-sans`, and `@import "./vendor/eyerest.css";` first.
  2. Add one weekly + manual drift check, `contents: read`. It fetches the kit's `main` `brand/ui-kit/eyerest.css`, diffs it against the copy, and raises a warning plus a step-summary line on any difference. A failed or empty fetch fails the run.
  3. Don't add the copy itself until qte77/qte77#242 has merged.

## Decisions

- **Colours (owner, 2026-11-25):**
  - The brand kit's data arc is re-stepped so every pair clears a pairwise CIEDE2000 gate. This is qte77/qte77#242, kit 0.5.0.
  - paperverse commits an unedited copy of the kit's generated `eyerest.css`, plus one weekly diff check that warns on a hand edit or a newer kit. No local overrides.
  - No lock file, hash test or dark-parity test: the kit generates both dark blocks from one source.
  - The cross-repo work is coordinated in the estate visualization plan (row V2 there).
- **`@types/sql.js`:** pinned to the runtime (#189) rather than passing `useOldExtensionFunctions` to satisfy the 1.16 types.
- **Lazy loading (P1a):** the sql.js module moves to a dynamic import but still loads right after first paint. Loading it only on the first search would make that search wait for the ~1.2 MB WASM, with no first-paint gain.

## Source map

| Area | Where |
| --- | --- |
| Entry, theme stylesheet link | `ui/index.html:30` (`<link rel="stylesheet" href="/src/theme.css">`) |
| Type-only db import (the runtime loads in the background load) | `ui/src/main.ts:2` |
| `data-theme` set or removed on `<html>` (System removes it) | `ui/src/main.ts:90-92` |
| First paint: `positions.bin` + `meta.json` only | `ui/src/main.ts:129-134` |
| Search disabled until the db is ready | `ui/src/main.ts:392` |
| Background load: `import("./db")` + fetch `papers.db` in parallel (:488-491), `openPapersDb`, attach hover/click, results, search; enable search at :537; on error, `console.warn` only | `ui/src/main.ts:481-542` |
| sql.js runtime import + init | `ui/src/db.ts:7` (`import initSqlJs from "sql.js-fts5"`), `:39` |
| Other type-only db importers | `ui/src/interaction.ts:9`, `ui/src/results.ts:8`, `ui/src/search.ts:7` |
| `three` importers (needed for first paint, don't split) | `ui/src/scene.ts:17-18`, `ui/src/papers.ts:8`, `ui/src/interaction.ts:7` |
| Point cloud (`THREE.Points` + `ShaderMaterial`) | `ui/src/scene.ts`, `ui/src/papers.ts` |
| Source to token map, zero-blue `DataVar` type | `ui/src/colors.ts:10-25` |
| Type shim for `sql.js-fts5` | `ui/src/sql-js-fts5.d.ts` |
| Theme file parts (lane C) | `ui/src/theme.css`: header :1-4, Inter `@font-face` :10-27, `--font-sans` :31, token blocks :29-76 (light, `[data-theme="dark"]`, System dark) |
| Build config (no `manualChunks`, no dynamic imports yet) | `ui/vite.config.ts` |
| `papers.db` schema | `src/paperverse/db.py:27-48` |
| CI: UI job (typecheck + test, no build) | `.github/workflows/ui.yml:28-30` |
| CI: deploy (data generation, WASM copy, build) | `.github/workflows/gh-pages.yaml:40-54` |
| Weekly real-feed sync (opens the sync PR) | `.github/workflows/sync-real-feed.yml` |
| Required checks | CodeQL (`.github/workflows/codeql.yaml`), CodeFactor (app) |
| Headless browser (patchright in the sibling `../polyfetch-scrape` checkout) | `scripts/capture-readme.py`, `make screenshots` (`Makefile:136-144`) |
| Store and data contract, lazy-load intent | `docs/decisions/0002-in-browser-store-and-data-contract.md:38` (WASM ~1.16 MB), `:60-63` (`meta.json` sources), `:72-74` (httpvfs needs `fileLength`), `:78-82` (background load) |
| Performance notes | `docs/plans/performance.md:5-6,17-20` |
| Brand kit file | `qte77/qte77` `brand/ui-kit/eyerest.css`: header line `kit version: X (brand/ui-kit/package.json)`; blocks `:root`, `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`, `:root[data-theme="dark"]`, `data-variant` blocks, a `body` rule; adds `--link`, `--shadow-card` |
| Kit consumer contract | `qte77/qte77` `brand/ui-kit/BASELINE.md:38` (on #242) |
| Kit version | `qte77/qte77` `brand/ui-kit/package.json` (0.4.0 on main, 0.5.0 on #242). Its npm `files` leave out `eyerest.css`, so copy it from the repo. |
| Design notes per effort | [visual-polish](visual-polish.md) (#42), [performance](performance.md) (#43), [depth-effect](depth-effect.md) (#44) |

## Remaining work

| ID | Item | Gate | Done when |
| --- | --- | --- | --- |
| ~~R1~~ | ~~#185 npm bump~~ (shipped: #189 types pin, #191 vitest; #185 superseded) | | |
| ~~D1~~ | ~~#192 reusable-workflow pins + trailing comments~~ (shipped: #192) | | |
| ~~P1a~~ | ~~#43 part 1: `db` + `sql.js-fts5` through a dynamic import~~ (shipped: #194) | | |
| V2 | Kit colours: unedited copy of the kit's `eyerest.css` in `ui/src/vendor/`, `theme.css` reduced to fonts + import, weekly diff check; close #183 | owner (qte77/qte77#242 merged) | copy committed from the kit's `main`; diff check quiet on the real copy and warns on an edit; Light/Dark/System screenshots checked; #183 closed |
| S1 | #187 sync PRs: choose a fix (approve runs per PR, an App token or PAT for the sync, or CodeQL default setup) | owner | a sync PR gets every required check and merges |
| S2 | #187 add the `triage/kb-papers/` source from ai-agents-research | agent, after S1 | `arxiv-kb.jsonl` lands in `data/real/arxiv/`; `make validate` passes |
| S3 | #187 one catch-up sync of all weekly files; then close or supersede #188 | agent, after S1 | `main` holds every weekly file; the live page shows the real set |
| P1b | #43 part 2: `sql.js-httpvfs`, culling / LOD, picking index, sql.js worker | owner (go/no-go) | per-item measurement on the live build shows the gain |
| P2 | #42 adaptive point sizing (contrast is covered by the kit's gate in V2) | agent | sizing shipped with an e2e check |
| P3 | #44 z-axis tick labels | data (multi-year feed, S3) | ticks render once the real set spans several years |
| F1 | #139 semantic "near" via SPECTER2 embeddings + sqlite-vec | agent (own plan first) | plan written and approved; feature behind a flag |
| F2 | #140 citation-edge overlay | agent, after F1 | as stated in the issue |
