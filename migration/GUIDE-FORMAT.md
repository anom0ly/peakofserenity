# Guide file format

Each guide is one `.mdx` file in `docs/`, at the same path as its old URL
(`docs/tww/windwalker/pve-guide.mdx` → `/tww/windwalker/pve-guide/`).

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

Field values are Markdown. Two pieces of raw HTML are allowed inside tab fields: coloured text
(`<span style="color: #339966">…</span>`, used for the talent-colour legend) and tables whose cells hold lists
or images. Everything else is plain Markdown.

The guide layout (`src/components/GuideTabs`, hooked in through `src/theme/DocItem/Content`) renders the
banner, `intro`, then each group's heading, intro and tabs in the order above, then the body. The group
headings are added to the table of contents (`src/theme/DocItem/TOC`). Tab labels and order come from
`src/guideTypes.js` (`guide_type: windwalker-pve`); `.pages.yml` uses the same field names and labels.
`last_update.date` is Docusaurus's own "Last updated" stamp.

Adding another guide type: add an entry to `GUIDE_TAB_MAPS` in `tools/wp2mdx.py`, to `src/guideTypes.js`,
and a matching set of fields to the Guides collection in `.pages.yml`.
