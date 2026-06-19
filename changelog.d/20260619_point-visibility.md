### Fixed

- The point cloud rendered as near-invisible 1px specks: the WebGPU backend ignores `gl_PointSize`, so sprites never sized. Forced the WebGL2 backend, scaled point size by `devicePixelRatio`, enlarged the sprites, and stopped the fog washing colours into the background — the cloud now renders properly in both themes. (#42)
- A browser without WebGL2 now shows a clear message instead of a stuck "Loading…" overlay. (#42)
