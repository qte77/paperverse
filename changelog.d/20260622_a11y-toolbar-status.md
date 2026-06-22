### Changed

- Consolidated the five per-control `sr-only` `aria-live` toolbar status regions into a single shared `#toolbar-status` polite live region (theme/dataset/links/rotation/view announce through it). No behaviour change for sighted users; controls fire one at a time so a single polite region announces correctly.
