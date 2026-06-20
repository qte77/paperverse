import { hexToRgb01, type Source } from "./colors";
import { openPapersDb, type PaperMeta } from "./db";
import { formatDateRange } from "./legend";
import { attachInteraction, type InteractionElements } from "./interaction";
import {
  buildColorBuffer,
  buildPointsCloud,
  createNeighborLines,
  dimColors,
  nearestNeighbors,
  paintPoints,
  parsePositions,
  POINT_SIZE,
  resolveSourceRgb,
  restorePoints,
  setCloudFog,
  setLineColor,
  setPixelRatio,
  setPointSize,
  updateNeighborLines,
} from "./papers";
import { attachResults } from "./results";
import { createScene, type SceneHandle } from "./scene";
import { attachSearch } from "./search";
import {
  nextPreference,
  type Preference,
  themeAnnouncement,
  THEME_TOGGLE_LABEL,
  themeForPreference,
  themeToggleAria,
} from "./theme";

// Data artifacts + the sql.js WASM are copied into the site by the Pages build
// and served under the Vite base path (e.g. /paperverse/).
const BASE = import.meta.env.BASE_URL;
const DATA_DIR = `${BASE}data`;
const SQL_WASM_URL = `${BASE}sql-wasm.wasm`;

/** First-paint metadata (meta.json): point count, date endpoints, and the
 * per-point source list (parallel to positions.bin, entry `i` == point `i`). */
interface CloudMeta {
  count: number;
  dateMin: string;
  dateMax: string;
  sources: Source[];
}

/** How many nearest papers to link when one is selected. */
const NEIGHBOR_COUNT = 5;

const THEME_KEY = "paperverse-theme";
const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");

