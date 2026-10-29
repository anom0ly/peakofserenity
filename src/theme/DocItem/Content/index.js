import React from 'react';
import Content from '@theme-original/DocItem/Content';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import GuideTabs from '@site/src/components/GuideTabs';
import SearchIndexMeta, {specsFrom} from '@site/src/components/SearchIndexMeta';
import guideTypes from '@site/src/guideTypes';

// Guides with a `guide_type` get their tab groups rendered above the Markdown body.
// Every listed guide is marked for site search; unlisted pages such as /writers/ are not.
export default function ContentWrapper(props) {
  const {frontMatter, metadata} = useDoc();
  const spec = guideTypes[frontMatter.guide_type]?.spec;
  const body = !frontMatter.guide_type ? (
    <Content {...props} />
  ) : (
    <div className={spec ? `spec-${spec}` : undefined}>
      <Content {...props}>
        <GuideTabs frontMatter={frontMatter} />
        {props.children}
      </Content>
    </div>
  );
  if (metadata.unlisted) return body;
  return (
    <div data-pagefind-body>
      <SearchIndexMeta
        title={metadata.title}
        type="Guide"
        date={metadata.lastUpdatedAt ? new Date(metadata.lastUpdatedAt).toISOString().slice(0, 10) : undefined}
        specs={specsFrom(metadata.permalink, metadata.title, frontMatter.guide_type ?? '')}
      />
      {body}
    </div>
  );
}
