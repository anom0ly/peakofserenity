// Tab groups for each kind of guide, in page order, shared with tools/wp2mdx.py and tools/pages_config.py
// (which writes .pages.yml). `key` is the front-matter field path; each tab is [field name, label shown on the tab].
// The wp_* entries name the Divi modules the converter reads each group from.
import guideTypes from './guideTypes.json';

export function getPath(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function headingId(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Headings the guide layout renders from front matter, for the table of contents.
export function guideToc(frontMatter) {
  const type = guideTypes[frontMatter.guide_type];
  if (!type) return [];
  return type.groups
    .map((g) => {
      const value = getPath(frontMatter, g.key) || {};
      const text = value.heading || g.heading;
      return {value: text, id: headingId(text), level: 2};
    });
}

export default guideTypes;
