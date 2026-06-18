# Plan: Custom favicon

> Tracking: [#41](https://github.com/qte77/paperverse/issues/41) · Status: shipped

## Context

The site ships no favicon. Add a zero-blue, EyeRest-aligned mark of the 3D paper cloud,
as `favicon.svg` (theme-aware) with a PNG fallback, linked from `ui/index.html` and
served at the Pages base path.

## Scope / approach

- Pick one of three concepts (see the issue): point-cloud orb, depth triad, or a
  constellation "p". Author as a small SVG referencing EyeRest tokens / `currentColor`
  (never raw blue); add a PNG fallback for older clients.
- Place under `ui/public/` so Vite copies it to the site root; add `<link rel="icon">`
  (and `apple-touch-icon`) to `ui/index.html`.
- Verify it loads on the live site and is legible at 16px.

## Out of scope

Animated/interactive favicons; a full brand-mark set.
