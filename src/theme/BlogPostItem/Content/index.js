import React from 'react';
import Content from '@theme-original/BlogPostItem/Content';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';

// Podcast episodes carry their audio file in front matter; play it above the show notes.
export default function ContentWrapper(props) {
  const {frontMatter} = useBlogPost();
  if (!frontMatter.audio) return <Content {...props} />;
  return (
    <>
      <p>
        <audio controls preload="none" src={frontMatter.audio} style={{width: '100%'}} />
        {frontMatter.duration && <small>Length: {frontMatter.duration}</small>}
      </p>
      <Content {...props} />
    </>
  );
}
