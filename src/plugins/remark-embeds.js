// A link on a line of its own, showing its own address (as WordPress auto-embeds), becomes a player:
// YouTube videos, published Google Sheets charts, Twitch clips and .mp4 files.
// The source stays a plain Markdown link, so Pages CMS can edit it.
// It also turns runs of bold page links into a row of buttons (see groupButtons).

const TWITCH_PARENTS = ['www.peakofserenity.com', 'peakofserenity.com', 'localhost'];

function youtubeId(url) {
  if (/(^|\.)youtu\.be$/.test(url.hostname)) return url.pathname.slice(1).split('/')[0];
  if (!/(^|\.)youtube\.com$/.test(url.hostname)) return null;
  if (url.pathname === '/watch') return (url.searchParams.get('v') || '').split('?')[0];
  const m = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
  return m ? m[1] : null;
}

function embedFor(href) {
  let url;
  try {
    url = new URL(href, 'https://www.peakofserenity.com');
  } catch {
    return null;
  }
  const id = youtubeId(url);
  if (id) {
    const start = parseInt(url.searchParams.get('t') || url.searchParams.get('start') || '', 10);
    return {kind: 'video', src: `https://www.youtube-nocookie.com/embed/${id}` + (start ? `?start=${start}` : '')};
  }
  if (url.hostname === 'docs.google.com' && /\/spreadsheets\/d\/e\/[^/]+\/pub(chart|html)/.test(url.pathname)) {
    return {kind: 'chart', src: url.href};
  }
  if (url.hostname === 'clips.twitch.tv') {
    const clip = url.searchParams.get('clip') || url.pathname.slice(1);
    if (!clip || clip === 'embed') return null;
    const parents = TWITCH_PARENTS.map((p) => `&parent=${p}`).join('');
    return {kind: 'video', src: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip)}&autoplay=false${parents}`};
  }
  if (/\.mp4$/i.test(url.pathname)) return {kind: 'mp4', src: href};
  return null;
}

function textOf(node) {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  return (node.children || []).map(textOf).join('');
}

function toEmbed(node) {
  const kids = (node.children || []).filter((c) => !(c.type === 'text' && !c.value.trim()) && c.type !== 'break');
  if (kids.length !== 1 || kids[0].type !== 'link') return null;
  const link = kids[0];
  const label = textOf(link).trim();
  if (label !== link.url && !label.startsWith('Video:')) return null;
  const e = embedFor(link.url);
  if (!e) return null;
  const media =
    e.kind === 'mp4'
      ? {type: 'element', tagName: 'video', properties: {src: e.src, controls: true, preload: 'metadata'}, children: []}
      : {
          type: 'element',
          tagName: 'iframe',
          properties: {
            src: e.src,
            title: label,
            loading: 'lazy',
            allowFullScreen: true,
            allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
          },
          children: [],
        };
  return {
    type: 'embed',
    data: {hName: 'div', hProperties: {className: ['embed', `embed--${e.kind}`]}, hChildren: [media]},
  };
}

// Two or more paragraphs in a row that each hold just one bold link to a page on this site
// (the old Divi button rows, e.g. Starting / Tools / Raid / Mythic+) become one centred row of buttons.
function buttonLink(node) {
  if (node.type !== 'paragraph') return null;
  const kids = (node.children || []).filter((c) => !(c.type === 'text' && !c.value.trim()));
  if (kids.length !== 1 || kids[0].type !== 'link' || !kids[0].url.startsWith('/')) return null;
  const link = kids[0];
  if (link.children.length !== 1 || link.children[0].type !== 'strong') return null;
  return link;
}

function groupButtons(parent) {
  const out = [];
  let run = [];
  const flush = () => {
    if (run.length >= 2) {
      const links = run.map(({link}) => ({
        ...link,
        children: link.children[0].children,
        data: {hProperties: {className: ['button', 'button--pos']}},
      }));
      out.push({type: 'linkButtons', data: {hName: 'div', hProperties: {className: ['link-buttons']}}, children: links});
    } else {
      out.push(...run.map(({node}) => node));
    }
    run = [];
  };
  for (const node of parent.children) {
    const link = buttonLink(node);
    if (link) {
      run.push({node, link});
    } else {
      flush();
      out.push(node);
    }
  }
  flush();
  parent.children = out;
}

module.exports = function remarkEmbeds() {
  return (tree) => {
    const walk = (parent) => {
      (parent.children || []).forEach((child, i) => {
        if (child.type === 'paragraph') {
          const embed = toEmbed(child);
          if (embed) parent.children[i] = embed;
        } else if (child.children) {
          walk(child);
        }
      });
    };
    walk(tree);
    groupButtons(tree);
  };
};
