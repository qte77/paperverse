#!/usr/bin/env python3
"""Capture the README screenshots: an oblique 3D angle with a paper selected.

Drives the local preview (see `make screenshots`) with the shared polyfetch-scrape
Patchright/SwiftShader env. For each theme it loads `?theme=<t>&cam=oblique` (the
oblique view reveals the z=date depth and pauses the idle rotation for a stable
frame), selects a paper via search so its neighbour links render, then writes
`assets/images/cloud-<theme>.png`.

Usage (via the shared env):
  uv run --directory ../polyfetch-scrape python scripts/capture-readme.py \
      --url http://localhost:8143 --search agent
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import TYPE_CHECKING

from patchright.sync_api import sync_playwright

if TYPE_CHECKING:
    from patchright.sync_api import Page

# SwiftShader software-GL so the WebGL2 cloud renders headless (mirrors gui-check.py).
LAUNCH_ARGS = ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
THEMES = ("light", "dark")
VIEWPORT = {"width": 1280, "height": 900}
# Crop to the toolbar + cloud band: the oblique fly-to leaves the lower viewport
# empty, so a top clip gives a tighter ~2:1 hero without shrinking the cloud.
CLIP = {"x": 0, "y": 0, "width": 1280, "height": 640}
# Resolve next to the repo (scripts/..), NOT the CWD: `uv run --directory` runs this
# from the polyfetch-scrape env, so a relative default would write to the wrong tree.
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "assets" / "images"


def capture(page: Page, base_url: str, theme: str, search: str, out_dir: Path) -> Path:
    """Load the oblique view in `theme`, select a paper, and screenshot the cloud."""
    page.goto(f"{base_url}/?theme={theme}&cam=oblique", wait_until="networkidle")
    # Search enables only once the DB (and selection wiring) is ready.
    page.wait_for_selector("#search:not([disabled])", timeout=30000)
    page.fill("#search", search)
    page.wait_for_selector("#results li", timeout=30000)
    page.click("#results li:first-child")  # selects -> draws neighbour links + detail
    page.wait_for_selector("#detail:not([hidden])", timeout=30000)
    page.fill("#search", "")  # drop the results overlay; the paper stays selected
    page.wait_for_selector("#results", state="hidden", timeout=5000)
    page.wait_for_timeout(1500)  # let the camera fly-to settle
    if page.get_attribute("#detail", "hidden") is not None:
        raise RuntimeError(f"{theme}: no paper selected — the capture would be wrong")
    # Hide the detail flyout WITHOUT deselecting: the normal close path clears the
    # neighbour links, but here we want them to stay drawn so the cloud and its
    # connections show unobstructed by the side panel.
    page.evaluate("() => { const d = document.querySelector('#detail'); if (d) d.hidden = true; }")
    page.wait_for_timeout(300)
    out = out_dir / f"cloud-{theme}.png"
    page.screenshot(path=str(out), clip=CLIP)
    return out


def main() -> int:
    """Parse args and capture both themes into the output directory."""
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--url", required=True, help="base URL of the running preview")
    ap.add_argument("--search", default="agent", help="query used to select a paper")
    ap.add_argument("--out-dir", type=Path, default=DEFAULT_OUT, help="where to write the PNGs")
    args = ap.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=LAUNCH_ARGS)
        try:
            for theme in THEMES:
                page = browser.new_page(viewport=VIEWPORT)
                out = capture(page, args.url.rstrip("/"), theme, args.search, args.out_dir)
                page.close()
                print(f"  wrote {out}")
        finally:
            browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
