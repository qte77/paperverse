/** Hover/click interaction on the point cloud (STORY-010).
 *
 * `mouseToNdc` is pure and unit-tested; the raycaster + DOM event wiring in
 * `attachInteraction` is type-checked and build-smoked (no WebGL/DOM in jsdom).
 */

import * as THREE from "three";

import type { PapersDb } from "./db";
import { POINT_SIZE } from "./papers";
import type { SceneHandle } from "./scene";

/** Convert pointer client coordinates to normalized device coordinates (Y inverted). */
export function mouseToNdc(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return { x: (clientX / width) * 2 - 1, y: -(clientY / height) * 2 + 1 };
}

/** The DOM nodes the interaction drives. */
export interface InteractionElements {
  tooltip: HTMLElement;
  panel: HTMLElement;
  panelTitle: HTMLElement;
  panelMeta: HTMLElement;
  panelAbstract: HTMLElement;
}

/** Wire hover (tooltip + highlight) and click (detail panel + neighbour select). */
export function attachInteraction(
  handle: SceneHandle,
  points: THREE.Points,
  db: PapersDb,
  els: InteractionElements,
  highlight: (indices: number[]) => void,
  onSelect: (idx: number | null) => void,
  threshold: number = POINT_SIZE,
): void {
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold };
  const ndc = new THREE.Vector2();

  // Tooltip content: a title line + a muted meta line, built once and reused.
  // textContent only (never innerHTML) so DB strings can't inject markup.
  const tipTitle = document.createElement("div");
  const tipMeta = document.createElement("div");
  tipMeta.style.opacity = "0.7";
  tipMeta.style.fontSize = "0.85em";
  els.tooltip.replaceChildren(tipTitle, tipMeta);

  const pick = (event: MouseEvent): number | null => {
    const { x, y } = mouseToNdc(
      event.clientX,
      event.clientY,
      window.innerWidth,
      window.innerHeight,
    );
    ndc.set(x, y);
    raycaster.setFromCamera(ndc, handle.camera);
    return raycaster.intersectObject(points)[0]?.index ?? null;
  };

  handle.domElement.addEventListener("pointermove", (event) => {
    const idx = pick(event);
    const paper = idx === null ? null : db.paperByIdx(idx);
    if (paper === null || idx === null) {
      els.tooltip.hidden = true;
      highlight([]);
      return;
    }
    tipTitle.textContent = paper.title;
    tipMeta.textContent = `${paper.source} · ${paper.published}`;
    els.tooltip.style.left = `${event.clientX + 12}px`;
    els.tooltip.style.top = `${event.clientY + 12}px`;
    els.tooltip.hidden = false;
    highlight([idx]);
  });

  handle.domElement.addEventListener("click", (event) => {
    const idx = pick(event);
    const paper = idx === null ? null : db.paperByIdx(idx);
    if (paper === null) {
      onSelect(null);
      return;
    }
    els.panelTitle.textContent = paper.title;
    els.panelMeta.textContent =
      `${paper.authors} · ${paper.categories.join(", ")} · ${paper.source} · ${paper.published}`;
    els.panelAbstract.textContent = paper.abstract;
    els.panel.hidden = false;
    onSelect(idx);
  });
}
