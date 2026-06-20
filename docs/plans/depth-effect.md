# Plan: Slight 3D depth effect

> Tracking: [#44](https://github.com/qte77/paperverse/issues/44) · Status: partial
>
> Shipped: gentle idle auto-rotation (prefers-reduced-motion gated, #77), distance fog
> toward `--bg`, perspective size
> attenuation, neighbour-link lines, round soft-edged sprites, dated axis legend
> (real year span). Open: explicit 3D z-axis ticks (optional polish).

## Context

Give the cloud a subtle volumetric read rather than a flat scatter — small, performant,
on-brand.

## Scope / approach (cheapest first)

- Re-enable perspective **size attenuation** (`ui/src/papers.ts`) with a min size so far
  points stay visible.
- **Depth fade / fog** toward `--bg` (reuse the `dimColors` blend-toward-bg idea) for
  aerial perspective.
- Gentle **idle auto-rotation** (stop on pointer input); optional cursor parallax.
- Round, softly-shaded sprites instead of flat squares.
- Make the z-axis (publication date) legible as the depth axis — *shipped*: the
  legend shows the real year span (`date (YYYY → YYYY)`).

## Out of scope

Stereo/anaglyph; heavy post-processing. Keep 100K@60fps (see
[#43](https://github.com/qte77/paperverse/issues/43)).
