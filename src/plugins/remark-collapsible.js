// A heading that starts with "▸" (the old WordPress accordions and "click to see" toggles) becomes a
// collapsible section: the heading text is the summary, and everything up to the next heading of the
// same or a higher level (or a --- line) folds away under it.
const COLLAPSE_MARK = /^\s*▸\s*/;

function collapseTitle(node) {
  if (node.type !== 'heading') return null;
  const first = node.children[0];
  if (!first || first.type !== 'text' || !COLLAPSE_MARK.test(first.value)) return null;
  return [{...first, value: first.value.replace(COLLAPSE_MARK, '')}, ...node.children.slice(1)];
}

function collapseSections(parent) {
  const out = [];
  const kids = parent.children;
  for (let i = 0; i < kids.length; i++) {
    const title = collapseTitle(kids[i]);
    if (!title) {
      out.push(kids[i]);
      continue;
    }
    const depth = kids[i].depth;
    let j = i + 1;
    while (j < kids.length && !(kids[j].type === 'heading' && kids[j].depth <= depth) && kids[j].type !== 'thematicBreak') j++;
    const body = {type: 'root', children: kids.slice(i + 1, j)};
    collapseSections(body);
    out.push({
      type: 'collapsible',
      data: {hName: 'details', hProperties: {className: ['collapsible']}},
      children: [{type: 'paragraph', data: {hName: 'summary'}, children: title}, ...body.children],
    });
    i = j - 1;
  }
  parent.children = out;
}

// Runs before Docusaurus's own plugins, so the folded headings stay out of the table of contents.
module.exports = function remarkCollapsible() {
  return (tree) => collapseSections(tree);
};
