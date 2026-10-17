import React from 'react';
import Link from '@docusaurus/Link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Renders one Markdown front-matter field. Raw HTML is allowed for coloured text and complex tables.
const components = {
  a: ({href = '', children, ...props}) =>
    href.startsWith('/') ? <Link to={href}>{children}</Link> : <a href={href} {...props}>{children}</a>,
};

export default function Field({value}) {
  if (!value) return null;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
      {value}
    </ReactMarkdown>
  );
}
