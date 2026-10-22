#!/usr/bin/env python3
"""Shrink the downloaded images in place, keeping each file's name and format so no links change.

Usage: python3 -I tools/compress_images.py [REPO_ROOT]
- Still images wider than 2000px are scaled down to 2000px; PNGs are re-saved optimised, JPEGs at quality 85.
- Animated GIFs over 20 MB are scaled down until they fit (Cloudflare Pages refuses files over 25 MiB).
- A file is only replaced when the new version is smaller. Files already done are listed in
  migration/images-compressed.txt so re-runs skip them.
Requires: Pillow.
"""
import io
import os
import sys

from PIL import Image, ImageOps, ImageSequence

MAX_WIDTH = 2000
GIF_LIMIT = 20 * 1024 * 1024


def shrink_still(im, ext):
    im = ImageOps.exif_transpose(im)  # JPEG rotation lives in EXIF, which re-saving drops
    if im.width > MAX_WIDTH:
        im = im.resize((MAX_WIDTH, round(im.height * MAX_WIDTH / im.width)), Image.LANCZOS)
    out = io.BytesIO()
    if ext in ("jpg", "jpeg"):
        im.convert("RGB").save(out, "JPEG", quality=85, optimize=True, progressive=True)
    else:
        im.save(out, "PNG", optimize=True)
    return out.getvalue()


def shrink_gif(im, size):
    scale = (GIF_LIMIT / size) ** 0.5 * 0.9
    while True:
        w, h = round(im.width * scale), round(im.height * scale)
        frames = [f.convert("RGBA").resize((w, h), Image.LANCZOS) for f in ImageSequence.Iterator(im)]
        durations = [f.info.get("duration", 100) for f in ImageSequence.Iterator(im)]
        out = io.BytesIO()
        frames[0].save(out, "GIF", save_all=True, append_images=frames[1:], duration=durations,
                       loop=im.info.get("loop", 0), optimize=True, disposal=2)
        if out.tell() <= GIF_LIMIT or scale < 0.3:
            return out.getvalue()
        scale *= 0.85


def main():
    repo = sys.argv[1] if len(sys.argv) > 1 else "."
    root = os.path.join(repo, "static", "img", "uploads")
    done_path = os.path.join(repo, "migration", "images-compressed.txt")
    done = set(open(done_path).read().split("\n")) if os.path.exists(done_path) else set()
    before = after = 0
    for dirpath, _, files in os.walk(root):
        for name in sorted(files):
            path = os.path.join(dirpath, name)
            rel = os.path.relpath(path, root)
            ext = name.rsplit(".", 1)[-1].lower()
            if rel in done or ext not in ("png", "jpg", "jpeg", "gif"):
                continue
            size = os.path.getsize(path)
            try:
                with Image.open(path) as im:
                    if getattr(im, "n_frames", 1) > 1:
                        new = shrink_gif(im, size) if size > GIF_LIMIT else None
                    else:
                        new = shrink_still(im, ext)
            except Exception as e:
                print("skipped %s (%s)" % (rel, e))
                continue
            before += size
            if new and len(new) < size:
                with open(path, "wb") as f:
                    f.write(new)
                after += len(new)
            else:
                after += size
            done.add(rel)
    with open(done_path, "w") as f:
        f.write("\n".join(sorted(d for d in done if d)) + "\n")
    print("compressed %.1f MB -> %.1f MB" % (before / 1e6, after / 1e6))


if __name__ == "__main__":
    main()
