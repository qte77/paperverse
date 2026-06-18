### Added

- Self-hosted Inter font and a custom favicon (the qte77 mark). (#41)
- `make preview`: node-free local serve of the built UI via `uv run python -m http.server` (PORT default 8143).
- Loading / empty / error status overlay during the data + WASM fetch.
- Subtle 3D depth: gentle idle auto-rotation and distance fog toward the page background. (#44)
- Reset-view button and perspective point sizing (near points larger, far points smaller).
- Neighbour-link lines: clicking a paper draws faint lines to its nearest neighbours in the UMAP layout. (#42, #44)
- Source + axis legend (colour key, and what the x·y / z axes encode).
- `scriv` changelog tooling. (#58)

### Changed

- Theme picker moved beside the search input.
- Richer hover tooltip: title plus a `source · date` meta line.
- Renamed `make serve_ui` to `make preview`.
