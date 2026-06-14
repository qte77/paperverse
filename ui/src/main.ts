import { createScene } from "./scene";
import { resolveTheme } from "./theme";

// Apply the resolved system theme so the page background the empty scene shows
// through (and the EyeRest CSS variables) resolve for the active scheme.
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.dataset.theme = resolveTheme(prefersDark);

const canvas = document.querySelector<HTMLCanvasElement>("#cloud");
if (canvas) {
  void createScene(canvas);
}
