// Points podcast audio at the R2 bucket "podcasts" once its public address is set (PODCAST_MEDIA_URL).
// The bucket keeps the WordPress paths (wp-content/uploads/YYYY/MM/<file>.mp3), so only the domain changes:
// - the feed's <enclosure> links in build/podcast/feed.xml are rewritten;
// - old https://www.peakofserenity.com/wp-content/uploads/... addresses redirect to the bucket.
// The earliest episodes were linked from walkingthewind.com (no longer online). Their files were re-uploaded to
// peakofserenity.com under 2017/03/, one of them under a corrected name, and that is where they are in the bucket.
const fs = require('fs');
const path = require('path');

const OLD_MEDIA = /url="https?:\/\/www\.peakofserenity\.com\/wp-content\/uploads\//g;
const WALKING_THE_WIND = /url="https?:\/\/(?:www\.)?walkingthewind\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/([^"]+)"/g;
const WALKING_THE_WIND_RENAMED = {
  'Ep-7-Trinket-Changes-and-Best-in-Slots.mp3': 'Ep-8-Trinket-Changes-and-Best-in-Slots.mp3',
};

module.exports = function podcastMedia(context, {mediaUrl}) {
  return {
    name: 'podcast-media',
    async postBuild({outDir}) {
      if (!mediaUrl) {
        return;
      }
      const feed = path.join(outDir, 'podcast', 'feed.xml');
      const xml = fs.readFileSync(feed, 'utf8');
      const uploads = `${mediaUrl}/wp-content/uploads/`;
      fs.writeFileSync(
        feed,
        xml
          .replace(OLD_MEDIA, `url="${uploads}`)
          .replace(WALKING_THE_WIND, (m, file) => `url="${uploads}2017/03/${WALKING_THE_WIND_RENAMED[file] || file}"`),
      );
      fs.appendFileSync(
        path.join(outDir, '_redirects'),
        `\n# Podcast audio now lives in R2 (added at build time by src/plugins/podcast-media.js)\n` +
          `/wp-content/uploads/* ${mediaUrl}/wp-content/uploads/:splat 301\n`,
      );
    },
  };
};
