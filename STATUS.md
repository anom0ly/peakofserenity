# Status

_Last updated 2026-10-24._ Current phase: **2. Full conversion** (in review).

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
- `.pages.yml` for News Posts, Guides (every tab is a labelled field), Authors and `static/img`, checked
  against the Pages CMS docs. Posts can't be renamed (it would change their URL); guides can be edited but not
  created, renamed or deleted from the editor.

### Full conversion (2026-10-22)
- Everything published is converted: 216 news posts, 215 podcast episodes, and 18 guide pages. The hub pages
  are React pages, and `/login/` and the 5 retired Mistweaver guides are redirects. Files edited in Pages CMS
  were left untouched (`--skip-existing`).
- Tabbed guides: Windwalker, Brewmaster and Mistweaver PvE, plus Mists Classic Windwalker. Their tab groups are
  defined once in `src/guideTypes.json`, which the site, the converter and `tools/pages_config.py` all read.
  `tools/pages_config.py` writes `.pages.yml`. In Pages CMS, each tabbed guide has its own entry under Guides,
  and the other guide pages are in one list.
- Talent import strings: every one found in the source (24 across guides and posts) appears verbatim in the output.
- Podcasts:
  - each episode is at `/podcast/<slug>/`, with an audio player;
  - `/podcast/` lists the episodes and `/podcast/archive/` is the one-page archive, linked from the footer;
  - `static/podcast/feed.xml` is an iTunes-style feed, and the old `/feed/podcast/...` addresses redirect to it.
- Tags keep their WordPress addresses (`blog/tags.yml`).
- `static/_redirects` gets generated rules for:
  - category archives → tag pages;
  - author archives → author pages;
  - every old `/df/`, `/sl/`, `/bfa/` or unprefixed guide link found in content → the current page or its
    nearest parent;
  - `/feed/` → `/rss.xml`.
- Images:
  - 329 of 386 referenced files were downloaded;
  - 65 return 404 on the live site too, and are listed in the review list;
  - `tools/compress_images.py` shrank them from 108 MB to 80 MB, and the one GIF over Cloudflare's 25 MiB
    limit was scaled down.
- The build passes. Its remaining broken-link warnings are all files missing on the live site, links to
  `archive`-status posts, or WordPress preview links. All of them are on the review list.

### QA fixes (2026-10-24)
QA compared the build with the live site (every sitemap URL, every built page). Fixed:
- Line breaks inside paragraphs (`<br>`) were dropped, so lists ran together on 179 pages. The converter now
  writes Markdown hard breaks (a `\` at the end of the line), and `<br />` inside table cells.
  Everything was re-converted except the two files already edited in Pages CMS
  (`docs/tww/windwalker/pve-guide.mdx`, `blog/2026-08-10-windwalker-monk-12-1-survival-guide.mdx`),
  which were patched by hand.
- Tags used only by podcast episodes redirect to `/podcast/tag/<tag>/`, and `/series/*` to the podcast archive.
- Links to full-size images no longer get a trailing slash (`src/theme/MDXComponents/A`).
- A YouTube, published Google Sheets chart, Twitch clip or .mp4 link on a line of its own, showing its own
  address, renders as a player (`src/plugins/remark-embeds.js`); the source stays a plain link.
- Spec hub pages have their welcome text back; podcast cards show the whole banner.
- Unknown `/df/`, `/sl/`, `/bfa/` addresses go to the spec hub (or the homepage) instead of a 404.

## In progress
- PR "QA fixes" open for review on a preview deploy.

## Next
- Owner: decide where podcast audio lives (see Open questions). Then check the review list, especially the
  `archive`-status posts that other posts link to.
- Spot-check the preview: the three new tabbed guides, a few old posts, the podcast archive, and redirects.

## Waiting on
- Nothing. Images come straight from the live site with `tools/fetch_images.py` (the uploads folder won't be
  provided); failures go on the review list.

## Decisions (2026-10-17)
- Podcasts: convert all 215 episodes, plus one archive page listing them.
- Posts with status `archive` (106, 2016–2018): left out for now.
- Old Mistweaver guides (`/tww/mistweaver/pve-guide-shadowlands/` and the four `advanced-*` spotlights): retire with 301 redirects.

## Open questions
- **Podcast audio.** The 215 MP3s are about 10 GB and stay on the WordPress server for now, so episode pages
  and the feed still link there. Cloudflare Pages can't host them (25 MiB per file). Options: Cloudflare R2
  (cheap, same account), an existing podcast host, or keep the old server's uploads folder online. 11 early
  episodes already point at walkingthewind.com and may be gone.
- From the brief: comments, AdSense, search, publish-directly vs review step.

## Content changed on WordPress after the 2026-10-17 export
- None noted yet.
