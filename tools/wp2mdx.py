#!/usr/bin/env python3
"""Convert the Peak of Serenity WordPress (WXR) export into Docusaurus MDX.

Usage:
  python3 -I wp2mdx.py EXPORT.xml OUTDIR --posts ID [ID ...] --guides ID [ID ...]

Writes:
  OUTDIR/blog/YYYY-MM-DD-slug.mdx      news posts (plain Markdown body)
  OUTDIR/docs/<guide path>.mdx         guides (tab groups as front-matter fields)
  OUTDIR/blog/authors.yml              authors used by the converted posts/guides
  OUTDIR/migration/review-list.md                anything that did not convert cleanly
  OUTDIR/migration/url-map.csv                   old URL -> new URL for converted items
  OUTDIR/migration/images-needed.txt             wp-content/uploads files referenced

Requires: beautifulsoup4, markdownify, pyyaml.
"""
import argparse
import csv
import html
import os
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict

import yaml
from bs4 import BeautifulSoup, NavigableString, Tag
from markdownify import MarkdownConverter

NS = {
    "wp": "http://wordpress.org/export/1.2/",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "excerpt": "http://wordpress.org/export/1.2/excerpt/",
    "dc": "http://purl.org/dc/elements/1.1/",
}
SITE_RE = re.compile(r"^https?://(?:www\.)?peakofserenity\.com", re.I)
UPLOADS_RE = re.compile(r"^(?:https?://(?:www\.)?peakofserenity\.com)?/wp-content/uploads/", re.I)
IMG_BASE = "/img/uploads/"
TALENT_RE = re.compile(r"\b[A-Za-z0-9+/]{60,}\b")  # talent import strings

# Windwalker PvE guide: Divi tab group (admin_label) -> front-matter key, with
# each tab title -> field key.  The "intro" field holds the text module that
# sits above the tabs (minus its heading, which the layout renders).
GUIDE_TAB_MAPS = {
    "windwalker-pve": {
        "Talent Tabs": ("builds", "Talents Title", {
            "Class Tree": "classtree", "Raid": "raid", "Mythic+": "mythicplus",
            "Delves": "delves", "Flowchart": "flowchart", "Omnium Folio": "omniumfolio"}),
        "Cooldown Tabs": ("cooldowns", "Ability/Cooldown Text", {
            "Celestial Conduit": "celestialconduit", "Fortifying Brew": "fortifyingbrew",
            "Invoke Xuen": "invokexuen", "Touch of Death": "touchofdeath",
            "Touch of Karma": "touchofkarma", "Zenith": "zenith"}),
        "ST Priority Tabs": ("priority.singletarget", "ST/Ability Priority Text", {
            "Default SP": "default_shadopan", "Default Conduit": "default_conduit",
            "Advanced Shado-Pan": "advanced_shadopan", "Advanced Conduit": "advanced_conduit"}),
        "AOE Priority Tabs": ("priority.aoe", "AOE Priority Text", {
            "Shado-Pan": "shadopan", "Conduit of the Celestials": "conduit"}),
        "Opener Tabs": ("openers", "Openers Title", {
            "Shado-Pan": "shadopan", "Conduit of the Celestials": "conduit"}),
    },
}
GUIDE_TYPES = {"21927": "windwalker-pve"}


class Review:
    def __init__(self):
        self.items = defaultdict(list)

    def add(self, where, msg):
        if msg not in self.items[where]:
            self.items[where].append(msg)


REVIEW = Review()
IMAGES = set()
KNOWN_PATHS = set()   # published page/post paths, filled in main()
ATTACHMENTS = {}      # attachment page path -> file URL
ATTACHMENT_IDS = {}   # attachment post id -> file URL
# In-game macro conditionals look like shortcodes; never flag these
MACRO_WORDS = {"pet", "nopet", "combat", "nocombat", "mod", "nomod", "harm", "help", "exists",
               "dead", "nodead", "channeling", "nochanneling", "known", "flying", "mounted",
               "stealth", "group", "raid", "party", "spec", "form", "stance", "x"}


