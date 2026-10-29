import React from 'react';
import clsx from 'clsx';
import TOC from '@theme-original/TOC';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import AdSlot from '@site/src/components/AdSlot';
import styles from './styles.module.css';

// With ads on, the desktop table of contents (guides and posts) gets the sidebar ad under it. The column sticks as a
// whole and the contents list scrolls on its own, so the ad stays on screen.
export default function TOCWrapper({className, ...props}) {
  const {siteConfig} = useDocusaurusContext();
  if (!siteConfig.customFields.ads.enabled) return <TOC className={className} {...props} />;
  return (
    <div className={styles.rail}>
      <TOC className={clsx(className, styles.toc)} {...props} />
      <AdSlot variant="rail" />
    </div>
  );
}
