import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import NotFoundContent from '@theme-original/NotFound/Content';

// In migration mode every page that isn't built yet lands here, so point visitors at the guides that are.
export default function NotFoundContentWrapper(props) {
  const {siteConfig} = useDocusaurusContext();
  if (!siteConfig.customFields.migrationMode) {
    return <NotFoundContent {...props} />;
  }
  return (
    <main className={clsx('container margin-vert--xl', props.className)}>
      <div className="row">
        <div className="col col--6 col--offset-3">
          <Heading as="h1">This page hasn't moved over yet</Heading>
          <p>
            We're in the middle of moving Peak of Serenity to a new home, and articles, news and the podcast are
            offline until we finish. Our spec guides are up now:
          </p>
          <ul>
            <li><Link to="/tww/brewmaster/pve-guide/">Brewmaster Tank Guide</Link></li>
            <li><Link to="/tww/mistweaver/pve-guide/">Mistweaver PvE Quick Guide</Link></li>
            <li><Link to="/tww/windwalker/pve-guide/">Windwalker PvE Guide</Link></li>
          </ul>
          <p>
            Looking for something specific? Ask on <Link href="https://discord.gg/peakofserenity">Discord</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
