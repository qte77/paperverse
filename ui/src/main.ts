import { hexToRgb01 } from "./colors";
import { openPapersDb } from "./db";
import { attachInteraction, type InteractionElements } from "./interaction";
import {
  applyHighlight,
  buildColorBuffer,
  buildPointsCloud,
  parsePositions,
  resolveSourceRgb,
} from "./papers";
import { createScene } from "./scene";
import { resolveTheme } from "./theme";

// Data artifacts + the sql.js WASM are served by the Vite/Pages build (STORY-012);
// these are the paths that build will provide.
const DATA_DIR = "data";
const SQL_WASM_URL = "sql-wasm.wasm";

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

    const baseline = buildColorBuffer(db.sourcesByIdx(), resolveSourceRgb(document.documentElement));
    const working = baseline.slice();
    const points = buildPointsCloud(positions, working);
    handle.add(points);

    const els = interactionElements();
    if (els) {
      const hoverRgb = hexToRgb01(
        getComputedStyle(document.documentElement).getPropertyValue("--data-positive").trim(),
      );
      const highlight = (indices: number[]): void => {
        applyHighlight(working, baseline, indices, hoverRgb);
        points.geometry.getAttribute("color").needsUpdate = true;
      };
      attachInteraction(handle, points, db, els, highlight);
    }
  } catch (error) {
    console.warn("paperverse: paper cloud not loaded (data is served in STORY-012)", error);
  }
}

// Apply the resolved system theme so the EyeRest CSS variables resolve.
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.dataset.theme = resolveTheme(prefersDark);

const canvas = document.querySelector<HTMLCanvasElement>("#cloud");
if (canvas) {
  void mount(canvas);
}
