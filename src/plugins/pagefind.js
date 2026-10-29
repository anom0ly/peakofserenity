// Site search: after the build, Pagefind indexes the finished HTML and writes the index to build/pagefind/.
// Only pages marked with data-pagefind-body are indexed (guides, news posts and podcast episodes; see
// src/components/SearchIndexMeta). The search box is src/theme/SearchBar.
const path = require('path');

module.exports = function pagefind() {
  return {
    name: 'pagefind',
    async postBuild({outDir}) {
      const pf = await import('pagefind');
      const {index, errors} = await pf.createIndex();
      if (!index) {
        throw new Error(`Pagefind could not start: ${errors.join('; ')}`);
      }
      const added = await index.addDirectory({path: outDir});
      if (added.errors.length) {
        throw new Error(`Pagefind indexing failed: ${added.errors.join('; ')}`);
      }
      await index.writeFiles({outputPath: path.join(outDir, 'pagefind')});
      await pf.close();
      console.log(`[pagefind] Indexed ${added.page_count} pages for site search.`);
    },
  };
};