# ---------------------------------------------------------------- WXR parsing
def load_items(path):
    channel = ET.parse(path).getroot().find("channel")
    authors = {}
    for a in channel.findall("wp:author", NS):
        login = a.findtext("wp:author_login", namespaces=NS)
        authors[login] = a.findtext("wp:author_display_name", namespaces=NS) or login
    items = {}
    for it in channel.findall("item"):
        g = lambda k: it.findtext(k, namespaces=NS) or ""
        meta = {}
        for m in it.findall("wp:postmeta", NS):
            meta[m.findtext("wp:meta_key", namespaces=NS)] = m.findtext("wp:meta_value", namespaces=NS) or ""
        cats = [(c.get("domain"), c.text, c.get("nicename")) for c in it.findall("category")]
        items[g("wp:post_id")] = {
            "id": g("wp:post_id"), "title": html.unescape(g("title")), "link": g("link"),
            "type": g("wp:post_type"), "status": g("wp:status"), "date": g("wp:post_date"),
            "modified": g("wp:post_modified"), "slug": g("wp:post_name"), "parent": g("wp:post_parent"),
            "creator": g("dc:creator"), "content": g("content:encoded"),
            "excerpt": g("excerpt:encoded"), "meta": meta, "cats": cats,
        }
    return authors, items


def author_keys(item, authors):
    """PublishPress Authors (ppma_authors_name) lists co-authors; fall back to dc:creator."""
    names = [n.strip() for n in item["meta"].get("ppma_authors_name", "").split(",") if n.strip()]
    if not names:
        names = [authors.get(item["creator"], item["creator"])]
    return names


