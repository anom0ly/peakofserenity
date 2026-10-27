// Podcast audio lives in the R2 bucket "podcasts" (public address: mediaUrl, from PODCAST_MEDIA_URL).
// The bucket keeps the WordPress paths (wp-content/uploads/YYYY/MM/<file>.mp3), so only the domain changes.
// The episodes and static/podcast/feed.xml already link there (tools/wp2mdx.py writes those links); this plugin
// redirects old https://www.peakofserenity.com/wp-content/uploads/... addresses to the bucket.
const fs = require('fs');
const path = require('path');

module.exports = function podcastMedia(context, {mediaUrl}) {
  return {
    name: 'podcast-media',
    async postBuild({outDir}) {
      if (!mediaUrl) {
        return;
      }
      fs.appendFileSync(
        path.join(outDir, '_redirects'),
        `\n# Podcast audio now lives in R2 (added at build time by src/plugins/podcast-media.js)\n` +
          `/wp-content/uploads/* ${mediaUrl}/wp-content/uploads/:splat 301\n`,
      );
    },
  };
};
