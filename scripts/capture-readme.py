#!/usr/bin/env python3
"""Capture the README screenshots: the cloud + a clicked paper, side by side.

Drives the local preview (see `make screenshots`) with the shared polyfetch-scrape
Patchright/SwiftShader env, plus Pillow for the side-by-side compose. For each theme
it loads `?theme=<t>&cam=oblique` (the oblique view reveals the z=date depth and
pauses the idle rotation for a stable frame), selects a paper via search so its
neighbour links render, then composes two panels that do NOT overlap:

  [ oblique cloud + neighbour links ]  [ selected paper's detail card ]

…and writes `assets/images/cloud-<theme>.png`.

Usage (via the shared env; Pillow added for the compose):
  uv run --directory ../polyfetch-scrape --with pillow \
      python scripts/capture-readme.py --url http://localhost:8143 --search agent
"""
from __future__ import annotations

import argparse
import io
from pathlib import Path
from typing import TYPE_CHECKING

from patchright.sync_api import sync_playwright
from PIL import Image

if TYPE_CHECKING:
    from patchright.sync_api import Page

# SwiftShader software-GL so the WebGL2 cloud renders headless (mirrors gui-check.py).
LAUNCH_ARGS = ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
THEMES = ("light", "dark")
VIEWPORT = {"width": 1280, "height": 900}
# Cloud panel: crop the rendered viewport to the toolbar + cloud band (the oblique
# fly-to leaves the lower viewport empty).
CLOUD_CLIP = {"x": 0, "y": 0, "width": 1280, "height": 640}
GAP = 40  # px between the two panels
# Page-background fill behind the panels, per theme (EyeRest --bg).
BG = {"light": (236, 232, 216), "dark": (28, 26, 20)}
# Resolve next to the repo (scripts/..), NOT the CWD: `uv run --directory` runs this
# from the polyfetch-scrape env, so a relative default would write to the wrong tree.
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "assets" / "images"


def _png(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("RGB")


def capture(page: Page, base_url: str, theme: str, search: str, out_dir: Path) -> Path:
    """Compose the oblique cloud and the selected paper's card side by side."""
    page.goto(f"{base_url}/?theme={theme}&cam=oblique", wait_until="networkidle")
    page.wait_for_selector("#search:not([disabled])", timeout=30000)
    if page.query_selector("#info-btn") is None:  # also warms the page
        raise RuntimeError(f"{theme}: served build is missing #info-btn — stale preview?")
    page.fill("#search", search)
    page.wait_for_selector("#results li", timeout=30000)
    page.click("#results li:first-child")  # selects -> draws neighbour links + detail
    page.wait_for_selector("#detail:not([hidden])", timeout=30000)
    page.fill("#search", "")  # drop the results overlay; the paper stays selected
    page.wait_for_selector("#results", state="hidden", timeout=5000)
    page.wait_for_timeout(1500)  # let the camera fly-to settle

    # Panel 2: the detail card, cropped to its content (the panel itself is full-height).
    flyout = _png(page.locator("#detail").screenshot())
    abstract = page.locator("#detail-abstract").bounding_box()
    content_h = int(abstract["y"] + abstract["height"] + 24) if abstract else flyout.height
    flyout = flyout.crop((0, 0, flyout.width, min(content_h, flyout.height)))

    # Panel 1: the cloud. Hide the flyout WITHOUT deselecting (the normal close path
    # clears the links) so the connections stay drawn and nothing overlaps the cloud.
    page.evaluate("() => { const d = document.querySelector('#detail'); if (d) d.hidden = true; }")
    page.wait_for_timeout(300)
    cloud = _png(page.screenshot(clip=CLOUD_CLIP))

    height = max(cloud.height, flyout.height)
    canvas = Image.new("RGB", (cloud.width + GAP + flyout.width, height), BG[theme])
    canvas.paste(cloud, (0, (height - cloud.height) // 2))
    canvas.paste(flyout, (cloud.width + GAP, (height - flyout.height) // 2))
    out = out_dir / f"cloud-{theme}.png"
    canvas.save(out)
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
                pg = browser.new_page(viewport=VIEWPORT)
                out = capture(pg, args.url.rstrip("/"), theme, args.search, args.out_dir)
                pg.close()
                print(f"  wrote {out}")
        finally:
            browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
