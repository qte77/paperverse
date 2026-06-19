# Plan: Visualization performance

> Tracking: [#43](https://github.com/qte77/paperverse/issues/43) · Status: partial
>
> Shipped: rAF-coalesced pointermove picking; `papers.db` + sql.js WASM load off the
> first-paint path (cloud renders from `positions.bin` + `meta.json`). Open: bundle
> code-split, culling / LOD, spatial-index or GPU picking, sql.js Web Worker.

## Context

Load time and interaction smoothness (scroll / zoom / rotate) toward the PRD NFRs
(100K+ points at 60fps; page load < 5s). The demo (57 rows) is fine; scale is the work.

## Scope / approach

- **Load** — *(shipped)* first paint renders from `positions.bin` + `meta.json`;
  `papers.db` + the sql.js WASM load in a background task afterwards. *(open)*
  code-split the ~805 kB bundle (dynamic `import()` for three / sql.js); defer the
  WASM until search/metadata is first used rather than eagerly in the background;
  consider `sql.js-httpvfs` HTTP-Range loading (per
  [ADR-0002](../decisions/0002-in-browser-store-and-data-contract.md)) instead of
  whole-DB-in-memory (needs the Pages `fileLength` workaround).
- **Interaction** — frustum culling / LOD + chunked, progressively-loaded positions
  (COPC-style) at 500K+; replace brute-force `intersectObject` picking with a spatial
  index or GPU picking; move sql.js to a Web Worker; coalesce resize/pointer handlers.

## Out of scope

Premature optimisation for the 57-row demo; measure on the live GPU build first.
