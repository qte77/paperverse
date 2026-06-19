### Changed

- The theme control is now a compact cycling button (`◐ System · ○ Light · ● Dark`), matching the qte77.github.io theme toggle, instead of a dropdown. (#42)

### Fixed

- A saved Dark preference no longer flashes light on load: the theme is applied before the stylesheet, and `prefers-color-scheme` now drives System mode in CSS. (#42)
