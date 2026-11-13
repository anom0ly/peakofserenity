import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import BlogSidebar from '@theme/BlogSidebar';

// The theme's blog layout, with one change: a post with a table of contents uses the same columns as the guides
// (9 + 3) instead of an empty offset column plus a narrow 2-column contents rail. The wider rail fits a standard
// 160px sidebar ad at every desktop width (src/components/AdSlot). Pages without contents keep the theme's layout.
export default function BlogLayout(props) {
  const {sidebar, toc, children, ...layoutProps} = props;
  const hasSidebar = sidebar && sidebar.items.length > 0;
  return (
    <Layout {...layoutProps}>
      <div className="container margin-vert--lg">
        <div className="row">
          <BlogSidebar sidebar={sidebar} />
          <main
            className={clsx('col', {
              'col--7': hasSidebar,
              'col--9': !hasSidebar && toc,
              'col--9 col--offset-1': !hasSidebar && !toc,
            })}>
            {children}
          </main>
          {toc && <div className={clsx('col', hasSidebar ? 'col--2' : 'col--3')}>{toc}</div>}
        </div>
      </div>
    </Layout>
  );
}
