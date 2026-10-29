#!/usr/bin/env python3
"""Convert the Peak of Serenity WordPress (WXR) export into Docusaurus MDX.

Usage:
  python3 -I wp2mdx.py EXPORT.xml OUTDIR --all [--skip-existing]
  python3 -I wp2mdx.py EXPORT.xml OUTDIR --posts ID [ID ...] --guides ID [ID ...] --podcasts ID [ID ...]

--all converts every published post, podcast episode and guide page (minus RETIRED and the hub pages, which
are rebuilt as React pages), plus the news posts with WordPress status `archive` as drafts (`draft: true`: kept
in the repo and editable in Pages CMS, left out of the live site until someone turns Draft off). --skip-existing leaves files that are already there alone, so pages authors
have edited in Pages CMS are never overwritten (their review-list entries are still written).

Writes:
  OUTDIR/blog/YYYY-MM-DD-slug.mdx      news posts (plain Markdown body)
  OUTDIR/podcast/YYYY-MM-DD-slug.mdx   podcast episodes (audio link in front matter)
  OUTDIR/docs/<guide path>.mdx         guides (tabbed guides keep tab groups as front-matter fields)
  OUTDIR/blog/authors.yml              authors used by the converted posts/guides
  OUTDIR/migration/review-list.md                anything that did not convert cleanly
  OUTDIR/migration/url-map.csv                   old URL -> new URL for converted items
  OUTDIR/migration/images-needed.txt             wp-content/uploads files referenced

Requires: beautifulsoup4, markdownify, pyyaml.
"""
import argparse
import csv
import html
import json
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
# Podcast MP3s live in the R2 bucket "podcasts" under their WordPress paths. The earliest episodes were linked from
# walkingthewind.com (no longer online); their files are on peakofserenity.com under 2017/03/, one under a new name.
MEDIA_BASE = "https://media.peakofserenity.com/wp-content/uploads/"
WTW_AUDIO_RE = re.compile(r"^https?://(?:www\.)?walkingthewind\.com/wp-content/uploads/\d{4}/\d{2}/", re.I)
WTW_RENAMED = {"Ep-7-Trinket-Changes-and-Best-in-Slots.mp3": "Ep-8-Trinket-Changes-and-Best-in-Slots.mp3"}
MISSING_AUDIO = {"2017/06/Ep-15-Babs-on-Tomb-and-Current-State-of-WW.mp3"}  # gone before the move, not in R2
TALENT_RE = re.compile(r"\b[A-Za-z0-9+/]{60,}\b")  # talent import strings

# Tabbed guides: src/guideTypes.json lists each guide type's tab groups (front-matter key, the Divi text module
# above the tabs, the Divi tabs module, optional text module below them) and its tabs.  The site and
# tools/pages_config.py read the same file.
GUIDE_TYPES_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "guideTypes.json")
with open(GUIDE_TYPES_JSON) as _f:
    GUIDE_TYPE_DEFS = json.load(_f)
GUIDE_TYPES = {d["wp_id"]: name for name, d in GUIDE_TYPE_DEFS.items()}

