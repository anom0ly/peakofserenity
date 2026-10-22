import React from 'react';
import clsx from 'clsx';
import {PageMetadata, HtmlClassNameProvider, ThemeClassNames} from '@docusaurus/theme-common';
import BlogLayout from '@theme/BlogLayout';
import BlogListPaginator from '@theme/BlogListPaginator';
import SearchMetadata from '@theme/SearchMetadata';
import BlogPostItems from '@theme/BlogPostItems';
import BlogListPageStructuredData from '@theme/BlogListPage/StructuredData';
import {ArticleListHeader} from '@site/src/components/ArticleList';

// News (/news/) and the podcast list (/podcast/): a heading, the spec buttons on News, then article cards.
export default function BlogListPage(props) {
  const {metadata, items, sidebar} = props;
  const {blogTitle, blogDescription, permalink} = metadata;
  // The news list's own permalink is "/" (blog-at-root moves only its route to /news/), so check for podcast instead
  const isNews = !permalink.startsWith('/podcast');
  return (
    <HtmlClassNameProvider className={clsx(ThemeClassNames.wrapper.blogPages, ThemeClassNames.page.blogListPage)}>
      <PageMetadata title={blogTitle} description={blogDescription} />
      <SearchMetadata tag="blog_posts_list" />
      <BlogListPageStructuredData {...props} />
      <BlogLayout sidebar={sidebar}>
        <ArticleListHeader title={blogTitle} intro={blogDescription} current={isNews ? 'all' : null} />
        <BlogPostItems items={items} />
        <BlogListPaginator metadata={metadata} />
      </BlogLayout>
    </HtmlClassNameProvider>
  );
}
