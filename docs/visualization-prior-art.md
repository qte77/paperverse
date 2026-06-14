---
title: Visualization Prior Art (Point Cloud & Spatial Rendering)
purpose: Reference prior art for paperverse's renderer — how the geospatial/GIS ecosystem projects data into display coordinates and renders very large point sets in the browser, mapped to paperverse's Three.js point cloud and roadmap.
created: 2026-06-13
updated: 2026-06-14
validated_links: 2026-06-14
---

**Status**: Research (informational)

## Why This Doc Exists

Paperverse renders 100K–500K papers as a GPU point cloud in Three.js (WebGPU with a WebGL2 fallback), laid out by UMAP and served as a static GitHub Pages site (see [PRD.md](PRD.md)). The geospatial / GIS ecosystem has spent two decades solving the same two core problems — projecting source data into display coordinates, and rendering very large point sets interactively in a browser — so its mature libraries are useful *prior art* for paperverse's renderer, even though paperverse has no geographic data.

This is a technique reference, not a dependency list. None of these libraries are proposed as paperverse dependencies; they are studied for the patterns they encode. Dedicated graph-layout libraries (force-directed, etc.) are deliberately out of scope here — this doc covers only the spatial/point-cloud tools surfaced in the original request.

## The Bridge: Paper Cloud ≈ Spatial Point Cloud

| Paperverse concept | Geospatial analogue | Why the analogue is useful |
| --- | --- | --- |
| UMAP 3D layout from category vectors (fixed seed) | Coordinate Reference System (CRS) projection | Both deterministically map source data into display coordinates; the discipline of separating "data space" from "display space" applies directly |
| `(x, y, z, r)` rows in SQLite | LiDAR point-cloud record (XYZ + attributes) | Same columnar shape; point-cloud formats encode level-of-detail and streaming for millions of points |
| 100K–500K points at 60 fps (Three.js `BufferGeometry`) | GPU-instanced point layers | The browser-GPU large-point-rendering problem is identical |
| Scaling past interactive GPU limits | Server-side rasterization | When point count exceeds what the GPU renders smoothly, pre-rasterize to an image |
| Static GitHub Pages, zero server | Self-contained interactive map export | Baking an interactive viz into a static artifact is an established delivery pattern |
| Citation network / similarity edges (v0.3+ roadmap) | Network / arc layers over a basemap | When edges arrive, GPU line/arc rendering is the same technique as drawing routes on a map |

## Focused Prior Art

### GPU point-cloud rendering — deck.gl (via kepler.gl)

deck.gl is the WebGL2/WebGPU GPU data-visualization framework maintained by vis.gl (OpenJS Foundation, originally Uber) for rendering large-scale datasets in the browser ([repo][deckgl], MIT). kepler.gl is built on it — its README states it is "Built on top of MapLibre GL and deck.gl" and "can render millions of points" ([kepler.gl repo][keplergl-repo], [kepler.gl docs][keplergl]).

**Relevance.** Paperverse renders directly in Three.js, so deck.gl is studied as the reference *implementation of the technique* (GPU-instanced rendering of millions of points), and kepler.gl as a full application proving it at the scale paperverse targets (the 100K+ points @ 60 fps NFR). It is the closest external benchmark for paperverse's point renderer.

### Large-point rasterization — Datashader

Datashader is a server-side rasterization pipeline from the HoloViz project ([repo][datashader], BSD-3-Clause). Its three stages — project records into spatial bins, aggregate per bin, transform aggregates into an image — let a plotting library "work with much larger datasets than it would otherwise" by sending the browser pixels instead of individual points.

**Relevance.** A fallback for when point count exceeds smooth GPU interactivity, or for a density-overview layer: rasterize the full corpus to an image and overlay only the interactive subset as live points. Datashader and GeoViews are part of the same HoloViz family (GeoViews is built on HoloViews); paperverse would use the *technique*, not the library.

### Projection & deterministic layout — pyproj / Cartopy

pyproj is the Python interface to PROJ for cartographic projections and CRS transforms ([docs][pyproj], MIT). Cartopy builds object-oriented projection definitions on top with Matplotlib integration ([docs][cartopy], BSD-3-Clause).

