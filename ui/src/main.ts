import { openPapersDb } from "./db";
import { buildColorBuffer, buildPointsCloud, parsePositions, resolveSourceRgb } from "./papers";
import { createScene } from "./scene";
import { resolveTheme } from "./theme";

// Data artifacts + the sql.js WASM are served by the Vite/Pages build (STORY-012);
// these are the paths that build will provide.
const DATA_DIR = "data";
const SQL_WASM_URL = "sql-wasm.wasm";

async function mount(canvas: HTMLCanvasElement): Promise<void> {
  const handle = await createScene(canvas);
  try {
    const [positionsResponse, dbResponse] = await Promise.all([
      fetch(`${DATA_DIR}/positions.bin`),
      fetch(`${DATA_DIR}/papers.db`),
    ]);
    const positions = parsePositions(await positionsResponse.arrayBuffer());
    const db = await openPapersDb(new Uint8Array(await dbResponse.arrayBuffer()), SQL_WASM_URL);
    const colors = buildColorBuffer(db.sourcesByIdx(), resolveSourceRgb(document.documentElement));
    db.close();
    handle.add(buildPointsCloud(positions, colors));
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
