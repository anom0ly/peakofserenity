# WordPress export inventory

Source: `peakofserenity.WordPress.2026-10-17.xml` (WordPress 7.1.3, exported 2026-10-17 01:07 UTC, 20.4 MB).
The export itself is not committed (it contains author email addresses); it lives in the project's shared
folder at `migration/source/`. Machine-readable counts: [`inventory.json`](inventory.json). Every public URL:
[`url-map-all.csv`](url-map-all.csv).

## What's in it

| Content | Public | Other |
|---|---|---|
| News posts | **216 published** (Jul 2016 – Aug 2026) | 106 with status `archive` (2016–2018), 20 drafts, 1 private, 30 trash |
| Pages | **31 published** | 3 drafts, 9 trash |
| Podcast episodes (`/podcast/slug/`) | **215** (Nov 2016 – May 2024) | — |
| Media library items | 1,052 attachments | files themselves need the `wp-content/uploads` folder |
| Divi library layouts, menus, global styles | not content | 36 layouts, 58 menu items, 2 style sets |

Published posts per year: 2016: 6 · 2017: 23 · 2018: 75 · 2019: 34 · 2020: 26 · 2021: 18 · 2022: 10 · 2023: 9 · 2024: 6 · 2025: 5 · 2026: 4.

**Authors:** 35 accounts, 25 with public posts. Babylonius wrote 181; then Garg 30, pandanaconda 20, Sinzhu 12,
abelito75 12, Anomoly 10, Emallson 10, Eliro 7, Celestiel 5, and 16 others with 1–4 each. Co-authors come from the
PublishPress Authors plugin (`ppma_authors_name`); the converter uses that list and falls back to the post's
WordPress user.

**Categories (34):** specs (Windwalker 213, Mistweaver 63, Brewmaster 29, General 31) plus patch numbers used as
categories (7.1.5 → 12.1; 8.0 is the biggest with 55). The converter splits them into `categories` and `patches`.
**Tags:** 115 defined, 57 used on public posts (Class Changes 88, Theorycrafting 80, Legion 61, Abilities 60, PTR 46…).

## Pages (31 published)

**Guides (22)**

| Spec | Path | Last updated | Notes |
|---|---|---|---|
| Windwalker | /tww/windwalker/pve-guide/ | 2026-10-12 | 20 tabs in 5 groups — **pilot** |
| Windwalker | /tww/windwalker/pve-guide/advanced-tricks/ | 2026-03-23 | |
| Windwalker | /tww/windwalker/pve-guide/class-tree-in-depth/ | 2026-03-24 | |
| Windwalker | /tww/windwalker/pve-guide/references/ | 2026-08-13 | 7 accordions |
| Windwalker | /tww/windwalker/pve-guide/sim101/ | 2026-03-02 | 13 accordions, code module |
| Windwalker | /tww/windwalker/pve-guide/leveling/ | 2023-07-28 | 6 accordions |
| Windwalker | /tww/windwalker/pve-guide/log-analysis/ (+ tools/, raid/, mythicplus/) | 2023-08-01 | 4 pages, code modules |
| Windwalker | /tww/windwalker/acronyms/ | 2026-03-05 | code module |
| Windwalker (Mists Classic) | /mop/windwalker/pve-guide/ | 2025-12-26 | 8 tabs |
| Brewmaster | /tww/brewmaster/pve-guide/ | 2026-08-25 | 6 tabs |
| Brewmaster | /tww/brewmaster/acronyms/ | 2026-08-11 | |
| Brewmaster | /pve-guide/ ("Brewmaster PvE Quick Guide") | 2022-06-10 | top-level path |
| Mistweaver | /tww/mistweaver/pve-guide/ | 2023-07-28 | 5 tabs |
| Mistweaver | /tww/mistweaver/pve-guide-shadowlands/ | 2023-05-25 | 2 tabs |
| Mistweaver | /tww/mistweaver/pve-guide/advanced-{rising-mist, soothing-mist, thunder-focus-tea, renewing-mist}/ | 2020–2021 | 4 pages |
| Mistweaver | /tww/mistweaver/acronyms/ | 2023-05-22 | |

**Hub pages (7):** `/` home, `/tww/`, `/tww/{windwalker,brewmaster,mistweaver}/`, `/mop/`, `/mop/windwalker/` — these
become the homepage spec tiles and section landing pages, not converted content.
**Other (2):** `/finding-a-guild/` (2017), `/login/` (Divi login module; not needed on a static site).

## Markup in use

- **Divi builder** on 24 of 31 pages and 44 posts: sections/rows/columns/text (wrappers, stripped), fullwidth images
  (spec banners), tabs (guides), accordions (references, sim101, leveling), buttons, dividers, sidebar widget areas
  (Patreon/PayPal/Discord buttons, rebuilt site-wide), code modules (raw HTML, flagged per page).
- **Plugins' shortcodes:** `[ez-toc]` (Easy TOC), `[lmt-site-modified-info]` (WP Last Modified Info; the real date is
  in `_wplmi_last_modified` and becomes `last_update`), `[pac_divi_table_of_contents]`.
- **Classic editor** for most posts (no `<p>` tags; the converter re-adds paragraphs like WordPress does), 14 `[caption]`,
  8 `[embed]` (YouTube), 3 `[video]`, and a few X/Cornerstone theme shortcodes (`x_columnize`, `x_accordion`, `cs_*`)
  on 2016–2017 posts. Only one post uses the block editor.
- **Wowhead links** everywhere (~15,000; www, ptr, bfa, legion, shadowlands subdomains). Many are pasted with
  Wowhead's own icon markup; the converter keeps the link and drops the pasted icon, since the tooltip script
  re-adds icons.
- **Talent import strings** are the link text of `wowhead.com/talent-calc` links. The converter checks every one
  appears verbatim in the output (9/9 in the pilot guide).
- **Navigation:** the live menu is "TWW Main Menu" (Home, Windwalker / Brewmaster / Mistweaver dropdowns with
  guides, advanced pages, log analysis and news, Discord, Support Peak → Patreon/PayPal). This is the source for
  the Docusaurus navbar. An older "BfA Main Menu" also exists, plus Merchandise (Teespring) and Podcast links.

## Needs a decision

1. **Podcasts (215 episodes)** aren't in the brief. Options: convert them as blog posts under `/podcast/slug/`,
   keep one archive page, or drop them with redirects to the podcast feed.
2. **`archive` status posts (106, 2016–2018).** This is a custom status, so they may not be public on the live
   site today. If they are hidden, they stay out of the migration; if they are visible, they convert like any post.
3. **Old Mistweaver guides:** `/tww/mistweaver/pve-guide-shadowlands/` and the four 2020–21 ability spotlights
   are still published. Convert as-is, or retire with redirects.
