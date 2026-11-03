import React from 'react';
import Footer from '@theme-original/DocItem/Footer';
import AdSlot from '@site/src/components/AdSlot';
import {GuideAuthorBox} from '@site/src/components/GuideAuthors';

// The "Written by" box sits above "Last updated on". Phones get the one ad below the guide, since they don't show the sidebar.
export default function FooterWrapper(props) {
  return (
    <>
      <GuideAuthorBox />
      <Footer {...props} />
      <AdSlot variant="end" />
    </>
  );
}
