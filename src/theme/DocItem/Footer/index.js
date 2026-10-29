import React from 'react';
import Footer from '@theme-original/DocItem/Footer';
import AdSlot from '@site/src/components/AdSlot';

// Phones get the one ad below the guide, since they don't show the sidebar.
export default function FooterWrapper(props) {
  return (
    <>
      <Footer {...props} />
      <AdSlot variant="end" />
    </>
  );
}
