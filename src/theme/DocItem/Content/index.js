import React from 'react';
import Content from '@theme-original/DocItem/Content';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import GuideTabs from '@site/src/components/GuideTabs';
import guideTypes from '@site/src/guideTypes';

// Guides with a `guide_type` get their tab groups rendered above the Markdown body.
export default function ContentWrapper(props) {
  const {frontMatter} = useDoc();
  if (!frontMatter.guide_type) return <Content {...props} />;
  const spec = guideTypes[frontMatter.guide_type]?.spec;
  return (
    <div className={spec ? `spec-${spec}` : undefined}>
      <Content {...props}>
        <GuideTabs frontMatter={frontMatter} />
        {props.children}
      </Content>
    </div>
  );
}
