// Tab groups for each kind of guide, in page order. `key` is the front-matter field path;
// each tab is [field name, label shown on the tab]. .pages.yml uses the same names and labels.
const guideTypes = {
  'windwalker-pve': {
    spec: 'windwalker',
    banner: '/img/uploads/2020/08/Jari-WW.png',
    groups: [
      {
        key: 'builds',
        heading: 'Talent Builds',
        tabs: [
          ['classtree', 'Class Tree'],
          ['raid', 'Raid'],
          ['mythicplus', 'Mythic+'],
          ['delves', 'Delves'],
          ['flowchart', 'Flowchart'],
          ['omniumfolio', 'Omnium Folio'],
        ],
      },
      {
        key: 'cooldowns',
        heading: 'Abilities',
        tabs: [
          ['celestialconduit', 'Celestial Conduit'],
          ['fortifyingbrew', 'Fortifying Brew'],
          ['invokexuen', 'Invoke Xuen'],
          ['touchofdeath', 'Touch of Death'],
          ['touchofkarma', 'Touch of Karma'],
          ['zenith', 'Zenith'],
        ],
      },
      {
        key: 'priority.singletarget',
        heading: 'Priority Lists',
        tabs: [
          ['default_shadopan', 'Default SP'],
          ['default_conduit', 'Default Conduit'],
          ['advanced_shadopan', 'Advanced Shado-Pan'],
          ['advanced_conduit', 'Advanced Conduit'],
        ],
      },
      {
        key: 'priority.aoe',
        heading: 'AOE Priority',
        tabs: [
          ['shadopan', 'Shado-Pan'],
          ['conduit', 'Conduit of the Celestials'],
        ],
      },
      {
        key: 'openers',
        heading: 'Openers',
        tabs: [
          ['shadopan', 'Shado-Pan'],
          ['conduit', 'Conduit of the Celestials'],
        ],
      },
    ],
  },
};

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
