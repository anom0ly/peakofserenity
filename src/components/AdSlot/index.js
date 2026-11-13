import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

// Pages that never show ads, even though they use the guide layout.
const NO_ADS = ['/writers/'];

// Where each slot is on screen. Matches the theme's 997px breakpoint, where the table of contents column appears and
// the below-the-post slot is hidden (see styles.module.css).
const SHOWN_ON = {rail: '(min-width: 997px)', end: '(max-width: 996px)'};

// True once the browser says this slot's variant is on screen. AdSense fills the first unfilled ad unit on the page,
// so a hidden unit must not exist at all: it would take the ad meant for the visible one.
function useShown(variant) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(SHOWN_ON[variant]);
    const update = () => setShown(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [variant]);
  return shown;
}

// One AdSense slot. `rail` sits under the desktop table of contents; `end` sits below the post and only shows on
// phones and narrow tablets, where that column is hidden. See `ads` in docusaurus.config.js for the switches.
export default function AdSlot({variant}) {
  const {siteConfig} = useDocusaurusContext();
  const {pathname} = useLocation();
  const {enabled, client, slot} = siteConfig.customFields.ads;
  const shown = useShown(variant);
  if (!enabled || NO_ADS.includes(pathname)) return null;
  return (
    <aside className={clsx(styles.ad, styles[variant])} aria-label="Advertisement">
      <span className={styles.label}>Advertisement</span>
      {!slot ? (
        <div className={styles.placeholder}>Ad</div>
      ) : (
        shown && <AdUnit key={pathname} client={client} slot={slot} variant={variant} />
      )}
    </aside>
  );
}

function AdUnit({client, slot, variant}) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
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
