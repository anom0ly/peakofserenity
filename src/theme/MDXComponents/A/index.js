import React from 'react';
import A from '@theme-original/MDXComponents/A';
import {fileLink} from '../../../fileLink';

// With trailingSlash on, Docusaurus adds "/" to every internal link, which breaks links to files
// (a full-size image becomes /assets/files/x.png/). File links skip that.
export default function MDXA(props) {
  return <A {...props} href={fileLink(props.href)} />;
}
