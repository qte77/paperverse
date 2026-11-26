### Changed

- `ui/`: colour tokens now come from an unedited copy of the brand kit's generated
  `eyerest.css` (kit 0.5.0, `ui/src/vendor/eyerest.css`), imported by `theme.css`, with no local colour
  overrides. A weekly `kit-check` workflow warns when the copy drifts from the kit's `main`.
