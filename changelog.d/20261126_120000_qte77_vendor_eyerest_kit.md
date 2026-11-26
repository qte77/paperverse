### Changed

- `ui/`: colour tokens now come from an unedited copy of the brand kit's generated
  `eyerest.css` (`ui/src/vendor/eyerest.css`), imported by `theme.css`, with no local colour
  overrides. A weekly `kit-check` workflow warns when the copy drifts from the kit's `main`.
