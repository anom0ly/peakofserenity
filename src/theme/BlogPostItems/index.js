import React from 'react';
import {ArticleGrid} from '@site/src/components/ArticleList';

// Every post list (News, tag, author and podcast pages) shows cards with a summary instead of whole posts.
export default function BlogPostItems({items}) {
  return <ArticleGrid items={items} />;
}
