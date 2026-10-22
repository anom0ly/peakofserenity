import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {PageMetadata, HtmlClassNameProvider, ThemeClassNames} from '@docusaurus/theme-common';
import {useBlogTagsPostsPageTitle} from '@docusaurus/theme-common/internal';
import BlogLayout from '@theme/BlogLayout';
import BlogListPaginator from '@theme/BlogListPaginator';
import SearchMetadata from '@theme/SearchMetadata';
import BlogPostItems from '@theme/BlogPostItems';
import {ArticleListHeader, SPECS} from '@site/src/components/ArticleList';

// The four spec tags are the spec "Recent Articles" pages; other tags keep the plain "tagged with" title.
export default function BlogTagsPostsPage({tag, items, sidebar, listMetadata}) {
  const defaultTitle = useBlogTagsPostsPageTitle(tag);
  const spec = SPECS.find((s) => tag.permalink.replace(/\/$/, '') === `/tag/${s.tag}`);
  const title = spec ? `${spec.label} Articles` : defaultTitle;
  const hub = spec && spec.tag !== 'general' ? `/tww/${spec.tag}/` : null;
  return (
    <HtmlClassNameProvider className={clsx(ThemeClassNames.wrapper.blogPages, ThemeClassNames.page.blogTagPostListPage)}>
      <PageMetadata title={title} description={spec ? spec.intro : tag.description} />
      <SearchMetadata tag="blog_tags_posts" />
      <BlogLayout sidebar={sidebar}>
        <ArticleListHeader
          breadcrumb={hub ? <><Link to={hub}>{spec.label}</Link> › Recent Articles</> : null}
          title={title}
          intro={spec ? spec.intro : tag.description}
          current={spec ? spec.tag : null}
        />
        <BlogPostItems items={items} />
        <BlogListPaginator metadata={listMetadata} />
      </BlogLayout>
    </HtmlClassNameProvider>
  );
}
