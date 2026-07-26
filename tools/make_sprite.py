#!/usr/bin/env python3
"""Turn a photo of one of Rotem's drawings into a game sprite.

This is deliberately mechanical rather than generative. A model asked to
"make this a game asset" would redraw the picture in its own style, which
throws away her actual lines — the whole point is that the lines in the game
are hers. So: make the paper transparent, trim, resize. Same input, same
output, every time.

Usage:
    tools/.venv/bin/python tools/make_sprite.py photo.jpg --id sofa_pink
    tools/.venv/bin/python tools/make_sprite.py drawings/*.jpg --outdir assets/drawings

The paper is removed by flooding inward from the edges rather than by deleting
every light pixel, so white *inside* the drawing — a white shirt, the gap in a
letter O, the highlight in an eye — survives.
"""

from __future__ import annotations

import argparse
import sys
from collections import deque
from pathlib import Path

from PIL import Image

# Working size before background removal. Big enough to keep detail, small
# enough that a pure-Python flood fill stays quick.
WORK_MAX = 1400

# Default output height in design-space pixels, doubled for a Pixel's DPR.
DEFAULT_HEIGHT = 600

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTDIR = REPO_ROOT / "assets" / "drawings"


def is_paper(pixel, brightness: int, tolerance: int) -> bool:
    """True for pixels that look like blank paper: bright and near-grey."""
    r, g, b = pixel[:3]
    if min(r, g, b) < brightness:
        return False
    return max(r, g, b) - min(r, g, b) <= tolerance


def paper_mask(image: Image.Image, brightness: int, tolerance: int) -> bytearray:
    """Flood inward from every edge pixel, marking connected paper.

    Flooding rather than thresholding is what protects white areas enclosed by
    the drawing — those are never reached from outside.
    """
    width, height = image.size
    pixels = image.load()
    outside = bytearray(width * height)
    queue = deque()

    def consider(x: int, y: int) -> None:
        index = y * width + x
        if outside[index]:
            return
        if not is_paper(pixels[x, y], brightness, tolerance):
            return
        outside[index] = 1
        queue.append((x, y))

    for x in range(width):
        consider(x, 0)
        consider(x, height - 1)
    for y in range(height):
        consider(0, y)
        consider(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            consider(x - 1, y)
        if x < width - 1:
            consider(x + 1, y)
        if y > 0:
            consider(x, y - 1)
        if y < height - 1:
            consider(x, y + 1)

    return outside


def cut_out(image: Image.Image, brightness: int, tolerance: int) -> Image.Image:
    """Return the drawing with its paper background made transparent."""
    rgb = image.convert("RGB")
    outside = paper_mask(rgb, brightness, tolerance)

    result = image.convert("RGBA")
    width, height = result.size
    alpha = Image.frombytes(
        "L", (width, height), bytes(0 if flag else 255 for flag in outside)
    )
    result.putalpha(alpha)
    return result


def trim(image: Image.Image, padding: int = 2) -> Image.Image:
    """Crop to what is actually drawn, so placement uses real dimensions."""
    box = image.getbbox()
    if box is None:
        return image
    left, top, right, bottom = box
    return image.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(image.width, right + padding),
        min(image.height, bottom + padding),
    ))


def fit_height(image: Image.Image, height: int) -> Image.Image:
    if image.height == height:
        return image
    width = max(1, round(image.width * height / image.height))
    return image.resize((width, height), Image.LANCZOS)


def convert(path: Path, outdir: Path, name: str, height: int,
            brightness: int, tolerance: int) -> Path:
    image = Image.open(path)
    image.thumbnail((WORK_MAX, WORK_MAX), Image.LANCZOS)

    sprite = fit_height(trim(cut_out(image, brightness, tolerance)), height)

    outdir.mkdir(parents=True, exist_ok=True)
    destination = outdir / f"{name}.png"
    sprite.save(destination, "PNG", optimize=True)
    return destination


def display_path(path: Path) -> str:
    """Repo-relative when it can be, absolute otherwise."""
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("photos", nargs="+", type=Path,
                        help="photos of drawings")
    parser.add_argument("--id", dest="name",
                        help="catalog id for the output; defaults to the "
                             "photo's filename. Only valid for a single photo.")
    parser.add_argument("--outdir", type=Path, default=DEFAULT_OUTDIR)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT,
                        help=f"output height in pixels (default {DEFAULT_HEIGHT})")
    parser.add_argument("--brightness", type=int, default=205,
                        help="how bright a pixel must be to count as paper "
                             "(0-255, lower it for photos taken in shadow)")
    parser.add_argument("--tolerance", type=int, default=42,
                        help="how far from grey paper may drift (raise it for "
                             "warm indoor light)")
    args = parser.parse_args(argv)

    if args.name and len(args.photos) > 1:
        parser.error("--id only makes sense with a single photo")

    failures = 0
    for photo in args.photos:
        if not photo.exists():
            print(f"missing: {photo}", file=sys.stderr)
            failures += 1
            continue
        try:
            written = convert(photo, args.outdir, args.name or photo.stem,
                              args.height, args.brightness, args.tolerance)
        except Exception as error:  # noqa: BLE001 — report and keep batching
            print(f"failed: {photo}: {error}", file=sys.stderr)
            failures += 1
            continue
        print(f"{photo.name} -> {display_path(written)}")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