def author_key(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


# ------------------------------------------------------------ shortcode layer
def attr(s, name):
    m = re.search(r'\b%s="([^"]*)"' % re.escape(name), s)
    return html.unescape(m.group(1)) if m else ""


def wpautop(text):
    """Minimal port of WordPress wpautop for classic-editor posts without <p> tags."""
    if re.search(r"<p[\s>]", text) and "\n\n" not in text.strip():
        return text
    block = r"(?:table|thead|tfoot|caption|col|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|map|area|blockquote|address|math|style|p|h[1-6]|hr|fieldset|legend|section|article|aside|hgroup|header|footer|nav|figure|figcaption|details|menu|summary|iframe)"
    text = re.sub(r"(<%s[\s/>])" % block, r"\n\n\1", text)
    text = re.sub(r"(</%s>)" % block, r"\1\n\n", text)
    out = []
    for chunk in re.split(r"\n\s*\n", text):
        chunk = chunk.strip()
        if not chunk:
            continue
        if re.match(r"</?%s[\s/>]" % block, chunk):
            out.append(chunk)
        else:
            out.append("<p>" + re.sub(r"\s*\n\s*", "<br />\n", chunk) + "</p>")
    return "\n".join(out)


def expand_shortcodes(text, where):
    """Turn the shortcodes we understand into HTML, strip Divi wrappers, flag the rest."""
    # [caption ...]<img ...> Caption text[/caption]
    def caption(m):
        inner = m.group(2)
        img = re.search(r"(<a[^>]*>)?\s*<img[^>]*>\s*(</a>)?", inner)
        cap = re.sub(r"<[^>]+>", "", inner[img.end():] if img else inner).strip()
        return "<figure>%s<figcaption>%s</figcaption></figure>" % (img.group(0) if img else "", cap)
    text = re.sub(r"\[caption([^\]]*)\](.*?)\[/caption\]", caption, text, flags=re.S)

    # [embed]url[/embed] and bare video shortcodes -> link (flagged)
    def embed(m):
        url = m.group(1).strip()
        REVIEW.add(where, "Embedded video/media converted to a plain link: %s" % url)
        return '<p><a href="%s">%s</a></p>' % (url, url)
    text = re.sub(r"\[embed[^\]]*\](.*?)\[/embed\]", embed, text, flags=re.S)

    # Divi modules that carry content in attributes
    def image(m):
        src = attr(m.group(0), "src")
        url = attr(m.group(0), "url")
        alt = attr(m.group(0), "alt") or attr(m.group(0), "title_text")
        tag = '<img src="%s" alt="%s" />' % (src, html.escape(alt))
        return ('<p><a href="%s">%s</a></p>' % (url, tag)) if url else "<p>%s</p>" % tag
    text = re.sub(r"\[et_pb_(?:fullwidth_)?image\b[^\]]*\](?:\[/et_pb_(?:fullwidth_)?image\])?", image, text)

    def button(m):
        url, label = attr(m.group(0), "button_url"), attr(m.group(0), "button_text")
        return '<p><a href="%s"><strong>%s</strong></a></p>' % (url, label) if url else ""
    text = re.sub(r"\[et_pb_button\b[^\]]*\](?:\[/et_pb_button\])?", button, text)

    # Things that are rebuilt site-wide or not needed
    text = re.sub(r"\[et_pb_(?:fullwidth_post_title|post_title|sidebar|divider|login)\b[^\]]*\](?:\[/et_pb_\w+\])?", "", text)
    text = re.sub(r"<p[^>]*>[^<]*\[lmt-[^\]]*\][^<]*</p>", "", text)  # "Last Updated on [...]" line
    text = re.sub(r"\[(?:ez-toc|lmt-[a-z-]+|et_pb_line_break_holder)[^\]]*\](?:\[/[^\]]*\])?", "", text)

    # Divi code modules hold raw HTML/JS: keep content out, flag for review
    def code(m):
        REVIEW.add(where, "Divi code module (raw HTML/script) was removed; check what it showed: %s"
                   % re.sub(r"\s+", " ", m.group(1))[:120])
        return ""
    text = re.sub(r"\[et_pb_(?:fullwidth_)?code\b[^\]]*\](.*?)\[/et_pb_(?:fullwidth_)?code\]", code, text, flags=re.S)

    # Divi tabs inside a news post -> headings (posts stay plain Markdown)
    if "[et_pb_tab " in text and where.startswith("post"):
        REVIEW.add(where, "Divi tabs in a news post were flattened into headings")
        text = re.sub(r'\[et_pb_tab\b[^\]]*title="([^"]*)"[^\]]*\]', r"<h3>\1</h3>", text)

    # Accordions/toggles: keep each item's title as a heading (content stays expanded)
    if re.search(r"\[et_pb_(?:accordion_item|toggle)\b", text):
        REVIEW.add(where, "Divi accordion/toggle items became headings with their content always visible")
        text = re.sub(r'\[et_pb_(?:accordion_item|toggle)\b[^\]]*title="([^"]*)"[^\]]*\]', r"<h3>\1</h3>", text)

    # Layout wrappers
    text = re.sub(r"\[/?et_pb_[a-z_]+\b[^\]]*\]", "", text)
    # Leftover shortcodes from older themes (X/Cornerstone) - strip wrappers, flag
    for name in sorted(set(re.findall(r"\[/?((?:x|cs)_[a-z_]+)", text))):
        REVIEW.add(where, "Old theme shortcode [%s] stripped; layout (columns/accordions) lost" % name)
    text = re.sub(r"\[/?(?:x|cs)_[a-z_]+\b[^\]]*\]", "", text)
    return text


# ------------------------------------------------------------- HTML cleanup
def rewrite_url(url, where):
    if not url:
        return url
    url = url.strip()
    if UPLOADS_RE.match(url):
        rel = UPLOADS_RE.sub("", url).split("?")[0]
        IMAGES.add(rel)
        return IMG_BASE + rel
    if SITE_RE.match(url):
        path = SITE_RE.sub("", url) or "/"
        if "?" in path or path.startswith("/wp-"):
            REVIEW.add(where, "Internal link with a WordPress-only URL: %s" % url)
        bare = path.split("#")[0]
        norm = bare if bare.endswith("/") else bare + "/"
        if norm in ATTACHMENTS:
            return rewrite_url(ATTACHMENTS[norm], where)
        if bare and not bare.startswith("/wp-") and norm not in KNOWN_PATHS and \
                not re.search(r"\.\w{2,4}$", bare):
            REVIEW.add(where, "Internal link to a path with no published page (needs a redirect or a fix): %s" % path)
        return path
    return url


def clean_html(raw, where, keep_colors=False):
    soup = BeautifulSoup(raw, "html.parser")

    for t in soup(["script", "style", "noscript"]):
        REVIEW.add(where, "Removed inline <%s> block: an interactive widget or custom styling "
                   "here needs rebuilding as a React component" % t.name)
        t.decompose()
    for t in soup.find_all("iframe"):
        src = t.get("src", "")
        REVIEW.add(where, "Embedded iframe converted to a link: %s" % src)
        p = soup.new_tag("p")
        a = soup.new_tag("a", href=src)
        a.string = src
        p.append(a)
        t.replace_with(p)

    # Wowhead "iconized" links: drop the pasted icon <img>/<span>, the tooltip
    # script re-adds icons site-wide (iconizeLinks).
    for a in soup.find_all("a", href=True):
        if "wowhead.com" in a["href"]:
            for img in a.find_all("img"):
                if "zamimg.com" in img.get("src", ""):
                    img.decompose()
            for sp in a.find_all("span", class_="tinyicontxt"):
                sp.unwrap()
        a["href"] = rewrite_url(a["href"], where)

    for img in soup.find_all("img"):
        src = img.get("src", "")
        if "zamimg.com" in src:
            img.decompose()  # stray Wowhead icon outside a link
            continue
        img["src"] = rewrite_url(src, where)
        if not img["src"].startswith(IMG_BASE):
            REVIEW.add(where, "Image hosted elsewhere (not in uploads): %s" % src)

    # In-game macros live in blockquotes with <br> line breaks -> code blocks
    for bq in soup.find_all("blockquote"):
        txt = bq.get_text("\n")
        if re.search(r"^\s*(#showtooltip|/cast|/use|/stopcast)", txt, re.M):
            for br in bq.find_all("br"):
                br.replace_with("\n")
            pre = soup.new_tag("pre")
            code = soup.new_tag("code")
            code.string = "\n".join(l.strip() for l in bq.get_text().strip().splitlines())
            pre.append(code)
            bq.replace_with(pre)

    # Single-row tables are Divi layout tables (text beside an image): flatten
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) == 1:
            frag = []
            for td in rows[0].find_all(["td", "th"]):
                frag.extend(list(td.contents))
            REVIEW.add(where, "One-row layout table flattened (side-by-side layout becomes stacked)")
            for node in frag:
                table.insert_before(node)
            table.decompose()
        elif table.find(["ul", "ol", "img", "table", "h1", "h2", "h3", "h4", "h5", "h6"]) or \
                any(len(td.find_all("p")) > 1 for td in table.find_all("td")):
            REVIEW.add(where, "Table with lists/images/paragraphs inside cells kept as HTML; check rendering")
            table["data-keep"] = "1"

    # Nested <strong><strong>..</strong></strong> breaks Markdown bold
    for s in soup.find_all(["strong", "b"]):
        if s.find_parent(["strong", "b"]):
            s.unwrap()

    # Bracketed words outside code that look like leftover shortcodes
    for node in soup.find_all(string=True):
        if node.parent and node.parent.name in ("code", "pre"):
            continue
        for name in re.findall(r"\[/?([a-z_][a-z0-9_-]+)(?:[\s:\]])", str(node)):
            if name not in MACRO_WORDS and not re.search(r"(?:^|\n)\s*/\w+[^\n]*\[" + re.escape(name), str(node)):
                REVIEW.add(where, "Unrecognised shortcode or bracketed text [%s] left in place" % name)

    # Move edge whitespace out of inline tags ("<strong>does </strong>x" -> "**does** x")
    for el in soup.find_all(["strong", "b", "em", "i", "del", "ins"]):
        last = el.contents[-1] if el.contents else None
        if isinstance(last, NavigableString) and last != last.rstrip():
            last.replace_with(NavigableString(last.rstrip()))
            el.insert_after(NavigableString(" "))
        first = el.contents[0] if el.contents else None
        if isinstance(first, NavigableString) and first != first.lstrip():
            first.replace_with(NavigableString(first.lstrip()))
            el.insert_before(NavigableString(" "))

    # Headings: drop <strong> wrappers inside them
    for h in soup.find_all(re.compile(r"^h[1-6]$")):
        for s in h.find_all(["strong", "b"]):
            s.unwrap()

    # Coloured text: keep in guide tab fields (rendered with raw HTML), drop elsewhere
    colours = 0
    for sp in soup.find_all("span"):
        m = re.search(r"color:\s*(#[0-9a-fA-F]{3,6}|[a-z]+)", sp.get("style", ""))
        if m and keep_colors:
            sp.attrs = {"style": "color: %s" % m.group(1)}
            sp["data-keep"] = "1"
        else:
            if m:
                colours += 1
            sp.unwrap()
    if colours:
        REVIEW.add(where, "%d coloured text span(s) lost their colour" % colours)

    # Text-level escaping for MDX ({ } and stray <)
    for node in soup.find_all(string=True):
        if node.parent and node.parent.name in ("code", "pre"):
            continue
        new = str(node).replace("{", "\\{").replace("}", "\\}").replace("<", "&lt;")
        if new != str(node):
            node.replace_with(NavigableString(new))
    return soup