# Pages that are not converted: hub pages (rebuilt in src/pages), the login page, and the retired
# Mistweaver guides (301 redirects in static/_redirects).
HUB_PAGES = {"10409", "21897", "21916", "21899", "21918", "24087", "24105"}
RETIRED = {"21938", "17878", "17814", "17867", "17872"}
SKIPPED = {"4999"}  # /login/ (Divi login module): redirects to the homepage
# Guide files whose name would clash with the tabbed guides' file name in the Pages CMS exclude list
GUIDE_FILE_OVERRIDES = {"/pve-guide": "brewmaster-pve-quick-guide.mdx"}
# Path prefixes that resolve through generated pages or redirects
ROUTED_PREFIXES = ("/category/", "/tag/", "/author/", "/podcast/", "/feed/", "/news/")


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
CATEGORY_TAG = {}     # WordPress category nicename -> tag page path, filled in main()
OLD_LINKS = {}        # old-expansion path linked from content -> new path (written to static/_redirects)
RETIRED_PATHS = set()  # retired guides' paths, filled in main()
RETIRED_TARGET = "/tww/mistweaver/pve-guide/"
# In-game macro conditionals look like shortcodes; never flag these
MACRO_WORDS = {"pet", "nopet", "combat", "nocombat", "mod", "nomod", "harm", "help", "exists",
               "dead", "nodead", "channeling", "nochanneling", "known", "flying", "mounted",
               "stealth", "group", "raid", "party", "spec", "form", "stance", "x",
               # bracketed words in quoted tooltip text
               "heal", "attack", "assault", "or"}


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
    names = [authors.get(n, n) for n in names]  # some list the login (seiryoku1) instead of the display name
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
            if re.match(r"<t[dh][\s>]", chunk):  # a line break inside a table cell, as WordPress shows it
                chunk = re.sub(r"(?<!>)[ \t]*\r?\n\s*(?!</?%s[\s/>])" % block, "<br />\n", chunk)
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

    def video(m):
        url = attr(m.group(0), "mp4") or attr(m.group(0), "src") or attr(m.group(0), "webm")
        REVIEW.add(where, "Video converted to a plain link: %s" % url)
        return '<p><a href="%s">%s</a></p>' % (url, "Video: " + url.rsplit("/", 1)[-1]) if url else ""
    text = re.sub(r"\[(?:video|iframe)\b[^\]]*\](?:\[/(?:video|iframe)\])?", video, text)

    # Old theme "learn more" toggles become collapsible "▸" headings (src/plugins/remark-collapsible.js);
    # [tabs] titles become plain headings, content always visible
    if "[tabcontainer]" in text:
        REVIEW.add(where, "Old theme tabs became headings with their content always visible")
    text = re.sub(r'\[learn_more\b[^\]]*caption="([^"]*)"[^\]]*\]', r"<h4>▸ \1</h4>", text)
    text = re.sub(r"\[/learn_more\]", "", text)
    for tabs in re.findall(r"\[tabs\b.*?\[/tabs\]", text, flags=re.S):
        titles = re.findall(r"\[tabtext\](.*?)\[/tabtext\]", tabs, flags=re.S)
        new = re.sub(r"\[tabcontainer\].*?\[/tabcontainer\]", "", tabs, flags=re.S)
        new = re.sub(r"\[tab\]", lambda m: "<h3>%s</h3>" % (titles.pop(0) if titles else ""), new)
        new = re.sub(r"\[/?(?:tabs|tab|tabcontent)\b[^\]]*\]", "", new)
        text = text.replace(tabs, new)

    # Divi modules that carry content in attributes
    def image(m):
        src = attr(m.group(0), "src")
        if not src:
            return ""
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
    text = re.sub(r"\[(?:ez-toc|lmt-[a-z-]+|et_pb_line_break_holder|pac_divi_table_of_contents)[^\]]*\](?:\[/[^\]]*\])?", "", text)

    # Divi code modules hold raw HTML/JS: keep content out, flag for review
    def code(m):
        yt = re.fullmatch(r"\s*(?:<p>)?\s*\[youtube\s+(https?://\S+?)(?:[?&]si=[^\s\]]*)?(?:&amp;[^\s\]]*)?\s*\]\s*(?:</p>)?\s*", m.group(1))
        if yt:  # Jetpack [youtube url] -> a bare link on its own line, which the site renders as a player
            url = yt.group(1)
            return '<p><a href="%s">%s</a></p>' % (url, url)
        REVIEW.add(where, "Divi code module (raw HTML/script) was removed; check what it showed: %s"
                   % re.sub(r"\s+", " ", m.group(1))[:120])
        return ""
    text = re.sub(r"\[et_pb_(?:fullwidth_)?code\b[^\]]*\](.*?)\[/et_pb_(?:fullwidth_)?code\]", code, text, flags=re.S)

    # Divi tabs inside a news post -> headings (posts stay plain Markdown)
    if "[et_pb_tab " in text and where.startswith("post"):
        REVIEW.add(where, "Divi tabs in a news post were flattened into headings")
        text = re.sub(r'\[et_pb_tab\b[^\]]*title="([^"]*)"[^\]]*\]', r"<h3>\1</h3>", text)

    # Accordions/toggles: each item's title becomes a collapsible "▸" heading (src/plugins/remark-collapsible.js)
    text = re.sub(r'\[et_pb_(?:accordion_item|toggle)\b[^\]]*title="([^"]*)"[^\]]*\]', r"<h3>▸ \1</h3>", text)

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
        if norm in RETIRED_PATHS:
            return RETIRED_TARGET
        m = re.match(r"^/category/([^/]+)/", norm)
        if m and m.group(1) in CATEGORY_TAG:
            return CATEGORY_TAG[m.group(1)]
        if norm.startswith("/feed/podcast/"):
            return "/podcast/"
        if "#" in path and norm in KNOWN_PATHS:
            # WordPress heading anchors (#Priority_Lists) -> Docusaurus heading ids (#priority-lists)
            frag = re.sub(r"[^a-z0-9]+", "-", path.split("#", 1)[1].lower()).strip("-")
            return bare + "#" + frag
        if norm not in KNOWN_PATHS and not bare.startswith(ROUTED_PREFIXES):
            target, exact = resolve_old(norm)
            if target:
                OLD_LINKS[norm] = target
                if not exact:
                    REVIEW.add(where, "Link to %s (no longer exists) now goes to %s" % (bare, target))
                return target + (path[len(bare):] if exact else "")
        if bare and not bare.startswith(("/wp-",) + ROUTED_PREFIXES) and norm not in KNOWN_PATHS and \
                not re.search(r"\.\w{2,4}$", bare):
            REVIEW.add(where, "Internal link to a path with no published page (needs a redirect or a fix): %s" % path)
        return path
    return url


