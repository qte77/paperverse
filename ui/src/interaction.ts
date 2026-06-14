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

/** Wire hover (tooltip + highlight) and click (detail panel) on the point cloud. */
export function attachInteraction(
  handle: SceneHandle,
  points: THREE.Points,
  db: PapersDb,
  els: InteractionElements,
  highlight: (indices: number[]) => void,
): void {
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: POINT_SIZE };
  const ndc = new THREE.Vector2();

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
    els.tooltip.textContent = paper.title;
    els.tooltip.style.left = `${event.clientX + 12}px`;
    els.tooltip.style.top = `${event.clientY + 12}px`;
    els.tooltip.hidden = false;
    highlight([idx]);
  });

  handle.domElement.addEventListener("click", (event) => {
    const idx = pick(event);
    const paper = idx === null ? null : db.paperByIdx(idx);
    if (paper === null) {
      return;
    }
    els.panelTitle.textContent = paper.title;
    els.panelMeta.textContent =
      `${paper.authors} · ${paper.categories.join(", ")} · ${paper.source} · ${paper.published}`;
    els.panelAbstract.textContent = paper.abstract;
    els.panel.hidden = false;
  });
}
