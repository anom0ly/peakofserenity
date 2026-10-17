#!/usr/bin/env python3
"""Inventory a WordPress (WXR) export: counts, authors, taxonomy, URL paths, markup in use.

Usage: python3 -I inventory.py EXPORT.xml OUTDIR
Writes OUTDIR/inventory.json and OUTDIR/url-map-all.csv (every public URL in the export).
Author emails are never written out.
"""
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wp2mdx import SITE_RE, author_keys, load_items  # noqa: E402

PUBLIC = ("publish", "archive")


def main():
    export, outdir = sys.argv[1], sys.argv[2]
    authors, items = load_items(export)
    os.makedirs(outdir, exist_ok=True)
    inv = {"types": Counter(), "posts_by_year": Counter(), "post_authors": Counter(),
           "categories": Counter(), "tags": Counter(), "shortcodes": defaultdict(Counter),
           "pages": [], "podcasts": 0, "menu": []}
    rows = []
    for it in items.values():
        inv["types"]["%s/%s" % (it["type"], it["status"])] += 1
        path = SITE_RE.sub("", it["link"])
        if it["type"] not in ("post", "page", "podcast") or it["status"] not in PUBLIC:
            continue
        for sc in set(re.findall(r"\[([a-z_][a-z0-9_-]+)[\s\]]", it["content"])):
            if sc.startswith(("et_pb", "x_", "cs_", "caption", "embed", "video", "ez-toc", "lmt", "pac_")):
                inv["shortcodes"][it["type"]][sc] += 1
        if it["type"] == "post":
            inv["posts_by_year"]["%s %s" % (it["date"][:4], it["status"])] += 1
            for a in author_keys(it, authors):
                inv["post_authors"][a] += 1
            for dom, name, _ in it["cats"]:
                inv["categories" if dom == "category" else "tags"][name] += 1
            m = re.match(r"^/(\d{4})/(\d{2})/(\d{2})/([^/]+)/$", path)
            new = path if m else ""
        elif it["type"] == "page":
            inv["pages"].append({"id": it["id"], "title": it["title"], "path": path,
                                 "modified": it["meta"].get("_wplmi_last_modified", it["modified"])[:10],
                                 "divi": "[et_pb_" in it["content"], "size": len(it["content"])})
            new = path
        else:
            inv["podcasts"] += 1
            new = ""
        rows.append((path, new, it["type"], it["status"], it["id"], it["title"]))
    inv["pages"].sort(key=lambda p: p["path"])
    with open(os.path.join(outdir, "inventory.json"), "w") as f:
        json.dump(inv, f, indent=1, default=dict)
    with open(os.path.join(outdir, "url-map-all.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["old_url", "new_url", "type", "wp_status", "wp_id", "title"])
        for r in sorted(rows):
            w.writerow(r)
    print("wrote", len(rows), "public URLs")


if __name__ == "__main__":
    main()