def resolve_old(norm):
    """Old expansion paths (/df/, /sl/, /bfa/ or none) -> the /tww/ page, or its nearest existing parent."""
    m = re.match(r"^/(?:(?:df|sl|bfa|legion)/)?((?:windwalker|brewmaster|mistweaver)/.*)$", norm)
    if not m:
        return None, False
    parts = ("/tww/" + m.group(1)).rstrip("/").split("/")
    for n in range(len(parts), 2, -1):
        cand = "/".join(parts[:n]) + "/"
        if cand in RETIRED_PATHS:
            return RETIRED_TARGET, False
        if cand in KNOWN_PATHS:
            return cand, n == len(parts)
    return None, False


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
            # Pages CMS strips coloured HTML on save, so colour-coded text gets a coloured emoji instead
            sp.insert_before(NavigableString(colour_emoji(m.group(1)) + " "))
            sp.unwrap()
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

    def convert_br(self, el, text, *args, **kw):
        # A Markdown table cell is one line, so a line break inside it stays an HTML <br />
        if el.find_parent(["td", "th"]):
            return "<br />"
        return super().convert_br(el, text, *args, **kw)

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


EMOJI_SQUARES = {"🟥": (255, 0, 0), "🟧": (255, 140, 0), "🟨": (255, 220, 0), "🟩": (0, 170, 80),
                 "🟦": (0, 150, 255), "🟪": (140, 0, 255), "⬜": (255, 255, 255), "⬛": (0, 0, 0)}


def colour_emoji(colour):
    """Nearest coloured-square emoji for a CSS hex colour (named colours fall back to the name)."""
    names = {"red": "🟥", "orange": "🟧", "yellow": "🟨", "green": "🟩", "blue": "🟦",
             "purple": "🟪", "white": "⬜", "black": "⬛"}
    if not colour.startswith("#"):
        return names.get(colour.lower(), "")
    h = colour.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    rgb = tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    return min(EMOJI_SQUARES, key=lambda e: sum((a - b) ** 2 for a, b in zip(rgb, EMOJI_SQUARES[e])))