class MdConverter(MarkdownConverter):
    def convert_table(self, el, text, *args, **kw):
        if el.get("data-keep"):
            return "\n\n" + strip_attrs_html(el) + "\n\n"
        return super().convert_table(el, text, *args, **kw)

    def convert_span(self, el, text, *args, **kw):
        if el.get("data-keep"):
            return '<span style="%s">%s</span>' % (el["style"], text)
        return text

    def convert_figure(self, el, text, *args, **kw):
        return "\n\n" + text.strip() + "\n\n"

    def convert_figcaption(self, el, text, *args, **kw):
        return "\n\n*%s*\n\n" % text.strip() if text.strip() else ""


def strip_attrs_html(el):
    """Serialise a kept HTML table without Divi styling attributes."""
    el = BeautifulSoup(str(el), "html.parser")
    for t in el.find_all(True):
        keep = {k: v for k, v in t.attrs.items() if k in ("href", "src", "alt", "colspan", "rowspan")}
        t.attrs = keep
    return re.sub(r"\n\s*\n", "\n", str(el))


def to_markdown(raw, where, keep_colors=False, shift_h1=True):
    raw = expand_shortcodes(raw, where)
    raw = wpautop(raw)
    soup = clean_html(raw, where, keep_colors=keep_colors)
    if shift_h1 and soup.find("h1"):
        for h in soup.find_all(re.compile(r"^h[1-6]$")):
            h.name = "h%d" % min(int(h.name[1]) + 1, 6)
    md = MdConverter(heading_style="ATX", bullets="-", escape_misc=False,
                     escape_underscores=False, wrap=False, autolinks=False).convert_soup(soup)
    md = md.replace(" ", " ")
    md = re.sub(r"[ \t]+\n", "\n", md)
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    return md


