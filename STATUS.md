# Status

_Last updated 2026-10-17._ Current phase: **1. Pilot**.

## Done
- Inventoried the WordPress export ([migration/INVENTORY.md](migration/INVENTORY.md)).
- Wrote the converter (`tools/wp2mdx.py`) and ran it on the pilot set: the Windwalker PvE guide (20 tabs → front-matter
  fields, all 9 talent strings verified verbatim) and 5 news posts chosen to cover Divi posts, classic-editor posts,
  captions, embeds, interactive widgets and co-authors.
- Every converted body and field compiles as MDX.
- Review list of what didn't convert cleanly: [migration/review-list.md](migration/review-list.md).

## In progress
- Nothing running.

## Next
- Docusaurus scaffold with branding, homepage spec tiles, top dropdown navbar (from the "TWW Main Menu"), Wowhead tooltip script.
- Guide layout component that renders the tab fields (see [migration/GUIDE-FORMAT.md](migration/GUIDE-FORMAT.md)).
- `.pages.yml` for News Posts, Guides, Authors and `static/img`.
- Copy images into `static/img/uploads/` once the uploads folder arrives (pilot needs 25: [migration/images-needed.txt](migration/images-needed.txt)).

## Waiting on
- `wp-content/uploads` folder from the owner.

## Open questions
- Podcasts (215 episodes): convert, archive page, or drop? See INVENTORY.md.
- Posts with status `archive` (106 from 2016–2018): are they visible on the live site today?
- Retire or keep the old Mistweaver guides (Shadowlands guide, 2020–21 spotlights)?
- Blog URLs: posts keep `/YYYY/MM/DD/slug/` via front-matter `slug`; the blog's own index page needs a home that doesn't clash with the homepage (to be settled in the scaffold).
- From the brief: comments, AdSense, search, publish-directly vs review step.

## Content changed on WordPress after the 2026-10-17 export
- None noted yet.
