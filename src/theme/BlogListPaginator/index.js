import React from 'react';
import Link from '@docusaurus/Link';

export default function BlogListPaginator({metadata}) {
  const {previousPage, nextPage, page, totalPages} = metadata;
  if (!previousPage && !nextPage) return null;
  return (
    <nav className="pos-list-pager" aria-label="More articles">
      {previousPage ? <Link className="button button--secondary" to={previousPage}>← Newer articles</Link> : <span />}
      <span className="pos-list-pager__page">Page {page} of {totalPages}</span>
      {nextPage ? <Link className="button button--primary" to={nextPage}>Older articles →</Link> : <span />}
    </nav>
  );
}