**Relevance.** A CRS transform is conceptually what UMAP does for paperverse — a deterministic mapping from source coordinates to display coordinates. The geospatial discipline here is worth borrowing: a fixed, documented projection; explicit axis semantics (paperverse already weights Z by publication date); and reproducibility (paperverse's fixed UMAP seed is the analogue of a pinned CRS).

### Point-cloud data model — laspy

laspy reads, writes, and modifies LAS/LAZ LiDAR point-cloud files via NumPy-based access, with optional COPC (Cloud-Optimized Point Cloud) support ([docs][laspy], BSD-3-Clause).

**Relevance.** LAS/LAZ is the mature columnar format for millions of XYZ-plus-attribute points — the same shape as paperverse's `(x, y, z, r, …)` SQLite schema. COPC in particular is prior art for the problem paperverse will hit at 500K+ points: chunked, level-of-detail, progressively loaded point access rather than one monolithic buffer.

### Static interactive delivery — Folium / kepler.gl export

Folium emits self-contained interactive Leaflet.js maps as standalone HTML ([docs][folium], MIT); kepler.gl can likewise export a standalone HTML map.

**Relevance.** This is exactly paperverse's zero-server delivery model — an interactive visualization baked into a static page served from GitHub Pages. The pattern of shipping the data and the renderer together in a self-contained artifact (paperverse uses sql.js + a WASM SQLite payload) mirrors how these tools package a map for offline/static hosting.

### Interactive geographic viz — GeoViews

GeoViews provides interactive geographic visualization of multidimensional datasets, built on HoloViews with Cartopy projections and a Bokeh backend for browser interactivity ([site][geoviews], BSD-3-Clause).

**Relevance.** A Python-to-browser interactive-viz pipeline to compare against paperverse's Python-pipeline → static-JS-frontend split — a different architecture (server/notebook-oriented vs. fully static) that clarifies the trade-offs paperverse chose.

## In-browser Serving & Scaling

The prior art above is about *rendering*; this section is about the *data* side — how 100K–500K paper records plus full-text search are served **read-only from a static host** (GitHub Pages, no server logic, but HTTP Range requests work). These are the in-browser store options evaluated for STORY-006, verified against first-party sources (issue #26). The deciding constraint is not "which engine has full-text search" — several do — but "which one serves a **prebuilt, static, read-only** FTS index in the browser within the page-load budget."

| Option | In-browser FTS | Lazy range-load (static host) | Browser payload | Verdict |
| --- | --- | --- | --- | --- |
| SQLite + `sql.js-fts5` (+ `sql.js-httpvfs`) | Yes — FTS5 ([FTS5][sqlite-fts5]) | Yes — `sql.js-httpvfs` Range VFS | ~1.16 MB WASM ([sql.js-fts5][sqljs-fts5]) | **Chosen** |
| DuckDB-WASM + Parquet | Listed, but breaks read-only (see below) | No — `httpfs` absent in WASM | ~34 MB WASM ([extensions][duckdb-wasm-ext]) | Rejected |
| Parquet + `hyparquet` / `arrow-js` | No (no built-in FTS) | Yes — columnar range reads | small JS | Positions only |
| Arrow IPC | No | Partial | small JS | Positions only |
| IndexedDB | No (no FTS engine) | n/a (local cache) | browser built-in | Cache layer |

### SQLite via sql.js — chosen

`sql.js` compiles SQLite to WebAssembly and reads the whole `.db` into memory ([sql.js][sqljs]). Two caveats matter for paperverse. First, the **default sql.js build ships FTS3, not FTS5** — the "enable FTS5 by default" request is open and was declined on bundle-size grounds ([sql.js#199][sqljs-fts5-pr]) — so the UI must pin an FTS5-enabled build (`sql.js-fts5`, ~1.16 MB WASM) or compile sql.js with `-DSQLITE_ENABLE_FTS5`. Second, to avoid downloading the entire database, `sql.js-httpvfs` adds a read-only **HTTP Range-request virtual filesystem** that fetches only the SQLite pages a query touches — explicitly designed for static hosts like GitHub Pages ([sql.js-httpvfs][sqljs-httpvfs]); on GitHub Pages it needs an explicit `fileLength` because the CDN's gzip transfer-encoding breaks the `Content-Length` of Range responses. SQLite's FTS5 supports **external-content tables** (`content=`/`content_rowid=`, so the indexed text is not duplicated), BM25 ranking with per-column weights, prefix/phrase queries, and porter/unicode61 stemming ([FTS5][sqlite-fts5]) — all queryable read-only against a prebuilt file.

### DuckDB-WASM + Parquet — evaluated, rejected

DuckDB-WASM is far more capable analytically and *does* list an `fts` extension as autoloadable in WASM ([DuckDB-Wasm extensions][duckdb-wasm-ext]), which removes the old "DuckDB can't do in-browser FTS" objection. It was nonetheless rejected for this use case for three first-party reasons. (1) **A prebuilt FTS index does not survive being reopened**: building the index offline, shipping the `.duckdb`, then `ATTACH`-ing it in a fresh session — exactly the browser load pattern — fails to resolve the index tables (`Catalog Error: Table 'terms' does not exist`), reported and **closed as "not planned"** ([duckdb#13523][duckdb-fts-attach]). (2) The native `httpfs` extension is **not available in DuckDB-WASM** ([extensions][duckdb-wasm-ext]), so there is no `sql.js-httpvfs`-style lazy load — the whole file must download ([data ingestion][duckdb-wasm-data]). (3) The smallest WASM variant is ~34 MB versus ~1.16 MB for `sql.js-fts5`, against a <5 s page-load NFR. DuckDB's columnar OLAP strengths are also unused here: the UI does single-row lookups by point index plus FTS over three text columns, not aggregations or joins.

### Parquet (hyparquet / arrow-js) and Arrow IPC — positions-binary alternatives

[hyparquet][hyparquet] (a dependency-free JS Parquet reader) and the [Apache Arrow JS][arrow-js] library read columnar data directly in the browser, and Arrow IPC offers a zero-copy columnar interchange format. None provides full-text search, so they are not candidates for the *metadata + FTS* store. They are relevant only as alternatives to the raw `Float32Array` **positions binary** (the hot render path) — useful if positions later grow extra per-point columns or need column pruning; for a fixed `[x, y, z]` triple, a tightly-packed little-endian `Float32Array` stays the simplest hot-path format.

### IndexedDB — client-side cache

[IndexedDB][indexeddb] is the browser's persistent key/value store. It has no query or FTS engine of its own, so it is not a store option here, but it is the standard place to **cache** the downloaded `papers.db` (or its pages) between visits so repeat loads skip the network. A possible later optimization, orthogonal to the engine choice.

### Decision

Paperverse keeps a SQLite `papers.db` (FTS5 over title/authors/abstract, indexes on source/published) plus a `Float32Array` positions binary, consumed in the browser by an FTS5-enabled sql.js (`sql.js-fts5`, optionally `sql.js-httpvfs` for lazy loading) — consistent with the L1→L4 data contract in [ADR-0001](decisions/0001-backend-cli-ui-separation.md). The decider is bundle size plus a *working* prebuilt-static-read-only FTS path, not FTS availability alone.

## Other Geospatial Sources (Mention)

The remaining GIS libraries from the original request are data-processing and analysis tools with little direct bearing on paperverse's renderer. Listed for completeness:

| Tool | Role | Source |
| --- | --- | --- |
| GDAL | Raster/vector format translation (the foundation under most of the stack) | [GDAL][gdal] |
| GeoPandas | pandas extended with geometry types for vector geodata | [GeoPandas][geopandas] |
| Fiona | Vector feature I/O via GDAL/OGR | [Fiona][fiona] |
| Shapely | Planar geometry operations (GEOS) | [Shapely][shapely] |
| Rasterio | Raster I/O on NumPy arrays | [Rasterio][rasterio] |
| rasterstats | Zonal statistics (raster within vector zones) | [rasterstats][rasterstats] |
| PySAL | Spatial analysis, weights, and regression | [PySAL][pysal] |
| OSMnx | Street networks from OpenStreetMap | [OSMnx][osmnx] |
| EarthPy | Raster/vector plotting helpers | [EarthPy][earthpy] |
| Satpy | Satellite / earth-observation processing | [Satpy][satpy] |
| GeoPy | Geocoding client for web services | [GeoPy][geopy] |
| RichDEM | Terrain & hydrology on DEMs | [RichDEM][richdem] |
| WhiteboxTools | Terrain / LiDAR / remote-sensing analysis (Rust) | [WhiteboxTools][whiteboxtools] |
| descartes | (deprecated) Shapely geometries → Matplotlib patches | [descartes][descartes] |
| GeoGPT | LLM-based geoscience research agent (the lone AI-agent entry) | [GeoGPT][geogpt] |

## Sources

[sqlite-fts5]: https://www.sqlite.org/fts5.html
[sqljs]: https://github.com/sql-js/sql.js
[sqljs-fts5-pr]: https://github.com/sql-js/sql.js/pull/199
[sqljs-fts5]: https://www.npmjs.com/package/sql.js-fts5
[sqljs-httpvfs]: https://github.com/phiresky/sql.js-httpvfs
[duckdb-wasm-ext]: https://duckdb.org/docs/stable/clients/wasm/extensions.html
[duckdb-wasm-data]: https://duckdb.org/docs/stable/clients/wasm/data_ingestion.html
[duckdb-fts-attach]: https://github.com/duckdb/duckdb/issues/13523
[hyparquet]: https://github.com/hyparam/hyparquet
[arrow-js]: https://arrow.apache.org/docs/js/
[indexeddb]: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
[deckgl]: https://github.com/visgl/deck.gl
[keplergl]: https://docs.kepler.gl/
[keplergl-repo]: https://github.com/keplergl/kepler.gl
[datashader]: https://github.com/holoviz/datashader
[pyproj]: https://pyproj4.github.io/pyproj/stable/
[cartopy]: https://cartopy.readthedocs.io/stable/
[laspy]: https://laspy.readthedocs.io/
[folium]: https://python-visualization.github.io/folium/latest/
[geoviews]: https://geoviews.org/
[gdal]: https://gdal.org/
[geopandas]: https://geopandas.org/
[fiona]: https://fiona.readthedocs.io/
[shapely]: https://shapely.readthedocs.io/
[rasterio]: https://rasterio.readthedocs.io/
[rasterstats]: https://pythonhosted.org/rasterstats/
[pysal]: https://pysal.org/
[osmnx]: https://osmnx.readthedocs.io/
[earthpy]: https://earthpy.readthedocs.io/
[satpy]: https://satpy.readthedocs.io/
[geopy]: https://geopy.readthedocs.io/
[richdem]: https://richdem.readthedocs.io/
[whiteboxtools]: https://www.whiteboxgeo.com/
[descartes]: https://pypi.org/project/descartes/
[geogpt]: https://geogpt.zero2x.org/
