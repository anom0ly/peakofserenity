import React from 'react';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import TOC from '@theme/TOC';
import {guideToc} from '@site/src/guideTypes';

// Same as the theme's version, plus the tab-group headings the guide layout renders from front matter.
export default function DocItemTOCDesktop() {
  const {toc, frontMatter} = useDoc();
  return (
    <TOC
      toc={[...guideToc(frontMatter), ...toc]}
      minHeadingLevel={frontMatter.toc_min_heading_level}
      maxHeadingLevel={frontMatter.toc_max_heading_level}
      className={ThemeClassNames.docs.docTocDesktop}
    />
  );
}