# ------------------------------------------------------------------ guides
def divi_modules(content):
    """Return Divi modules in document order: (kind, label, title, inner_html)."""
    out = []
    for m in re.finditer(r"\[(et_pb_text|et_pb_tabs|et_pb_tab|et_pb_button)\b([^\]]*)\]", content):
        kind, attrs = m.group(1), m.group(2)
        end = content.find("[/%s]" % kind, m.end()) if kind != "et_pb_button" else m.end()
        inner = content[m.end():end] if end >= 0 else ""
        if kind == "et_pb_button":
            inner = m.group(0)
        out.append((kind, attr(attrs, "admin_label"), attr(attrs, "title"), inner, m.start()))
    return out


def convert_guide(item, gtype, authors):
    where = "guide %s %s" % (item["id"], item["link"])
    tabmap = GUIDE_TAB_MAPS[gtype]
    intro_labels = {v[1]: k for k, v in tabmap.items()}
    mods = divi_modules(item["content"])
    fm_groups, body, intro = {}, [], None
    current_group = None
    for kind, label, title, inner, _ in mods:
        if kind == "et_pb_tabs":
            if label not in tabmap:
                REVIEW.add(where, "Tab group '%s' has no field mapping; flattened into body" % label)
                current_group = None
                continue
            current_group = tabmap[label]
        elif kind == "et_pb_tab":
            if current_group is None:
                body.append("## " + title + "\n\n" + to_markdown(inner, where))
                continue
            key, _, tabs = current_group
            if title not in tabs:
                REVIEW.add(where, "Tab '%s' in group '%s' has no field mapping" % (title, key))
                continue
            set_path(fm_groups, key + "." + tabs[title], to_markdown(inner, where, keep_colors=True, shift_h1=False))
        elif kind == "et_pb_text" and label in intro_labels:
            key = tabmap[intro_labels[label]][0]
            md = to_markdown(inner, where, keep_colors=True, shift_h1=False)
            heading = re.match(r"^#{1,6}\s+(.+?)\n", md + "\n")
            md = re.sub(r"^#{1,6}\s+.+?(\n|$)", "", md, count=1).strip()
            set_path(fm_groups, key + ".heading", heading.group(1).strip("* ") if heading else "")
            set_path(fm_groups, key + ".intro", md)
            current_group = None
        elif kind == "et_pb_text":
            current_group = None
            md = to_markdown(inner, where, shift_h1=False)
            if intro is None:
                intro = md
            elif md:
                body.append(md)
        elif kind == "et_pb_button":
            body.append(to_markdown(inner, where))
    if "[pac_divi_table_of_contents" in item["content"]:
        REVIEW.add(where, "Divi table-of-contents module dropped (Docusaurus builds its own TOC)")

    last = item["meta"].get("_wplmi_last_modified", item["modified"])[:10]
    path = SITE_RE.sub("", item["link"]).rstrip("/") or "/"
    fm = {
        "title": item["title"],
        "slug": path,
        "authors": [author_key(a) for a in author_keys(item, authors)],
        "last_update": {"date": last},  # Docusaurus native "Last updated" stamp
        "description": "",
        "wp_id": int(item["id"]),
        "original_url": item["link"],
        "guide_type": gtype,
        "intro": intro or "",
    }
    fm.update(fm_groups)
    REVIEW.add(where, "description is empty; WordPress had no excerpt/SEO description to copy")
    return path.lstrip("/") + ".mdx", fm, "\n\n".join(b for b in body if b)


