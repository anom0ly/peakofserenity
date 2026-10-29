// Podcast audio lives in the R2 bucket "podcasts" (public address: mediaUrl, from PODCAST_MEDIA_URL).
// The bucket keeps the WordPress paths (wp-content/uploads/YYYY/MM/<file>.mp3), so only the domain changes.
// The episodes and static/podcast/feed.xml already link there (tools/wp2mdx.py writes those links); this plugin
// redirects old https://www.peakofserenity.com/wp-content/uploads/... addresses to the bucket.
//
// It also puts every exact-address redirect in the built _redirects ahead of the wildcard ones. Cloudflare Pages
// counts every rule after the first wildcard (*) or placeholder (:name) against its 100 dynamic-rule limit and
// silently drops the rest, so a wildcard near the top of the file cut off most of our redirects.
const fs = require('fs');
const path = require('path');

const isDynamic = (line) => /[*]|\/:[A-Za-z]/.test(line.split(/\s+/)[0]);

module.exports = function podcastMedia(context, {mediaUrl}) {
  return {
    name: 'podcast-media',
    async postBuild({outDir}) {
      const file = path.join(outDir, '_redirects');
      let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (mediaUrl) {
        text += `\n/wp-content/uploads/* ${mediaUrl}/wp-content/uploads/:splat 301\n`;
      }
      // Keep each group in file order: the first matching rule wins
      const rules = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      fs.writeFileSync(
        file,
        '# Built from static/_redirects by src/plugins/podcast-media.js: exact addresses first, then wildcards.\n' +
          rules.filter((l) => !isDynamic(l)).join('\n') + '\n' +
          rules.filter(isDynamic).join('\n') + '\n',
      );
    },
  };
};
