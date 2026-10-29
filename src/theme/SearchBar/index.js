import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useHistory, useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

// Site search box in the navbar, backed by the Pagefind index that src/plugins/pagefind.js writes at build time.
// Desktop: a box in the navbar with results underneath. Phones: a magnifier that opens search full screen.
// Results are re-ranked so guides and newer posts come before old expansion posts with the same words.

const FILTERS = ['All', 'Brewmaster', 'Mistweaver', 'Windwalker', 'Podcast'];
// How many of Pagefind's best matches are loaded and re-ranked.
const MAX_RESULTS = 40;
const FIRST_YEAR = 2016;

let pagefindPromise;
function loadPagefind(url) {
  if (!pagefindPromise) {
    pagefindPromise = import(/* webpackIgnore: true */ url).then(async (pagefind) => {
      await pagefind.options({excerptLength: 26});
      pagefind.init();
      return pagefind;
    });
    pagefindPromise.catch(() => {
      pagefindPromise = undefined;
    });
  }
  return pagefindPromise;
}

function boost(result) {
  if (result.meta.type === 'Guide') return 1.6;
  const year = parseInt(result.meta.date, 10) || FIRST_YEAR;
  const thisYear = new Date().getFullYear();
  return 0.5 + Math.min(1, Math.max(0, (year - FIRST_YEAR) / (thisYear - FIRST_YEAR)));
}

function formatDate(date) {
  if (!date) return null;
  const when = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(when.getTime())) return null;
  return when.toLocaleDateString('en-US', {month: 'short', year: 'numeric', timeZone: 'UTC'});
}

// The title with the searched words highlighted.
function Highlight({text, query}) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return text;
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return text.split(pattern).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

function SearchIcon({className}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function Search() {
  const pagefindUrl = useBaseUrl('/pagefind/pagefind.js');
  const history = useHistory();
  const location = useLocation();
  const rootRef = useRef(null);
  const boxRef = useRef(null);
  const mobileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('idle');
  const [selected, setSelected] = useState(0);

  const isPhone = () => window.matchMedia('(max-width: 996px)').matches;
  const close = () => {
    setOpen(false);
    document.activeElement?.blur();
  };
  const openSearch = () => {
    setOpen(true);
    loadPagefind(pagefindUrl).catch(() => setStatus('error'));
    (isPhone() ? mobileRef : boxRef).current?.focus();
  };

  // Close after following a result.
  useEffect(() => setOpen(false), [location.pathname]);

  // "/" jumps to search; a click outside closes it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      e.preventDefault();
      openSearch();
    };
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  });

  // On phones the mobile box only exists once the overlay is open.
  useEffect(() => {
    if (open && isPhone()) mobileRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      setStatus((s) => (s === 'error' ? s : 'idle'));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const pagefind = await loadPagefind(pagefindUrl);
        let filters = {};
        if (filter === 'Podcast') filters = {type: 'Podcast'};
        else if (filter !== 'All') filters = {spec: filter};
        const search = await pagefind.debouncedSearch(query, {filters}, 150);
        if (!search || cancelled) return;
        const top = search.results.slice(0, MAX_RESULTS);
        const data = await Promise.all(top.map((r) => r.data()));
        if (cancelled) return;
        const ranked = data
          .map((d, i) => ({d, rank: top[i].score * boost(d)}))
          .sort((a, b) => b.rank - a.rank)
          .map(({d}) => d);
        setResults(ranked);
        setTotal(search.results.length);
        setSelected(0);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, filter, pagefindUrl]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      e.preventDefault();
      history.push(results[selected].url);
    }
  };

  const inputProps = {
    type: 'search',
    value: query,
    placeholder: 'Search guides and posts',
    autoComplete: 'off',
    spellCheck: false,
    onChange: (e) => {
      setQuery(e.target.value);
      setOpen(true);
    },
    onFocus: openSearch,
    onKeyDown,
  };

  let message = null;
  if (status === 'error') {
    message = <p className={styles.empty}>Search isn&apos;t available right now. Try again after reloading the page.</p>;
  } else if (!query.trim()) {
    message = <p className={styles.empty}>Type to search guides, news posts and podcast episodes.</p>;
  } else if (status === 'ready' && !results.length) {
    message = (
      <p className={styles.empty}>
        No results for “{query}”. Try a spell name, or browse the <Link to="/tww/windwalker/">Windwalker</Link>,{' '}
        <Link to="/tww/brewmaster/">Brewmaster</Link> or <Link to="/tww/mistweaver/">Mistweaver</Link> pages.
      </p>
    );
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <label className={styles.box}>
        <SearchIcon className={styles.icon} />
        <input ref={boxRef} aria-label="Search the site" {...inputProps} />
        <kbd className={styles.kbd}>/</kbd>
      </label>
      <button type="button" className={styles.phoneButton} aria-label="Search the site" onClick={openSearch}>
        <SearchIcon className={styles.icon} />
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Search results">
          <div className={styles.phoneHead}>
            <label className={clsx(styles.box, styles.phoneBox)}>
              <SearchIcon className={styles.icon} />
              <input ref={mobileRef} aria-label="Search the site" {...inputProps} />
            </label>
            <button type="button" className={styles.cancel} onClick={close}>
              Cancel
            </button>
          </div>
          <div className={styles.chips}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={styles.chip}
                aria-pressed={f === filter}
                onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          {status === 'ready' && results.length > 0 && query.trim() && (
            <div className={styles.count}>
              {total > results.length
                ? `Best ${results.length} of ${total} results`
                : `${total} result${total === 1 ? '' : 's'}`}
            </div>
          )}
          {message}
          {query.trim() && results.length > 0 && (
            <ul className={styles.results}>
              {results.map((r, i) => (
                <li key={r.url}>
                  <Link
                    to={r.url}
                    className={clsx(styles.result, i === selected && styles.selected)}
                    onMouseEnter={() => setSelected(i)}>
                    <span className={styles.title}>
                      <Highlight text={r.meta.title || r.url} query={query} />
                    </span>
                    <span className={styles.meta}>
                      {(r.filters.spec ?? []).map((spec) => (
                        <span key={spec} className={clsx(styles.tag, styles[spec.toLowerCase()])}>
                          {spec}
                        </span>
                      ))}
                      <span>{r.meta.type}</span>
                      {formatDate(r.meta.date) && (
                        <span>
                          {r.meta.type === 'Guide' ? 'Updated ' : ''}
                          {formatDate(r.meta.date)}
                        </span>
                      )}
                    </span>
                    {/* Pagefind escapes the page text and only adds <mark> around matches. */}
                    <span className={styles.excerpt} dangerouslySetInnerHTML={{__html: r.excerpt}} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.foot}>
            <span className={styles.keys}>↑ ↓ to move · Enter to open · Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}

// The temporary migration-mode site has only three guides, so it has no search.
export default function SearchBar() {
  const {siteConfig} = useDocusaurusContext();
  if (siteConfig.customFields.migrationMode) return null;
  return <Search />;
}
