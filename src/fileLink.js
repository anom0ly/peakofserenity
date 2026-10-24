// Internal links to files (images, video, PDFs) go through as-is: pathname:// tells Docusaurus's Link
// not to treat them as pages, so no trailing slash is added.
export function fileLink(href) {
  return typeof href === 'string' && /^\/[^?#]*\/[^/?#]+\.[a-z0-9]{2,5}$/i.test(href) ? `pathname://${href}` : href;
}
