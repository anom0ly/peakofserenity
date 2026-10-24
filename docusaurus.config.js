// @ts-check
const {themes: prismThemes} = require('prism-react-renderer');
const remarkEmbeds = require('./src/plugins/remark-embeds');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Peak of Serenity',
  tagline: 'For Monks, by Monks',
  favicon: 'img/uploads/2018/02/cropped-No_margin_transparent.png',
  url: 'https://www.peakofserenity.com',
  baseUrl: '/',
  // WordPress URLs all end in "/"; keep them identical.
  trailingSlash: true,
  // Links to pages that aren't converted yet only warn until the full conversion is done.
  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',
  markdown: {hooks: {onBrokenMarkdownLinks: 'warn', onBrokenMarkdownImages: 'warn'}},
  i18n: {defaultLocale: 'en', locales: ['en']},

  headTags: [
    {
      tagName: 'script',
      attributes: {},
      innerHTML:
        "const whTooltips = {colorLinks: true, iconizeLinks: true, renameLinks: true, iconSize: 'tiny'};",
    },
  ],
  scripts: [{src: 'https://wow.zamimg.com/js/tooltips.js', async: true}],
  clientModules: [
    require.resolve('./src/clientModules/wowhead.js'),
    require.resolve('./src/clientModules/imageZoom.js'),
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          // Guides keep their WordPress paths through each file's `slug`.
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: false,
          showLastUpdateTime: true,
          remarkPlugins: [remarkEmbeds],
        },
        blog: false,
        theme: {customCss: require.resolve('./src/css/custom.css')},
      }),
    ],
  ],

  plugins: [
    [
      require.resolve('./src/plugins/blog-at-root.js'),
      {
        // News posts keep /YYYY/MM/DD/slug/ through each file's `slug`; the list page lives at /news/.
        path: 'blog',
        routeBasePath: '/',
        tagsBasePath: 'tag',
        blogTitle: 'News & Articles',
        blogDescription: 'Monk news, patch notes and theorycrafting',
        postsPerPage: 10,
        blogSidebarCount: 0,
        authorsMapPath: 'authors.yml',
        // WordPress tag addresses (/tag/<nicename>/); tags not in the file still work.
        tags: 'tags.yml',
        onInlineTags: 'ignore',
        onInlineAuthors: 'warn',
        onUntruncatedBlogPosts: 'ignore',
        remarkPlugins: [remarkEmbeds],
        showReadingTime: false,
        feedOptions: {type: ['rss', 'atom'], xslt: false},
      },
    ],
    [
      '@docusaurus/plugin-content-blog',
      {
        // Podcast episodes keep /podcast/<slug>/; /podcast/ lists them and /podcast/archive/ is the full archive.
        // The podcast feed with audio enclosures is static/podcast/feed.xml (written by tools/wp2mdx.py).
        id: 'podcast',
        path: 'podcast',
        routeBasePath: 'podcast',
        tagsBasePath: 'tag',
        blogTitle: 'PeakCraft Podcast',
        blogDescription: 'Every episode of the Peak of Serenity podcast',
        postsPerPage: 20,
        blogSidebarCount: 0,
        authorsMapPath: '../blog/authors.yml',
        tags: '../blog/tags.yml',
        onInlineTags: 'ignore',
        onInlineAuthors: 'warn',
        onUntruncatedBlogPosts: 'ignore',
        remarkPlugins: [remarkEmbeds],
        showReadingTime: false,
        feedOptions: {type: null},
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/uploads/2020/08/Jari-General.png',
      colorMode: {defaultMode: 'dark', disableSwitch: true, respectPrefersColorScheme: false},
      navbar: {
        title: 'Peak of Serenity',
        logo: {alt: 'Peak of Serenity', src: 'img/uploads/2018/02/No_margin_transparent.png'},
        // Mirrors the live "TWW Main Menu".
        items: [
          {
            label: 'Brewmaster',
            to: '/tww/brewmaster/',
            items: [
              {label: 'PvE Quick Guide', to: '/tww/brewmaster/pve-guide/'},
              {label: 'Acronyms', to: '/tww/brewmaster/acronyms/'},
              {label: 'Articles/News', to: '/tag/brewmaster/'},
            ],
          },
          {
            label: 'Mistweaver',
            to: '/tww/mistweaver/',
            items: [
              {label: 'Questionably Epic', href: 'https://questionablyepic.com/mistweaver-monk/11.1-FAQ/'},
              {label: 'Wowhead', href: 'https://www.wowhead.com/mistweaver-monk-guide'},
              {label: 'Icy Veins', href: 'https://www.icy-veins.com/wow/mistweaver-monk-pve-healing-guide'},
              {label: 'Way of the Crane', href: 'https://www.wayofthecrane.io/'},
            ],
          },
          {
            label: 'Windwalker',
            to: '/tww/windwalker/',
            items: [
              {label: 'Articles/News', to: '/tag/windwalker/'},
              {label: 'Acronyms', to: '/tww/windwalker/acronyms/'},
              {label: 'Advanced Tricks', to: '/tww/windwalker/pve-guide/advanced-tricks/'},
              {label: 'Class Tree In-Depth', to: '/tww/windwalker/pve-guide/class-tree-in-depth/'},
              {label: 'Storm, Earth, and Fire', to: '/2021/08/01/storm-earth-and-fire-past-present-and-future/'},
              {label: 'Cooldown Management', to: '/2021/07/31/windwalker-approaching-cooldowns-and-desyncs/'},
              {label: 'Target/Spell Caps', to: '/2025/02/23/how-capped-am-i/'},
              {label: 'Retail PvE Guide', to: '/tww/windwalker/pve-guide/'},
              {label: 'Log Analysis', to: '/tww/windwalker/pve-guide/log-analysis/'},
              {label: 'References', to: '/tww/windwalker/pve-guide/references/'},
              {label: 'Classic PvE Guide', to: '/mop/windwalker/pve-guide/'},
            ],
          },
          {to: '/news/', label: 'News', position: 'left'},
          {href: 'https://discord.gg/peakofserenity', label: 'Discord', position: 'right'},
          {
            label: 'Support Peak',
            position: 'right',
            items: [
              {label: 'Patreon', href: 'https://www.patreon.com/peakofserenity'},
              {label: 'PayPal', href: 'https://www.paypal.me/peakofserenity'},
            ],
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Community',
            items: [
              {label: 'Discord', href: 'https://discord.gg/peakofserenity'},
              {label: 'Podcast archive', to: '/podcast/archive/'},
            ],
          },
          {
            title: 'Support Peak',
            items: [
              {label: 'Patreon', href: 'https://www.patreon.com/peakofserenity'},
              {label: 'PayPal', href: 'https://www.paypal.me/peakofserenity'},
            ],
          },
        ],
        copyright: `Peak of Serenity · For Monks, by Monks`,
      },
      tableOfContents: {minHeadingLevel: 2, maxHeadingLevel: 3},
      prism: {theme: prismThemes.github, darkTheme: prismThemes.dracula},
    }),
};

module.exports = config;
