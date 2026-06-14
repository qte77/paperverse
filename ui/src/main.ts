import { hexToRgb01 } from "./colors";
import { openPapersDb } from "./db";
import { attachInteraction, type InteractionElements } from "./interaction";
import {
  buildColorBuffer,
  buildPointsCloud,
  dimColors,
  paintPoints,
  parsePositions,
  POINT_SIZE,
  resolveSourceRgb,
  restorePoints,
} from "./papers";
import { createScene } from "./scene";
import { attachSearch } from "./search";
import { type Preference, themeForPreference } from "./theme";

// Data artifacts + the sql.js WASM are copied into the site by the Pages build
// and served under the Vite base path (e.g. /paperverse/).
const BASE = import.meta.env.BASE_URL;
const DATA_DIR = `${BASE}data`;
const SQL_WASM_URL = `${BASE}sql-wasm.wasm`;

const THEME_KEY = "paperverse-theme";
const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");

function readThemePreference(): Preference {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function applyThemePreference(pref: Preference): void {
  document.documentElement.dataset.theme = themeForPreference(pref, themeQuery.matches);
}

function interactionElements(): InteractionElements | null {
  const tooltip = document.querySelector<HTMLElement>("#tooltip");
  const panel = document.querySelector<HTMLElement>("#detail");
  const panelTitle = document.querySelector<HTMLElement>("#detail-title");
  const panelMeta = document.querySelector<HTMLElement>("#detail-meta");
  const panelAbstract = document.querySelector<HTMLElement>("#detail-abstract");
  if (!tooltip || !panel || !panelTitle || !panelMeta || !panelAbstract) {
    return null;
  }
  document
    .querySelector("#detail-close")
    ?.addEventListener("click", () => (panel.hidden = true));
  return { tooltip, panel, panelTitle, panelMeta, panelAbstract };
}

async function mount(canvas: HTMLCanvasElement): Promise<void> {
  const handle = await createScene(canvas);
  try {
    const [positionsResponse, dbResponse] = await Promise.all([
      fetch(`${DATA_DIR}/positions.bin`),
      fetch(`${DATA_DIR}/papers.db`),
    ]);
    const positions = parsePositions(await positionsResponse.arrayBuffer());
    const db = await openPapersDb(new Uint8Array(await dbResponse.arrayBuffer()), SQL_WASM_URL);

    // Colour state — `let` so a theme switch can re-resolve the EyeRest tokens.
    let baseline = buildColorBuffer(db.sourcesByIdx(), resolveSourceRgb(document.documentElement));
    const working = baseline.slice();
    const points = buildPointsCloud(positions, working);
    handle.add(points);
    // Frame the camera on the actual cloud bounds — UMAP coordinates are not
    // centered on the origin, so a fixed camera would look at empty space.
    points.geometry.computeBoundingSphere();
    const sphere = points.geometry.boundingSphere;
    let pickThreshold = POINT_SIZE;
    if (sphere) {
      handle.frameSphere([sphere.center.x, sphere.center.y, sphere.center.z], sphere.radius);
      pickThreshold = Math.max(POINT_SIZE, sphere.radius * 0.03);
    }

    const readColour = (name: string): [number, number, number] =>
      hexToRgb01(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
    let hoverRgb = readColour("--data-positive");
    let dimmed = dimColors(baseline, 0.22, readColour("--bg"));
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
      baseline = buildColorBuffer(db.sourcesByIdx(), resolveSourceRgb(document.documentElement));
      hoverRgb = readColour("--data-positive");
      dimmed = dimColors(baseline, 0.22, readColour("--bg"));
      repaint();
    };

    const els = interactionElements();
    if (els) {
      attachInteraction(
        handle,
        points,
        db,
        els,
        (indices) => {
          hoverHits = indices;
          repaint();
        },
        pickThreshold,
      );
    }
    const searchInput = document.querySelector<HTMLInputElement>("#search");
    if (searchInput) {
      attachSearch({
        input: searchInput,
        db,
        positions,
        onResults: (indices) => {
          searchHits = indices;
          repaint();
        },
        flyTo: (target) => handle.flyTo(target),
      });
    }

    // Theme picker: apply + persist the choice, recolouring the cloud on switch.
    const themeControl = document.querySelector<HTMLSelectElement>("#theme");
    if (themeControl) {
      themeControl.value = readThemePreference();
      themeControl.addEventListener("change", () => {
        const pref = themeControl.value as Preference;
        localStorage.setItem(THEME_KEY, pref);
        applyThemePreference(pref);
        recolour();
      });
    }
    themeQuery.addEventListener("change", () => {
      if (readThemePreference() === "system") {
        applyThemePreference("system");
        recolour();
      }
    });
  } catch (error) {
    console.warn("paperverse: paper cloud not loaded (data is served in STORY-012)", error);
  }
}

// Apply the saved theme preference before the scene reads the EyeRest variables.
applyThemePreference(readThemePreference());

const canvas = document.querySelector<HTMLCanvasElement>("#cloud");
if (canvas) {
  void mount(canvas);
}