def set_path(d, dotted, value):
    keys = dotted.split(".")
    for k in keys[:-1]:
        d = d.setdefault(k, {})
    d[keys[-1]] = value


# ------------------------------------------------------------------ posts
def convert_post(item, authors):
    where = "post %s %s" % (item["id"], item["link"])
    md = to_markdown(item["content"], where)
    # Divi posts often repeat the title as the first heading
    first = re.match(r"^#{1,6}\s+(.+?)\n", md + "\n")
    if first and first.group(1).strip("* ").lower() == item["title"].strip().lower():
        md = md[first.end():].lstrip()
    date = item["date"][:10]
    y, m, d = date.split("-")
    cats = [c[1] for c in item["cats"] if c[0] == "category"]
    tags = [c[1] for c in item["cats"] if c[0] == "post_tag"]
    patches = [c for c in cats if re.match(r"^\d+(\.\d+)+$", c)]
    specs = [c for c in cats if c not in patches]
    desc = re.sub(r"<[^>]+>", "", item["excerpt"]).strip()
    if not desc:
        plain = re.sub(r"[#*_>\[\]()`]|https?://\S+", "", md)
        desc = re.sub(r"\s+", " ", plain).strip()[:157].rsplit(" ", 1)[0] + "…"
    fm = {
        "title": item["title"],
        "slug": "/%s/%s/%s/%s" % (y, m, d, item["slug"]),
        "date": item["date"].replace(" ", "T"),
        "authors": [author_key(a) for a in author_keys(item, authors)],
        "categories": specs,
        "patches": patches,
        "tags": tags,
        "description": desc,
        "wp_id": int(item["id"]),
        "original_url": item["link"],
    }
    thumb = ATTACHMENT_IDS.get(item["meta"].get("_thumbnail_id", ""))
    if thumb:
        fm["image"] = rewrite_url(thumb, where)
    return "%s-%s.mdx" % (date, item["slug"]), fm, md


# ------------------------------------------------------------------ output
class Literal(str):
    pass


def _literal(dumper, s):
    return dumper.represent_scalar("tag:yaml.org,2002:str", s, style="|")


yaml.add_representer(Literal, _literal)


