import React, {useEffect, useRef} from 'react';
import clsx from 'clsx';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

// Pages that never show ads, even though they use the guide layout.
const NO_ADS = ['/writers/'];

// One AdSense slot. `rail` sits under the desktop table of contents; `end` sits below the post and only shows on
// phones and narrow tablets, where that column is hidden. See `ads` in docusaurus.config.js for the switches.
export default function AdSlot({variant}) {
  const {siteConfig} = useDocusaurusContext();
  const {pathname} = useLocation();
  const {enabled, client, slot} = siteConfig.customFields.ads;
  if (!enabled || NO_ADS.includes(pathname)) return null;
  return (
    <aside className={clsx(styles.ad, styles[variant])} aria-label="Advertisement">
      <span className={styles.label}>Advertisement</span>
      {slot ? <AdUnit key={pathname} client={client} slot={slot} variant={variant} /> : <div className={styles.placeholder}>Ad</div>}
    </aside>
  );
}

function AdUnit({client, slot, variant}) {
  const ref = useRef(null);
  useEffect(() => {
    // A hidden slot (the phone ad on desktop, or the other way round) has no width and must not be filled.
    if (!ref.current || ref.current.offsetWidth === 0) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // Ad blockers and failed loads leave the slot empty; the page carries on.
    }
  }, []);
  return (
    <ins
      ref={ref}
      className={clsx('adsbygoogle', styles.unit)}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={variant === 'rail' ? 'vertical' : 'auto'}
      data-full-width-responsive={variant === 'end' ? 'true' : undefined}
    />
  );
}
