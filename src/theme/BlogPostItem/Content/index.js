import React from 'react';
import Content from '@theme-original/BlogPostItem/Content';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import SearchIndexMeta, {SPEC_NAMES} from '@site/src/components/SearchIndexMeta';

// Podcast episodes carry their audio file in front matter; play it above the show notes.
// On a post's own page the body is also marked for site search (list pages are not indexed).
export default function ContentWrapper(props) {
  const {frontMatter, metadata, isBlogPostPage} = useBlogPost();
  const body = frontMatter.audio ? (
    <>
      <p>
        <audio controls preload="none" src={frontMatter.audio} style={{width: '100%'}} />
        {frontMatter.duration && <small>Length: {frontMatter.duration}</small>}
      </p>
      <Content {...props} />
    </>
  ) : (
    <Content {...props} />
  );
  if (!isBlogPostPage || metadata.unlisted) return body;
  return (
    <div data-pagefind-body>
      <SearchIndexMeta
        title={metadata.title}
        type={metadata.permalink.startsWith('/podcast/') ? 'Podcast' : 'Post'}
        date={metadata.date.slice(0, 10)}
        specs={metadata.tags.map((tag) => tag.label).filter((label) => SPEC_NAMES.includes(label))}
      />
      {body}
    </div>
  );
}
