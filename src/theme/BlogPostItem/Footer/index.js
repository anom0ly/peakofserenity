import React from 'react';
import Footer from '@theme-original/BlogPostItem/Footer';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import AdSlot from '@site/src/components/AdSlot';

// Phones get the one ad below the post, since they don't show the sidebar. List pages get none.
export default function FooterWrapper(props) {
  const {isBlogPostPage} = useBlogPost();
  return (
    <>
      <Footer {...props} />
      {isBlogPostPage && <AdSlot variant="end" />}
    </>
  );
}
