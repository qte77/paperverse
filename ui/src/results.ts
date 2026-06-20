/** Keyboard-operable search-results listbox — the accessible equivalent of
 * clicking a point in the (mouse-only) canvas (a11y #78).
 *
 * `nextListIndex` is pure and unit-tested; `attachResults` (the listbox render +
 * keyboard wiring) is type-checked and verified by a headless render.
 */

import type { PaperMeta, PapersDb } from "./db";

/**
 * The active option after a navigation key, clamped to `[0, length-1]` (no wrap).
 *
 * From an unselected state (`current < 0`) either arrow lands on the first item.
 * Non-navigation keys leave `current` unchanged; an empty list yields `-1`.
 */
export function nextListIndex(current: number, key: string, length: number): number {
  if (length <= 0) {
    return -1;
  }
  switch (key) {
    case "ArrowDown":
      return current < 0 ? 0 : Math.min(current + 1, length - 1);
    case "ArrowUp":
      return current < 0 ? 0 : Math.max(current - 1, 0);
    case "Home":
      return 0;
    case "End":
      return length - 1;
    default:
      return current;
  }
}

/** How many results to render; the remainder collapse into a visible "+N more". */
const MAX_RESULTS = 10;

/** DOM + data the results list drives. */
export interface ResultsDeps {
  list: HTMLUListElement;
  searchInput: HTMLInputElement;
  db: PapersDb;
  positions: Float32Array;
  /** Open a paper's detail panel (shared with the canvas click path). */
  openDetail: (paper: PaperMeta) => void;
  /** Fly the camera to a world-space target. */
  flyTo: (target: readonly [number, number, number]) => void;
  /** Select a point so its neighbour links draw (null clears them). */
  onSelect: (idx: number | null) => void;
}

/**
 * Render search hits as an ARIA listbox with roving-tabindex keyboard navigation
 * (Arrow/Home/End to move, Enter/click to open, Escape back to the search box).
 * Returns an `update(indices)` to call whenever the search results change.
 */
export function attachResults(deps: ResultsDeps): { update: (indices: number[]) => void } {
  let shown: number[] = []; // point indices currently rendered as options
  let active = -1;

  const options = (): NodeListOf<HTMLLIElement> =>
    deps.list.querySelectorAll<HTMLLIElement>('[role="option"]');

  const setActive = (i: number): void => {
    active = i;
    options().forEach((li, j) => {
      const isActive = j === i;
      li.setAttribute("aria-selected", isActive ? "true" : "false");
      li.tabIndex = isActive ? 0 : -1;
      if (isActive) {
        li.focus();
        li.scrollIntoView({ block: "nearest" });
      }
    });
  };

  const open = (i: number): void => {
    const idx = shown[i];
    if (idx === undefined) {
      return;
    }
    const paper = deps.db.paperByIdx(idx);
    if (paper === null) {
      return;
    }
    deps.openDetail(paper);
    deps.onSelect(idx);
    deps.flyTo([
      deps.positions[idx * 3],
      deps.positions[idx * 3 + 1],
      deps.positions[idx * 3 + 2],
    ]);
  };

  deps.list.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (active >= 0) {
        open(active);
      }
      return;
    }
    if (event.key === "Escape") {
      deps.searchInput.focus();
      return;
    }
    const next = nextListIndex(active, event.key, shown.length);
    if (next !== active || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(next);
    }
  });

  // From the search box, Down arrow steps into the results (combobox convention).
  deps.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && shown.length > 0) {
      event.preventDefault();
      setActive(0);
    }
  });

  const update = (indices: number[]): void => {
    shown = indices.slice(0, MAX_RESULTS);
    active = -1;
    deps.list.replaceChildren();
    if (indices.length === 0) {
      deps.list.hidden = true;
      return;
    }
    shown.forEach((idx, i) => {
      const paper = deps.db.paperByIdx(idx);
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      li.tabIndex = -1;
      li.textContent = paper?.title ?? "(untitled)";
      li.addEventListener("click", () => {
        setActive(i);
        open(i);
      });
      deps.list.appendChild(li);
    });
    if (indices.length > shown.length) {
      // Surface the cap rather than silently truncating.
      const more = document.createElement("li");
      more.className = "more";
      more.setAttribute("aria-hidden", "true");
      more.textContent = `+${indices.length - shown.length} more — refine your search`;
      deps.list.appendChild(more);
    }
    deps.list.hidden = false;
  };

  return { update };
}
