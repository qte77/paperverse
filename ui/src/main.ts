import { resolveTheme } from "./theme";

// DOM glue: read the system preference and apply the resolved theme as a
// data-theme attribute so the EyeRest CSS variables resolve. (The Three.js
// scene is added in a later slice.)
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.dataset.theme = resolveTheme(prefersDark);
