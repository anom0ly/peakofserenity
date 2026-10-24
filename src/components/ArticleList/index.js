import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

// The spec "Recent Articles" pages are the tag pages of the four spec tags; posts without a preview image
// show their spec's banner instead.
export const SPECS = [
  {tag: 'windwalker', label: 'Windwalker', banner: '/img/uploads/2020/08/Jari-WW.png',
   intro: 'Patch survival guides, theorycrafting and news for Windwalker Monks, newest first.'},
  {tag: 'brewmaster', label: 'Brewmaster', banner: '/img/uploads/2020/08/Jari-BrM.png',
   intro: 'Patch notes, tanking theorycrafting and news for Brewmaster Monks, newest first.'},
  {tag: 'mistweaver', label: 'Mistweaver', banner: '/img/uploads/2020/08/Jari-MW.png',
   intro: 'Healing guides, patch changes and news for Mistweaver Monks, newest first.'},
  {tag: 'general', label: 'General', banner: '/img/uploads/2020/08/Jari-General.png',
   intro: 'Articles for every Monk, newest first.'},
];
const DEFAULT_BANNER = '/img/uploads/2020/08/Jari-General.png';

function specOf(tags) {
  return SPECS.find((s) => tags.some((t) => t.permalink.replace(/\/$/, '') === `/tag/${s.tag}` || t.label.toLowerCase() === s.tag));
}

// Spec buttons above the list; `current` is a spec tag, or 'all' for the News page.
export function SpecFilter({current}) {
  return (
    <nav className={styles.filter} aria-label="Articles by spec">
      {SPECS.map((s) => (
        <Link key={s.tag} to={`/tag/${s.tag}/`}
          className={clsx(styles.pill, current === s.tag && styles.pillActive)}
          aria-current={current === s.tag ? 'page' : undefined}>
          {s.label}
        </Link>
      ))}
      <Link to="/news/" className={clsx(styles.pill, current === 'all' && styles.pillActive)}
        aria-current={current === 'all' ? 'page' : undefined}>
        All news
      </Link>
    </nav>
  );
}

export function ArticleListHeader({breadcrumb, title, intro, current}) {
  return (
    <header className={styles.header}>
      {breadcrumb && <p className={styles.breadcrumb}>{breadcrumb}</p>}
      <Heading as="h1" className={styles.title}>{title}</Heading>
      {intro && <p className={styles.intro}>{intro}</p>}
      {current && <SpecFilter current={current} />}
    </header>
  );
}

function ArticleCard({metadata}) {
  const {permalink, title, date, authors, tags, description, frontMatter} = metadata;
  const spec = specOf(tags);
  const image = frontMatter.image || spec?.banner || DEFAULT_BANNER;
  const patches = tags.filter((t) => /^\d+(\.\d+)+$/.test(t.label)).slice(0, 2);
  const day = new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'});
  return (
    <article className={styles.card}>
      <Link to={permalink} tabIndex={-1} aria-hidden="true">
        <img className={frontMatter.image ? styles.image : styles.banner} src={image} alt="" loading="lazy" />
      </Link>
      <div className={styles.body}>
        <Heading as="h2" className={styles.cardTitle}>
          <Link to={permalink}>{title}</Link>
        </Heading>
        <p className={styles.meta}>
          {authors.length > 0 && (
            <>
              by{' '}
              {authors.map((a, i) => (
                <React.Fragment key={a.key || a.name}>
                  {i > 0 && ', '}
                  {a.page ? <Link to={a.page.permalink}>{a.name}</Link> : a.name}
                </React.Fragment>
              ))}
              {' · '}
            </>
          )}
          <time dateTime={date}>{day}</time>
        </p>
        {description && <p className={styles.summary}>{description}</p>}
        {patches.length > 0 && (
          <div className={styles.tags}>
            {patches.map((t) => (
              <Link key={t.permalink} to={t.permalink} className={styles.tag}>{t.label}</Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function ArticleGrid({items}) {
  return (
    <div className={styles.grid}>
      {items.map(({content}) => (
        <ArticleCard key={content.metadata.permalink} metadata={content.metadata} />
      ))}
    </div>
  );
}
