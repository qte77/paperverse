### Fixed

- The point cloud rendered as near-invisible 1px specks: `WebGPURenderer` ignores `gl_PointSize` (in both its WebGPU and WebGL backends), so the sprites never sized. Switched to the classic `WebGLRenderer`, which honours `gl_PointSize`; also scaled point size by `devicePixelRatio`, enlarged the sprites, and stopped the fog washing colours into the background — the cloud now renders properly in both themes. (#42)
- A browser without WebGL2 now shows a clear message instead of a stuck "Loading…" overlay. (#42)
