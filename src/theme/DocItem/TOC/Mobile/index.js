import React from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import TOCCollapsible from '@theme/TOCCollapsible';
import {guideToc} from '@site/src/guideTypes';
import styles from './styles.module.css';

// Same as the theme's version, plus the tab-group headings the guide layout renders from front matter.
export default function DocItemTOCMobile() {
  const {toc, frontMatter} = useDoc();
  return (
    <TOCCollapsible
      toc={[...guideToc(frontMatter), ...toc]}
      minHeadingLevel={frontMatter.toc_min_heading_level}
      maxHeadingLevel={frontMatter.toc_max_heading_level}
      className={clsx(ThemeClassNames.docs.docTocMobile, styles.tocMobile)}
    />
  );
}
