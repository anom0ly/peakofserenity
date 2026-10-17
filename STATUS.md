# Status

_Last updated 2026-10-17._ Current phase: **1. Pilot**.

## Done
- Inventoried the WordPress export ([migration/INVENTORY.md](migration/INVENTORY.md)).
- Wrote the converter (`tools/wp2mdx.py`) and ran it on the pilot set: the Windwalker PvE guide (20 tabs → front-matter
  fields, all 9 talent strings verified verbatim) and 5 news posts chosen to cover Divi posts, classic-editor posts,
  captions, embeds, interactive widgets and co-authors.
- Every converted body and field compiles as MDX.
- Downloaded the pilot's images and the site banners/tiles from the live site into `static/img/uploads/`
  (33 files, 37 MB; one, `2018/07/MW-Header.png`, is a 404 on the live site too).
- Review list of what didn't convert cleanly: [migration/review-list.md](migration/review-list.md).

## In progress
- Nothing running.

## Next
- Docusaurus scaffold with branding, homepage spec tiles, top dropdown navbar (from the "TWW Main Menu"), Wowhead tooltip script.
- Guide layout component that renders the tab fields (see [migration/GUIDE-FORMAT.md](migration/GUIDE-FORMAT.md)).
- `.pages.yml` for News Posts, Guides, Authors and `static/img`.

## Waiting on
- Nothing. Images come straight from the live site with `tools/fetch_images.py` (the uploads folder won't be
  provided); failures go on the review list.

## Decisions (2026-10-17)
- Podcasts: convert all 215 episodes, plus one archive page listing them.
- Posts with status `archive` (106, 2016–2018): left out for now.
- Old Mistweaver guides (`/tww/mistweaver/pve-guide-shadowlands/` and the four `advanced-*` spotlights): retire with 301 redirects.

## Open questions
- Blog URLs: posts keep `/YYYY/MM/DD/slug/` via front-matter `slug`; the blog's own index page needs a home that doesn't clash with the homepage (to be settled in the scaffold).
- From the brief: comments, AdSense, search, publish-directly vs review step.

## Content changed on WordPress after the 2026-10-17 export
- None noted yet.