function readThemePreference(): Preference {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function applyThemePreference(pref: Preference): void {
  document.documentElement.dataset.theme = themeForPreference(pref, themeQuery.matches);
}

async function mount(canvas: HTMLCanvasElement): Promise<void> {
  // Status overlay: feedback while the ~1 MB+ WASM + data fetch is in flight,
  // and a visible message on empty/error instead of a silent blank canvas.
  const statusEl = document.querySelector<HTMLElement>("#status");
  const setStatus = (text: string | null): void => {
    if (!statusEl) return;
    if (text === null) {
      statusEl.hidden = true;
    } else {
      statusEl.textContent = text;
      statusEl.hidden = false;
    }
  };
  // Renderer init is awaited before the data-load try below, so guard it on its
  // own: the WebGL2 backend can be unavailable (very old browser, blocklisted
  // GPU). Without this, a failure would leave the page stuck on "Loading…".
  let handle: SceneHandle;
  try {
    handle = await createScene(canvas);
  } catch (error) {
    setStatus("This visualization needs WebGL2, which isn't available in this browser.");
    console.warn("paperverse: renderer init failed (WebGL2 unavailable?)", error);
    return;
  }
  try {
    setStatus("Loading…");
    // First paint needs only the small positions binary + meta.json. The ~1 MB+
    // papers.db and sql.js WASM load in the background (further down) so the cloud
    // appears without blocking on them.
    const [positionsResponse, metaResponse] = await Promise.all([
      fetch(`${DATA_DIR}/positions.bin`),
      fetch(`${DATA_DIR}/meta.json`),
    ]);
    const positions = parsePositions(await positionsResponse.arrayBuffer());
    if (positions.length === 0) {
      setStatus("No papers to display.");
      return;
    }
    const meta = (await metaResponse.json()) as CloudMeta;
    if (meta.sources.length !== positions.length / 3) {
      setStatus("Data mismatch — please reload.");
      return;
    }

    // Colour state — `let` so a theme switch can re-resolve the EyeRest tokens.
    // Per-point sources come from meta.json, so colouring never waits on the DB.
    let baseline = buildColorBuffer(meta.sources, resolveSourceRgb(document.documentElement));
    const working = baseline.slice();
    const points = buildPointsCloud(positions, working);
    // gl_PointSize is in framebuffer pixels; scale by the (clamped) device pixel
    // ratio so points aren't ~half size on hi-dpi/retina screens. Matches the
    // renderer's maxPixelRatio = 2 (see computeRenderSize in renderer.ts).
    setPixelRatio(points, Math.min(Math.max(window.devicePixelRatio || 1, 1), 2));
    handle.add(points);
    const neighborLines = createNeighborLines(NEIGHBOR_COUNT);
    handle.add(neighborLines);
    setStatus(null);
    // The axis encoding + real year span (from meta.json) is the legend chip's
    // tooltip — keeps the toolbar key compact; hover/AT get the full description.
    const legendEl = document.querySelector<HTMLElement>("#legend");
    if (legendEl) {
      legendEl.title = formatDateRange(meta.dateMin, meta.dateMax);
    }
    // Frame the camera on the actual cloud bounds — UMAP coordinates are not
    // centered on the origin, so a fixed camera would look at empty space.
    points.geometry.computeBoundingSphere();
    const sphere = points.geometry.boundingSphere;
    let pickThreshold = POINT_SIZE;
    // fogNear/fogFar are computed to match scene.ts frameSphere fog formula so
    // the shader's manual fog uniform stays in sync with the scene fog.
    let fogNear = 0.1;
    let fogFar = 1000;
    if (sphere) {
      const center: [number, number, number] = [sphere.center.x, sphere.center.y, sphere.center.z];
      const radius = sphere.radius;
      handle.frameSphere(center, radius);
      pickThreshold = Math.max(POINT_SIZE, radius * 0.03);
      setPointSize(points, radius * 0.08);
      const safeRadius = Math.max(radius, 0.01);
      const dist = (safeRadius * 1.4) / Math.sin((60 * Math.PI) / 360);
      fogNear = dist - safeRadius;
      fogFar = dist + safeRadius * 2.5;
      document
        .querySelector("#reset")
        ?.addEventListener("click", () => handle.frameSphere(center, radius));
    }

    const readColour = (name: string): [number, number, number] =>
      hexToRgb01(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
    // Theme-derived colours: re-applied wholesale on a light/dark or system switch.
    let hoverRgb: [number, number, number];
    let dimmed: Float32Array;
    const applyThemeColors = (): void => {
      hoverRgb = readColour("--data-positive");
      dimmed = dimColors(baseline, 0.22, readColour("--bg"));
      const bgRgb = readColour("--bg");
      handle.setFogColor(bgRgb);
      setCloudFog(points, bgRgb, fogNear, fogFar);
      setLineColor(neighborLines, readColour("--text"));
    };
    applyThemeColors();
    let hoverHits: number[] = [];
    let searchHits: number[] = [];
    const repaint = (): void => {
      // Search focus: when there are matches, fade everything toward the page
      // background, then restore matches to full colour so they stand out.
      working.set(searchHits.length > 0 ? dimmed : baseline);
      restorePoints(working, baseline, searchHits);
      paintPoints(working, hoverHits, hoverRgb);
      points.geometry.getAttribute("color").needsUpdate = true;
    };
    // Re-resolve point colours after a theme switch, then repaint.
    const recolour = (): void => {
      baseline = buildColorBuffer(meta.sources, resolveSourceRgb(document.documentElement));
      applyThemeColors();
      repaint();
    };

    // Selecting a paper links it to its nearest neighbours (proximity ≈ similarity).
    const showNeighbors = (idx: number | null): void => {
      if (idx === null) {
        neighborLines.visible = false;
        return;
      }
      const neighbors = nearestNeighbors(positions, idx, NEIGHBOR_COUNT);
      updateNeighborLines(neighborLines, positions, idx, neighbors);
    };
    // Detail panel: one open/close controller shared by the canvas click
    // (interaction.ts), the keyboard results list (results.ts), the close button,
    // and Escape — so focus handling lives in exactly one place.
    const detailPanel = document.querySelector<HTMLElement>("#detail");
    const detailTitle = document.querySelector<HTMLElement>("#detail-title");
    const detailMeta = document.querySelector<HTMLElement>("#detail-meta");
    const detailAbstract = document.querySelector<HTMLElement>("#detail-abstract");
    const detailClose = document.querySelector<HTMLButtonElement>("#detail-close");
    let lastFocused: HTMLElement | null = null;
    const openDetail = (paper: PaperMeta): void => {
      if (!detailPanel || !detailTitle || !detailMeta || !detailAbstract) return;
      detailTitle.textContent = paper.title;
      detailMeta.textContent =
        `${paper.authors} · ${paper.categories.join(", ")} · ${paper.source} · ${paper.published}`;
      detailAbstract.textContent = paper.abstract;
      // Remember focus so Escape/close can restore it (e.g. back to a result row).
      lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      detailPanel.hidden = false;
      detailClose?.focus();
    };
    const closeDetail = (): void => {
      if (!detailPanel || detailPanel.hidden) return;
      detailPanel.hidden = true;
      showNeighbors(null);
      lastFocused?.focus();
      lastFocused = null;
    };
    detailClose?.addEventListener("click", closeDetail);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDetail();
      }
    });

    // Resolve interaction DOM up front; hover/click + results handlers are wired
    // once the DB is ready (background load below). Search powers FTS queries, so
    // disable it until then rather than letting input fall into a not-yet-ready DB.
    const tooltip = document.querySelector<HTMLElement>("#tooltip");
    const els: InteractionElements | null = tooltip ? { tooltip } : null;
    const resultsList = document.querySelector<HTMLUListElement>("#results");
    const searchInput = document.querySelector<HTMLInputElement>("#search");
    if (searchInput) {
      searchInput.disabled = true;
    }

    // Theme toggle: a button that cycles system -> light -> dark on click,
    // applying + persisting the choice and recolouring the cloud.
    const themeControl = document.querySelector<HTMLButtonElement>("#theme-toggle");
    const themeStatus = document.querySelector<HTMLElement>("#theme-status");
    if (themeControl) {
      let pref = readThemePreference();
      // Keep the visible label AND the accessible name (aria-label + tooltip) in
      // sync with the active mode, so assistive tech can tell System/Light/Dark
      // apart instead of hearing only a static "Theme".
      const reflectThemeControl = (): void => {
        themeControl.textContent = THEME_TOGGLE_LABEL[pref];
        const aria = themeToggleAria(pref);
        themeControl.setAttribute("aria-label", aria);
        themeControl.title = aria;
      };
      reflectThemeControl();
      themeControl.addEventListener("click", () => {
        pref = nextPreference(pref);
        localStorage.setItem(THEME_KEY, pref);
        applyThemePreference(pref);
        reflectThemeControl();
        // Focus stays on the button after the click, so the changed name alone
        // won't be re-read — announce the new mode via the live region.
        if (themeStatus) {
          themeStatus.textContent = themeAnnouncement(pref);
        }
        recolour();
      });
    }
    themeQuery.addEventListener("change", () => {
      if (readThemePreference() === "system") {
        applyThemePreference("system");
        recolour();
      }
    });

    // Background load: fetch papers.db + the sql.js WASM, then wire hover/click
    // metadata and enable search. On failure the cloud stays usable (orbit,
    // theme, legend) — only metadata lookup and search are lost — so we log
    // rather than overwrite the working canvas with an error banner.
    void (async (): Promise<void> => {
      try {
        const dbResponse = await fetch(`${DATA_DIR}/papers.db`);
        const db = await openPapersDb(
          new Uint8Array(await dbResponse.arrayBuffer()),
          SQL_WASM_URL,
        );
        if (els) {
          attachInteraction(
            handle,
            points,
            db,
            els,
            openDetail,
            (indices) => {
              hoverHits = indices;
              repaint();
            },
            showNeighbors,
            pickThreshold,
          );
        }
        if (searchInput) {
          // Keyboard fallback for the mouse-only canvas: search hits become a
          // focusable, arrow/enter-navigable listbox that opens a paper's detail.
          let updateResults: (indices: number[]) => void = () => {};
          if (resultsList) {
            updateResults = attachResults({
              list: resultsList,
              searchInput,
              db,
              positions,
              openDetail,
              flyTo: (target) => handle.flyTo(target),
              onSelect: showNeighbors,
            }).update;
          }
          attachSearch({
            input: searchInput,
            db,
            positions,
            onResults: (indices) => {
              searchHits = indices;
              updateResults(indices);
              repaint();
            },
            flyTo: (target) => handle.flyTo(target),
          });
          searchInput.disabled = false;
        }
      } catch (error) {
        console.warn("paperverse: search and details unavailable (data load failed)", error);
      }
    })();
  } catch (error) {
    setStatus("Couldn't load the paper cloud. Please reload the page.");
    console.warn("paperverse: failed to load the paper cloud", error);
  }
}

// Apply the saved theme preference before the scene reads the EyeRest variables.
applyThemePreference(readThemePreference());

const canvas = document.querySelector<HTMLCanvasElement>("#cloud");
if (canvas) {
  void mount(canvas);
}
