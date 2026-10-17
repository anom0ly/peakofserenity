# Peak of Serenity

Source for peakofserenity.com, moving from WordPress/Divi to Docusaurus (hosted on Cloudflare Pages,
edited with Pages CMS).

- `docs/` guides (one `.mdx` per guide; tab content lives in front-matter fields)
- `blog/` news posts (`YYYY-MM-DD-slug.mdx`) and `blog/authors.yml`
- `migration/` inventory, review list of things that didn't convert cleanly, and old → new URL maps
- `src/` site code: guide layout (`components/GuideTabs`, `guideTypes.js`), homepage, spec hubs, theme
- `static/img/uploads/` images, same paths as `wp-content/uploads/`
- `.pages.yml` the Pages CMS editor setup
- `tools/` the WordPress export converters
- `STATUS.md` where the migration stands

## Running the site

```sh
npm ci
npm start          # local preview at http://localhost:3000
npm run build      # what Cloudflare Pages runs; output in build/
```

## Re-running the conversion

```sh
python3 -m pip install beautifulsoup4 markdownify pyyaml
python3 -I tools/inventory.py path/to/export.xml migration
python3 -I tools/wp2mdx.py path/to/export.xml . --guides 21927 --posts 24597 23016 14196 14771 16469
python3 -I tools/fetch_images.py .   # downloads images from the live site; run after wp2mdx (it re-adds failures to the review list)
```