def literalise(v):
    if isinstance(v, dict):
        return {k: literalise(x) for k, x in v.items()}
    if isinstance(v, list):
        return [literalise(x) for x in v]
    if isinstance(v, str) and "\n" in v:
        return Literal(v.rstrip() + "\n")
    return v


def write_mdx(path, fm, body):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    head = yaml.dump(literalise(fm), sort_keys=False, allow_unicode=True, width=10**9)
    with open(path, "w") as f:
        f.write("---\n%s---\n\n%s\n" % (head, body))


def check_talent_strings(item, files_text, where):
    src = BeautifulSoup(item["content"], "html.parser").get_text(" ")
    missing = [s for s in set(TALENT_RE.findall(src)) if s not in files_text]
    for s in missing:
        REVIEW.add(where, "TALENT STRING NOT FOUND VERBATIM IN OUTPUT: %s" % s)
    return len(set(TALENT_RE.findall(src))), len(missing)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("export")
    ap.add_argument("outdir")
    ap.add_argument("--posts", nargs="*", default=[])
    ap.add_argument("--guides", nargs="*", default=[])
    a = ap.parse_args()
    authors, items = load_items(a.export)
    for it in items.values():
        path = SITE_RE.sub("", it["link"])
        if it["type"] in ("page", "post", "podcast") and it["status"] in ("publish", "archive"):
            KNOWN_PATHS.add(path if path.endswith("/") else path + "/")
        if it["type"] == "attachment":
            url = it["meta"].get("_wp_attached_file")
            if url:
                ATTACHMENTS[path if path.endswith("/") else path + "/"] = "/wp-content/uploads/" + url
                ATTACHMENT_IDS[it["id"]] = "/wp-content/uploads/" + url
    used_authors, urlmap = set(), []
    os.makedirs(os.path.join(a.outdir, "migration"), exist_ok=True)

    for pid in a.guides:
        it = items[pid]
        rel, fm, body = convert_guide(it, GUIDE_TYPES[pid], authors)
        out = os.path.join(a.outdir, "docs", rel)
        write_mdx(out, fm, body)
        n, miss = check_talent_strings(it, open(out).read(), "guide %s %s" % (pid, it["link"]))
        print("guide", pid, "->", out, "| talent strings: %d found, %d missing" % (n, miss))
        used_authors.update(author_keys(it, authors))
        urlmap.append((SITE_RE.sub("", it["link"]), fm["slug"] + "/", "guide", pid))

    for pid in a.posts:
        it = items[pid]
        name, fm, body = convert_post(it, authors)
        out = os.path.join(a.outdir, "blog", name)
        write_mdx(out, fm, body)
        check_talent_strings(it, open(out).read(), "post %s %s" % (pid, it["link"]))
        print("post", pid, "->", out)
        used_authors.update(author_keys(it, authors))
        urlmap.append((SITE_RE.sub("", it["link"]), fm["slug"] + "/", "post", pid))

    authors_yml = {author_key(n): {"name": n, "page": True} for n in sorted(used_authors, key=str.lower)}
    with open(os.path.join(a.outdir, "blog", "authors.yml"), "w") as f:
        yaml.dump(authors_yml, f, sort_keys=False, allow_unicode=True)

    with open(os.path.join(a.outdir, "migration", "url-map.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["old_url", "new_url", "type", "wp_id", "changed"])
        for old, new, t, pid in urlmap:
            w.writerow([old, new, t, pid, "no" if old == new else "YES"])

    with open(os.path.join(a.outdir, "migration", "images-needed.txt"), "w") as f:
        f.write("\n".join(sorted(IMAGES)) + "\n")

    with open(os.path.join(a.outdir, "migration", "review-list.md"), "w") as f:
        f.write("# Conversion review list\n\nGenerated by tools/wp2mdx.py. Each item needs a human look; "
                "nothing here was guessed.\n")
        for where in sorted(REVIEW.items):
            f.write("\n## %s\n\n" % where)
            for msg in REVIEW.items[where]:
                f.write("- %s\n" % msg)
    print("images referenced:", len(IMAGES), "| review items:", sum(len(v) for v in REVIEW.items.values()))


if __name__ == "__main__":
    sys.exit(main())
