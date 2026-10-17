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

- Docusaurus 3.10 site that builds clean (`npm run build`):
  - guides and posts keep their WordPress URLs; the news list is at `/news/`, tags at `/tag/<name>/`
  - guide layout renders the tab fields as tabs and adds their headings to the table of contents
  - dark Peak of Serenity theme (colours and Open Sans from the live Divi theme), logo, top dropdown navbar
    copied from the live "TWW Main Menu", homepage with Jari banner, spec tiles and Discord/Patreon/PayPal buttons,
    spec hub pages for /tww/windwalker/, /tww/brewmaster/, /tww/mistweaver/, /mop/windwalker/
  - Wowhead tooltip script site-wide, re-scanned after each page change
  - `static/_redirects` with the retired Mistweaver guides, /category/ pages and the old /df/ and /sl/ links
- `.pages.yml` for News Posts, Guides (every tab is a labelled field), Authors and `static/img`.

## In progress
- Nothing running.

## Next
- Owner: connect the repo to Cloudflare Pages (build `npm run build`, output `build`) and to Pages CMS, so the pilot
  can be previewed and 1–2 authors can test.
- In the author test, check what Pages CMS's rich-text editor saves into `.mdx` files (Markdown or HTML), and that
  talent strings and the coloured legend survive a save.
- Full conversion: remaining guides (each needs a guide type in `src/guideTypes.js` + `.pages.yml`), all posts,
  podcasts plus their archive page, generated redirects.
- Compress images before the full download (33 pilot images are 37 MB).

## Waiting on
- Nothing. Images come straight from the live site with `tools/fetch_images.py` (the uploads folder won't be
  provided); failures go on the review list.

## Decisions (2026-10-17)
- Podcasts: convert all 215 episodes, plus one archive page listing them.
- Posts with status `archive` (106, 2016–2018): left out for now.
- Old Mistweaver guides (`/tww/mistweaver/pve-guide-shadowlands/` and the four `advanced-*` spotlights): retire with 301 redirects.

## Open questions
- From the brief: comments, AdSense, search, publish-directly vs review step.

## Content changed on WordPress after the 2026-10-17 export
- None noted yet.
