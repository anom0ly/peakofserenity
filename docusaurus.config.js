// @ts-check
const {themes: prismThemes} = require('prism-react-renderer');
const remarkEmbeds = require('./src/plugins/remark-embeds');
const remarkCollapsible = require('./src/plugins/remark-collapsible');

// Migration mode (MIGRATION_MODE=true in the Cloudflare Pages build settings) publishes only a landing page and the
// three spec guides; news, articles, podcast pages, tags and the hub pages are left out of the build. Nothing is
// deleted: turn the variable off and redeploy to bring the full site back.
const migrationMode = process.env.MIGRATION_MODE === 'true';
const migrationGuides = [
  'tww/brewmaster/pve-guide.mdx',
  'tww/mistweaver/pve-guide.mdx',
  'tww/windwalker/pve-guide.mdx',
  'tww/windwalker/pve-guide/**/*.mdx',
  // The writers' how-to (/writers/): unlisted, so it stays out of the sitemap and search engines.
  'writers.mdx',
];
// Base URL of the public R2 bucket "podcasts" (no trailing slash). The episodes and feed link there directly; old
// /wp-content/uploads/*.mp3 addresses redirect there. PODCAST_MEDIA_URL overrides the redirect target.
const podcastMediaUrl = (process.env.PODCAST_MEDIA_URL || 'https://media.peakofserenity.com').replace(/\/+$/, '');

// Google Analytics 4 property for the new site. Only production deploys of main load it (Cloudflare Pages sets
// CF_PAGES_BRANCH), so preview deploys and local builds stay out of the stats.
const gaMeasurementId = 'G-PDRKCDL1GQ';
const analyticsEnabled = process.env.CF_PAGES_BRANCH === 'main';

// AdSense: one ad in the table-of-contents column on desktop and one below the post on phones (src/components/AdSlot).
// ADS_ENABLED=true in the Cloudflare Pages build settings turns the ads on; migration mode keeps them off. ADSENSE_SLOT
// is the display ad unit's slot ID; until it's set, the slots show a dashed placeholder and Google's script isn't loaded.
// The verification tag and static/ads.txt stay in every build so the AdSense account can review the site.
const adsenseClient = 'ca-pub-9960844448742082';
const ads = {
  enabled: process.env.ADS_ENABLED === 'true' && !migrationMode,
  client: adsenseClient,
  slot: process.env.ADSENSE_SLOT || '',
};

const fullNavbar = [
  // Mirrors the live "TWW Main Menu".
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
];
const migrationNavbar = [
  {to: '/#guides', label: 'Guides', position: 'left'},
  {href: 'https://discord.gg/peakofserenity', label: 'Discord', position: 'right'},
  {
    label: 'Support Peak',
    position: 'right',
    items: [
      {label: 'Patreon', href: 'https://www.patreon.com/peakofserenity'},
      {label: 'PayPal', href: 'https://www.paypal.me/peakofserenity'},
    ],
  },
];

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
  customFields: {migrationMode, ads},

  headTags: [
    {tagName: 'meta', attributes: {name: 'google-adsense-account', content: adsenseClient}},
    {
      tagName: 'script',
      attributes: {},
      innerHTML:
        "const whTooltips = {colorLinks: true, iconizeLinks: true, renameLinks: true, iconSize: 'tiny'};",
    },
  ],
  scripts: [
    {src: 'https://wow.zamimg.com/js/tooltips.js', async: true},
    ...(ads.enabled && ads.slot
      ? [{src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`, async: true, crossorigin: 'anonymous'}]
      : []),
  ],
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
          beforeDefaultRemarkPlugins: [remarkCollapsible],
          remarkPlugins: [remarkEmbeds],
          ...(migrationMode && {include: migrationGuides}),
        },
        blog: false,
        // In migration mode the spec hub pages (/tww/<spec>/, /mop/windwalker/) are left out too.
        ...(migrationMode && {
          pages: {
            // The first four are Docusaurus's default excludes.
            exclude: ['**/_*.{js,jsx,ts,tsx,md,mdx}', '**/_*/**', '**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**', 'tww/**', 'mop/**'],
          },
        }),
        theme: {customCss: require.resolve('./src/css/custom.css')},
        ...(analyticsEnabled && {gtag: {trackingID: gaMeasurementId, anonymizeIP: false}}),
      }),
    ],
  ],

  plugins: [
    ...(migrationMode ? [] : [
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
          beforeDefaultRemarkPlugins: [remarkCollapsible],
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
          beforeDefaultRemarkPlugins: [remarkCollapsible],
          remarkPlugins: [remarkEmbeds],
          showReadingTime: false,
          feedOptions: {type: null},
        },
      ],
    ]),
    [require.resolve('./src/plugins/podcast-media.js'), {mediaUrl: podcastMediaUrl}],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/uploads/2020/08/Jari-General.png',
      colorMode: {defaultMode: 'dark', disableSwitch: true, respectPrefersColorScheme: false},
      navbar: {
        title: 'Peak of Serenity',
        logo: {alt: 'Peak of Serenity', src: 'img/uploads/2018/02/No_margin_transparent.png'},
        items: migrationMode ? migrationNavbar : fullNavbar,
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Community',
            items: [
              {label: 'Discord', href: 'https://discord.gg/peakofserenity'},
              ...(migrationMode ? [] : [{label: 'Podcast archive', to: '/podcast/archive/'}]),
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
