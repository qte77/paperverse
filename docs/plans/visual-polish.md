# Plan: Visual appearance polish

> Tracking: [#42](https://github.com/qte77/paperverse/issues/42) · Status: partial
>
> Shipped: loading/empty/error overlay, richer hover tooltip, source + axis legend,
> neighbour-link lines. Open: adaptive/per-point sizing, colour-contrast audit.

## Context

Tune the cloud's appearance for clarity and on-brand polish — point size, colour
contrast, depth, loading/empty states. Umbrella effort; split into sub-PRs.

## Scope / approach

- **Point size** — currently a constant `6px` (`ui/src/papers.ts` `PointsMaterial`,
  `sizeAttenuation: off`). Evaluate adaptive sizing and per-point emphasis (needs a size
  attribute or shader). Note: software WebGL clamps `gl_PointSize` to ~1px (GPU-less
  browsers only) — verify on a real GPU.
- **Colour** — check `--data-*` arc contrast vs `--bg` in both themes; a source legend;
  ensure search dim-and-focus + hover highlight read clearly.
- **Depth / quality** — subtle fog, round sprites, antialiasing (overlaps the 3D-effect
  effort, [#44](https://github.com/qte77/paperverse/issues/44)).
- **States** — a loading indicator while data + WASM fetch; an empty state.

## Out of scope

Large rendering rewrites (deck.gl); rendering perf is the performance effort
[#43](https://github.com/qte77/paperverse/issues/43) where they overlap.