def to_markdown(raw, where, keep_colors=False, shift_h1=True):
    raw = expand_shortcodes(raw, where)
    raw = wpautop(raw)
    soup = clean_html(raw, where, keep_colors=keep_colors)
    if shift_h1 and soup.find("h1"):
        for h in soup.find_all(re.compile(r"^h[1-6]$")):
            h.name = "h%d" % min(int(h.name[1]) + 1, 6)
    md = MdConverter(heading_style="ATX", bullets="-", escape_misc=False, newline_style="backslash",
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
    groups = GUIDE_TYPE_DEFS[gtype]["groups"]
    by_tabs = {g["wp_tabs"]: g for g in groups}
    by_text = {g["wp_text"]: g for g in groups}
    by_outro = {g["wp_outro"]: g for g in groups if g.get("wp_outro")}
    mods = divi_modules(item["content"])
    fm_groups, body, intro = {}, [], None
    current_group = None
    for kind, label, title, inner, _ in mods:
        if kind == "et_pb_tabs":
            if label not in by_tabs:
                REVIEW.add(where, "Tab group '%s' has no field mapping; flattened into body" % label)
                current_group = None
                continue
            current_group = by_tabs[label]
        elif kind == "et_pb_tab":
            if current_group is None:
                body.append("## " + title + "\n\n" + to_markdown(inner, where))
                continue
            tabs = dict((lab, name) for name, lab in current_group["tabs"])
            if title not in tabs:
                REVIEW.add(where, "Tab '%s' in group '%s' has no field mapping" % (title, current_group["key"]))
                continue
            set_path(fm_groups, current_group["key"] + "." + tabs[title],
                     to_markdown(inner, where, keep_colors=True, shift_h1=False))
        elif kind == "et_pb_text" and label in by_text:
            key = by_text[label]["key"]
            md = to_markdown(inner, where, keep_colors=True, shift_h1=False)
            heading = re.match(r"^#{1,6}\s+(.+?)\n", md + "\n")
            md = re.sub(r"^#{1,6}\s+.+?(\n|$)", "", md, count=1).strip()
            set_path(fm_groups, key + ".heading", heading.group(1).strip("* ") if heading else "")
            set_path(fm_groups, key + ".intro", md)
            current_group = None
        elif kind == "et_pb_text" and label in by_outro:
            set_path(fm_groups, by_outro[label]["key"] + ".outro",
                     to_markdown(inner, where, keep_colors=True, shift_h1=False))
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

    rel, fm = guide_front_matter(item, authors, where)
    fm["guide_type"] = gtype
    fm["intro"] = intro or ""
    fm.update(fm_groups)
    return rel, fm, "\n\n".join(b for b in body if b)


def guide_front_matter(item, authors, where):
    last = item["meta"].get("_wplmi_last_modified", item["modified"])[:10]
    path = SITE_RE.sub("", item["link"]).rstrip("/") or "/"
    desc = seo_description(item)
    if not desc:
        REVIEW.add(where, "description is empty; WordPress had no excerpt/SEO description to copy")
    fm = {
        "title": item["title"],
        "slug": path,
        "authors": [author_key(a) for a in author_keys(item, authors)],
        "last_update": {"date": last},  # Docusaurus native "Last updated" stamp
        "description": desc,
        "wp_id": int(item["id"]),
        "original_url": item["link"],
    }
    return GUIDE_FILE_OVERRIDES.get(path, path.lstrip("/") + ".mdx"), fm


def seo_description(item):
    return (item["meta"].get("_yoast_wpseo_metadesc") or re.sub(r"<[^>]+>", "", item["excerpt"])).strip()


def convert_page(item, authors):
    """A guide page without tabs: the whole page becomes the Markdown body."""
    where = "guide %s %s" % (item["id"], item["link"])
    if "[pac_divi_table_of_contents" in item["content"]:
        REVIEW.add(where, "Divi table-of-contents module dropped (Docusaurus builds its own TOC)")
    md = to_markdown(item["content"], where)
    first = re.match(r"^#{1,6}\s+(.+?)\n", md + "\n")
    if first and first.group(1).strip("* ").lower() == item["title"].strip().lower():
        md = md[first.end():].lstrip()
    rel, fm = guide_front_matter(item, authors, where)
    return rel, fm, md


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
    desc = seo_description(item) or summary(md)
    fm = {
        "title": item["title"],
        "slug": "/%s/%s/%s/%s" % (y, m, d, item["slug"]),
        "date": item["date"].replace(" ", "T"),
        "authors": [author_key(a) for a in author_keys(item, authors)],
        # One tag list for authors: spec categories first, then patch numbers, then WordPress tags.
        # /category/<name>/ URLs redirect to the matching /tag/<name>/ page.
        "tags": dedupe(specs + patches + tags),
        "description": desc,
        "wp_id": int(item["id"]),
        "original_url": item["link"],
    }
    thumb = ATTACHMENT_IDS.get(item["meta"].get("_thumbnail_id", ""))
    if thumb:
        fm["image"] = rewrite_url(thumb, where)
    return "%s-%s.mdx" % (date, item["slug"]), fm, md


def summary(md):
    plain = re.sub(r"!\[[^\]]*\]\([^)]*\)|[#*_>\[\]()`|\\\\]|https?://\S+|/img/\S+", "", md)
    plain = re.sub(r"\s+", " ", plain).strip()
    return plain if len(plain) <= 157 else plain[:157].rsplit(" ", 1)[0] + "…"


def media_url(audio):
    """The R2 address of a podcast MP3, or the original address if it isn't in the bucket."""
    if not audio.lower().endswith(".mp3"):
        return audio
    if UPLOADS_RE.match(audio):
        path = UPLOADS_RE.sub("", audio)
        return audio if path in MISSING_AUDIO else MEDIA_BASE + path
    if WTW_AUDIO_RE.match(audio):
        name = WTW_AUDIO_RE.sub("", audio)
        return MEDIA_BASE + "2017/03/" + WTW_RENAMED.get(name, name)
    return audio


def convert_podcast(item, authors):
    where = "podcast %s %s" % (item["id"], item["link"])
    md = to_markdown(item["content"], where)
    date = item["date"][:10]
    meta = item["meta"]
    audio = meta.get("audio_file", "").strip()
    fm = {
        "title": item["title"],
        "slug": item["slug"],  # relative to /podcast/
        "date": item["date"].replace(" ", "T"),
        "authors": [author_key(a) for a in author_keys(item, authors)],
        "tags": dedupe([c[1] for c in item["cats"] if c[0] == "post_tag"]),
        "series": dedupe([c[1] for c in item["cats"] if c[0] == "series"]),
        "description": seo_description(item) or summary(md),
        "audio": media_url(audio),
        "duration": meta.get("duration", ""),
        "wp_id": int(item["id"]),
        "original_url": item["link"],
    }
    if not audio:
        REVIEW.add(where, "No audio file")
    elif not UPLOADS_RE.match(audio) and not WTW_AUDIO_RE.match(audio):
        REVIEW.add(where, "Audio file is hosted elsewhere and may be gone: %s" % audio)
    cover = meta.get("cover_image") or ATTACHMENT_IDS.get(meta.get("_thumbnail_id", ""))
    if cover:
        fm["image"] = rewrite_url(cover, where)
    return "%s-%s.mdx" % (date, item["slug"]), fm, md


def dedupe(names):
    seen, out = set(), []
    for n in names:
        if n.lower() not in seen:
            seen.add(n.lower())
            out.append(n)
    return out


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


def write_mdx(path, fm, body, skip_existing=False):
    if skip_existing and os.path.exists(path):
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    head = yaml.dump(literalise(fm), sort_keys=False, allow_unicode=True, width=10**9)
    with open(path, "w") as f:
        f.write("---\n%s---\n\n%s\n" % (head, body))
    return True


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
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--skip-existing", action="store_true")
    ap.add_argument("--posts", nargs="*", default=[])
    ap.add_argument("--guides", nargs="*", default=[])
    ap.add_argument("--podcasts", nargs="*", default=[])
    a = ap.parse_args()
    authors, items = load_items(a.export)
    published = lambda t, status="publish": sorted(
        (i["id"] for i in items.values() if i["type"] == t and i["status"] == status), key=lambda pid: items[pid]["date"])
    drafts = []
    if a.all:
        a.posts = published("post")
        drafts = published("post", "archive")
        a.podcasts = published("podcast")
        a.guides = [pid for pid in published("page") if pid not in HUB_PAGES | RETIRED | SKIPPED]
    # Paths that will exist on the new site: what we convert, plus the hub pages
    converted = set(a.posts) | set(a.podcasts) | set(a.guides) | HUB_PAGES
    for it in items.values():
        path = SITE_RE.sub("", it["link"])
        if it["id"] in converted:
            KNOWN_PATHS.add(path if path.endswith("/") else path + "/")
        if it["type"] == "attachment":
            url = it["meta"].get("_wp_attached_file")
            if url:
                ATTACHMENTS[path if path.endswith("/") else path + "/"] = "/wp-content/uploads/" + url
                ATTACHMENT_IDS[it["id"]] = "/wp-content/uploads/" + url
    nicename, categories = tag_permalinks(items, set(a.posts) | set(a.podcasts))
    for nice, name in categories.items():
        CATEGORY_TAG[nice] = "/tag/%s/" % nicename[name.lower()][1]
    for pid in RETIRED:  # links to them go straight to the redirect target
        RETIRED_PATHS.add(SITE_RE.sub("", items[pid]["link"]))
    used_authors, urlmap, kept = set(), [], []
    os.makedirs(os.path.join(a.outdir, "migration"), exist_ok=True)

    def emit(kind, pid, folder, rel, fm, body, new_url):
        it = items[pid]
        out = os.path.join(a.outdir, folder, rel)
        if not write_mdx(out, fm, body, a.skip_existing):
            kept.append(out)
        n, miss = check_talent_strings(it, open(out).read(), "%s %s %s" % (kind, pid, it["link"]))
        if n:
            print(kind, pid, "->", out, "| talent strings: %d found, %d missing" % (n, miss))
        if kind != "draft":  # a draft-only author gets no author page (it would be empty on the live site)
            used_authors.update(author_keys(it, authors))
        urlmap.append((SITE_RE.sub("", it["link"]), new_url, kind, pid))

    for pid in a.guides:
        it = items[pid]
        if pid in GUIDE_TYPES:
            rel, fm, body = convert_guide(it, GUIDE_TYPES[pid], authors)
        else:
            rel, fm, body = convert_page(it, authors)
        emit("guide", pid, "docs", rel, fm, body, fm["slug"] + "/")

    for pid in a.posts:
        name, fm, body = convert_post(items[pid], authors)
        emit("post", pid, "blog", name, fm, body, fm["slug"] + "/")

    # Drafts don't count as published paths: links to them still redirect or show up on the review list
    for pid in drafts:
        name, fm, body = convert_post(items[pid], authors)
        fm["draft"] = True
        emit("draft", pid, "blog", name, fm, body, fm["slug"] + "/")

    for pid in a.podcasts:
        name, fm, body = convert_podcast(items[pid], authors)
        emit("podcast", pid, "podcast", name, fm, body, "/podcast/%s/" % fm["slug"])

    # Every author account in the export (display names only), so new posts can pick anyone
    everyone = set(authors.values()) | used_authors
    # An explicit permalink keeps author pages at /authors/<key>/ (Docusaurus would turn abelito75 into abelito-75)
    authors_yml = {author_key(n): {"name": n, "page": {"permalink": "/" + author_key(n)} if n in used_authors else False}
                   for n in sorted(everyone, key=str.lower)}
    with open(os.path.join(a.outdir, "blog", "authors.yml"), "w") as f:
        yaml.dump(authors_yml, f, sort_keys=False, allow_unicode=True)

    with open(os.path.join(a.outdir, "migration", "url-map.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["old_url", "new_url", "type", "wp_id", "changed"])
        for old, new, t, pid in sorted(urlmap):
            w.writerow([old, new, t, pid, "no" if old == new else "YES"])

    with open(os.path.join(a.outdir, "migration", "images-needed.txt"), "w") as f:
        f.write("\n".join(sorted(IMAGES)) + "\n")

    if a.podcasts:
        write_podcast_feed(a.outdir, items, a.podcasts)
    if a.all:
        write_tags_and_redirects(a.outdir, items, set(a.posts) | set(a.podcasts), authors, category_parents(a.export))
    with open(os.path.join(a.outdir, "migration", "review-list.md"), "w") as f:
        f.write("# Conversion review list\n\nGenerated by tools/wp2mdx.py. Each item needs a human look; "
                "nothing here was guessed.\n")
        for where in sorted(REVIEW.items, key=review_order):
            f.write("\n## %s\n\n" % where)
            for msg in REVIEW.items[where]:
                f.write("- %s\n" % msg)
    for out in kept:
        print("kept existing (not overwritten):", out)
    print("guides %d, posts %d (+%d drafts), podcasts %d | images referenced: %d | review items: %d"
          % (len(a.guides), len(a.posts), len(drafts), len(a.podcasts), len(IMAGES), sum(len(v) for v in REVIEW.items.values())))


REDIRECTS_MARK = "# ---- Everything below is generated by tools/wp2mdx.py --all; edit above this line ----\n"


def tag_permalinks(items, converted):
    """Tag label -> WordPress nicename (tags first, then categories), and category nicename -> label."""
    nicename, categories = {}, {}
    for pid in converted:
        for dom, name, nice in items[pid]["cats"]:
            if dom == "post_tag" or (dom == "category" and name.lower() not in nicename):
                nicename.setdefault(name.lower(), (name, nice))
            if dom == "category":
                categories[nice] = name
    return nicename, categories


def category_parents(export):
    """WordPress category nicename -> its parent's nicename (patch categories nest: /category/12-0/12-1/)."""
    channel = ET.parse(export).getroot().find("channel")
    return {c.findtext("wp:category_nicename", namespaces=NS): c.findtext("wp:category_parent", namespaces=NS)
            for c in channel.findall("wp:category", NS) if c.findtext("wp:category_parent", namespaces=NS)}


def write_tags_and_redirects(outdir, items, converted, authors, parents):
    """blog/tags.yml keeps WordPress's tag URLs (/tag/<nicename>/); static/_redirects gets the rest."""
    nicename, categories = tag_permalinks(items, converted)
    tags = {}
    for low, (name, nice) in sorted(nicename.items()):
        tags[name] = {"label": name, "permalink": "/" + nice}
    with open(os.path.join(outdir, "blog", "tags.yml"), "w") as f:
        f.write("# Generated by tools/wp2mdx.py: tag pages keep their WordPress addresses (/tag/<permalink>/).\n"
                "# Tags not listed here still work; Docusaurus makes their address from the name.\n")
        yaml.dump(tags, f, sort_keys=False, allow_unicode=True)

    # Exact-address rules: Cloudflare Pages allows 2,000 of those but only 100 with a * (it ignores every rule after the
    # 100th), so wildcards are kept for the few catch-alls. Paged archives (/category/x/page/2/) get the 404 page.
    lines = ["", "# WordPress category archives -> tag pages"]
    for nice in sorted(categories):
        if parents.get(nice):
            lines.append("/category/%s/%s/ %s 301" % (parents[nice], nice, CATEGORY_TAG[nice]))
    for nice in sorted(categories):
        lines.append("/category/%s/ %s 301" % (nice, CATEGORY_TAG[nice]))
    lines += ["", "# Author archives -> author pages"]
    for login, name in sorted(authors.items()):
        key = author_key(name)
        if any(key in [author_key(n) for n in author_keys(items[p], authors)] for p in converted):
            lines.append("/author/%s/ /authors/%s/ 301" % (re.sub(r"[^a-z0-9-]+", "-", login.lower()), key))
    # Tags only podcasts use have no news tag page; podcast tag pages live under /podcast/tag/
    news_tags = {nice for p in converted if items[p]["type"] == "post"
                 for dom, _, nice in items[p]["cats"] if dom == "post_tag"}
    podcast_only = sorted({nice for p in converted if items[p]["type"] == "podcast"
                           for dom, _, nice in items[p]["cats"] if dom == "post_tag"} - news_tags)
    lines += ["", "# Tags used only by podcast episodes -> their podcast tag page"]
    for nice in podcast_only:
        lines.append("/tag/%s/ /podcast/tag/%s/ 301" % (nice, nice))
    lines += ["", "# Podcast series archives -> the podcast archive",
              "/series/* /podcast/archive/ 301"]
    lines += ["", "# Links in old content to /df/, /sl/, /bfa/ and unprefixed guide paths"]
    for old, new in sorted(OLD_LINKS.items()):
        lines.append("%s %s 301" % (old, new))
    lines += ["", "# Anything else under the old expansion prefixes -> that spec's hub, else the homepage"]
    for prefix in ("df", "sl", "bfa"):
        for spec in ("brewmaster", "mistweaver", "windwalker"):
            lines.append("/%s/%s/* /tww/%s/ 301" % (prefix, spec, spec))
        lines.append("/%s/* / 301" % prefix)
    lines.append("")
    path = os.path.join(outdir, "static", "_redirects")
    head = open(path).read().split(REDIRECTS_MARK)[0].rstrip("\n") + "\n\n"
    with open(path, "w") as f:
        f.write(head + REDIRECTS_MARK + "\n".join(lines) + "\n")
    print("tags.yml: %d tags | _redirects: %d generated rules" % (len(tags), sum(1 for l in lines if l and l[0] == "/")))


def write_podcast_feed(outdir, items, pids):
    """An iTunes-style RSS feed with audio enclosures at /podcast/feed.xml, so apps subscribed to the old
    /feed/podcast/... address keep working (static/_redirects points the old address here)."""
    from email.utils import format_datetime
    from datetime import datetime, timezone
    from xml.sax.saxutils import escape
    eps = []
    for pid in sorted(pids, key=lambda p: items[p]["date"], reverse=True):
        it, meta = items[pid], items[pid]["meta"]
        enc = meta.get("enclosure", "").split("\n")
        if not meta.get("audio_file"):
            continue
        when = datetime.strptime(it["date"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        notes = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html.unescape(it["content"]))).strip()[:4000]
        eps.append("""  <item>
    <title>%s</title>
    <link>https://www.peakofserenity.com/podcast/%s/</link>
    <guid isPermaLink="false">%s</guid>
    <pubDate>%s</pubDate>
    <description>%s</description>
    <enclosure url="%s" length="%s" type="%s"/>
    <itunes:duration>%s</itunes:duration>
  </item>""" % (escape(it["title"]), it["slug"], escape(html.unescape(meta.get("ssp_guid") or it["link"])),
              format_datetime(when), escape(notes), escape(media_url(meta["audio_file"].strip())),
              meta.get("filesize_raw") or (enc[1] if len(enc) > 1 else "0"),
              enc[2].strip() if len(enc) > 2 and enc[2].strip() else "audio/mpeg", meta.get("duration", "")))
    feed = """<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by tools/wp2mdx.py from the WordPress export. -->
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
<channel>
  <title>Peak of Serenity Podcast</title>
  <link>https://www.peakofserenity.com/podcast/</link>
  <language>en</language>
  <description>Podcast for Monk, by Monk.</description>
  <itunes:author>Peak of Serenity</itunes:author>
  <itunes:image href="https://www.peakofserenity.com/podcast/artwork.png"/>
  <itunes:category text="Leisure"><itunes:category text="Video Games"/></itunes:category>
  <itunes:explicit>false</itunes:explicit>
%s
</channel>
</rss>
""" % "\n".join(eps)
    os.makedirs(os.path.join(outdir, "static", "podcast"), exist_ok=True)
    with open(os.path.join(outdir, "static", "podcast", "feed.xml"), "w") as f:
        f.write(feed)
    REVIEW.add("podcast feed /podcast/feed.xml", "The feed's title, description, artwork and category were not in "
               "the export (they lived in the podcast plugin's settings); check them against the live feed")


def review_order(where):
    kind, pid, link = where.split(" ", 2)
    return ({"guide": 0, "post": 1, "podcast": 2}.get(kind, 3), link, pid)


if __name__ == "__main__":
    sys.exit(main())
