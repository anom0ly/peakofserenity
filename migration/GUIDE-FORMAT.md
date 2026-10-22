# Guide file format

Each guide is one `.mdx` file in `docs/`, at the same path as its old URL
(`docs/tww/windwalker/pve-guide.mdx` → `/tww/windwalker/pve-guide/`); the `slug` in front matter sets the
address. The one exception is the 2022 Brewmaster quick guide at `/pve-guide/`, stored as
`docs/brewmaster-pve-quick-guide.mdx` so its file name doesn't clash with the tabbed guides in Pages CMS.

Four guides are tabbed: the Windwalker, Brewmaster and Mistweaver PvE guides and the Mists Classic
Windwalker guide. Every other guide page is plain Markdown front matter plus body (no tabs). The field
layout of the Windwalker guide is shown below; the others follow the same pattern with their own tab names
(see `src/guideTypes.json`).

Every Divi tab becomes its own front-matter field, so an author edits a tab as one text box in Pages CMS.
Each tab group has a `heading` (the section title above the tabs), an `intro` (the text between that title
and the tabs) and one field per tab:

```yaml
intro: |            # text at the top of the guide
builds:             # "Talent Builds"
  heading: Talent Builds
  intro: ...
  classtree / raid / mythicplus / delves / flowchart / omniumfolio
cooldowns:          # "Abilities"
  celestialconduit / fortifyingbrew / invokexuen / touchofdeath / touchofkarma / zenith
priority:
  singletarget:     # default_shadopan / default_conduit / advanced_shadopan / advanced_conduit
  aoe:              # shadopan / conduit
openers:            # shadopan / conduit
```

The body under the front matter holds the sections that were never tabbed (Ability Usage, Gearing,
Gems/Enchants, Voidcores, Miscellaneous, Macros, Changelog), as plain Markdown.

Field values are Markdown. Colour-coded text (the talent legend) uses coloured-square emoji (🟩 🟦 🟪 ⬜ 🟥)
instead of coloured HTML, because Pages CMS strips coloured text when an author saves. Tables whose cells hold
lists or images may stay as raw HTML. Everything else is plain Markdown.

The guide layout (`src/components/GuideTabs`, hooked in through `src/theme/DocItem/Content`) renders the
banner, `intro`, then each group's heading, intro and tabs in the order above, then the body. The group
headings are added to the table of contents (`src/theme/DocItem/TOC`). Tab labels and order come from
`src/guideTypes.json` (`guide_type: windwalker-pve`); `.pages.yml` is generated from the same file.
`last_update.date` is Docusaurus's own "Last updated" stamp.

Groups can also have an `outro` (text below the tabs; the Mists Classic guide uses it under its ability
priority tabs).

Adding another guide type: add an entry to `src/guideTypes.json` (tab groups, tab names and labels, and the
Divi module names the converter reads them from), then run `python3 -I tools/pages_config.py .` to give it
its own entry under Guides in Pages CMS.
