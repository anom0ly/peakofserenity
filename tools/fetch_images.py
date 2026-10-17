#!/usr/bin/env python3
"""Download the images the converted content references straight from the live site.

Usage: python3 -I fetch_images.py [REPO_ROOT]
Reads migration/images-needed.txt (paths under wp-content/uploads/, written by wp2mdx.py),
saves each to static/img/uploads/<same path>, skips files already present, and appends any
that fail to a "Images that failed to download" section of migration/review-list.md.
"""
import os
import ssl
import sys
import time
import urllib.error
import urllib.request

BASE = "https://www.peakofserenity.com/wp-content/uploads/"
CA = "/root/.ccr/ca-bundle.crt"  # cloud sessions' proxy CA; ignored elsewhere
SECTION = "\n## Images that failed to download\n\n"


def fetch(url, ctx):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (peakofserenity migration)"})
    with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
        return r.read()


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    ctx = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
    needed = [l.strip() for l in open(os.path.join(root, "migration", "images-needed.txt")) if l.strip()]
    failed, got = [], 0
    for rel in needed:
        dest = os.path.join(root, "static", "img", "uploads", rel)
        if os.path.exists(dest):
            continue
        for attempt in range(3):
            try:
                data = fetch(BASE + urllib.request.quote(rel), ctx)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, "wb") as f:
                    f.write(data)
                got += 1
                break
            except urllib.error.HTTPError as e:
                failed.append("%s (HTTP %d)" % (rel, e.code))
                break
            except Exception as e:  # network hiccup: retry, then record
                if attempt == 2:
                    failed.append("%s (%s)" % (rel, e))
                time.sleep(2 ** attempt)
        if not got and len(failed) >= 3 and not any("HTTP" in f for f in failed):
            sys.exit("Can't reach www.peakofserenity.com (%s); nothing recorded." % failed[0])
    review = os.path.join(root, "migration", "review-list.md")
    text = open(review).read().split(SECTION)[0].rstrip("\n") + "\n"
    if failed:
        text += SECTION + "".join("- /wp-content/uploads/%s\n" % f for f in failed)
    open(review, "w").write(text)
    print("downloaded %d, failed %d, already present %d" % (got, len(failed), len(needed) - got - len(failed)))
    return 1 if failed and not got else 0


if __name__ == "__main__":
    sys.exit(main())
