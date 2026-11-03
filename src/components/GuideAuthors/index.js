import React from 'react';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import guideTypes from '@site/src/guideTypes';
import styles from './styles.module.css';

const DISCORD_URL = 'https://discord.gg/peakofserenity';

// Guide front matter lists author keys from blog/authors.yml; the News blog plugin
// (src/plugins/blog-at-root.js) shares that file's names and author-page links.
function useGuideAuthors() {
  const {frontMatter} = useDoc();
  const data = usePluginData('docusaurus-plugin-content-blog', 'default', {failfast: false});
  const known = data?.authors ?? {};
  const keys = Array.isArray(frontMatter.authors) ? frontMatter.authors : frontMatter.authors ? [frontMatter.authors] : [];
  return keys
    .filter((key) => typeof key === 'string')
    .map((key) => known[key] ?? {key, name: key, permalink: null});
}

// "A", "A and B", "A, B and C", each linked to its author page when it has one.
function AuthorNames({authors}) {
  return authors.map((a, i) => (
    <React.Fragment key={a.key}>
      {i > 0 && (i === authors.length - 1 ? ' and ' : ', ')}
      {a.permalink ? <Link to={a.permalink}>{a.name}</Link> : a.name}
    </React.Fragment>
  ));
}

// Under the title: "By Swirl · Updated Nov 3, 2026".
export function GuideByline() {
  const {metadata} = useDoc();
  const authors = useGuideAuthors();
  if (authors.length === 0) return null;
  const updated = metadata.lastUpdatedAt
    ? new Date(metadata.lastUpdatedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'})
    : null;
  return (
    <p className={styles.byline} data-pagefind-ignore>
      <span>By <AuthorNames authors={authors} /></span>
      {updated && (
        <>
          <span aria-hidden="true">·</span>
          <span>Updated <time dateTime={new Date(metadata.lastUpdatedAt).toISOString()}>{updated}</time></span>
        </>
      )}
    </p>
  );
}

// After the guide, above "Last updated on": who wrote it and where to reach them.
// It sits outside the guide body, so it takes the spec's link colours itself.
export function GuideAuthorBox() {
  const {frontMatter} = useDoc();
  const authors = useGuideAuthors();
  if (authors.length === 0) return null;
  const spec = guideTypes[frontMatter.guide_type]?.spec;
  return (
    <aside className={spec ? `${styles.box} spec-${spec}` : styles.box} data-pagefind-ignore>
      <span className={styles.label}>Written by</span>
      <span className={styles.names}><AuthorNames authors={authors} /></span>
      <span className={styles.note}>
        Questions or corrections? Find the {authors.length > 1 ? 'authors' : 'author'} in the{' '}
        <Link to={DISCORD_URL}>Peak of Serenity Discord</Link>.
      </span>
    </aside>
  );
}
