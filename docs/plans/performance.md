# Plan: Visualization performance

> Tracking: [#43](https://github.com/qte77/paperverse/issues/43) · Status: partial
>
> Shipped: rAF-coalesced pointermove picking. Open: bundle code-split / lazy WASM,
> culling / LOD, spatial-index or GPU picking, sql.js Web Worker.

## Context

Load time and interaction smoothness (scroll / zoom / rotate) toward the PRD NFRs
(100K+ points at 60fps; page load < 5s). The demo (57 rows) is fine; scale is the work.

## Scope / approach

- **Load** — code-split the ~805 kB bundle (dynamic `import()` for three / sql.js);
  lazy-load the 1.16 MB sql.js WASM only when search/metadata is first used; preload
  `positions.bin`, defer `papers.db`. Consider `sql.js-httpvfs` HTTP-Range loading (per
  [ADR-0002](../decisions/0002-in-browser-store-and-data-contract.md)) instead of
  whole-DB-in-memory (needs the Pages `fileLength` workaround).
- **Interaction** — frustum culling / LOD + chunked, progressively-loaded positions
  (COPC-style) at 500K+; replace brute-force `intersectObject` picking with a spatial
  index or GPU picking; move sql.js to a Web Worker; coalesce resize/pointer handlers.

## Out of scope

Premature optimisation for the 57-row demo; measure on the live GPU build first.
