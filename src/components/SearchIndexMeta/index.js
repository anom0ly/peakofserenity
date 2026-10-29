import React from 'react';

// What site search shows for a page: its title, type (Guide, Post or Podcast), date and spec filters.
// Hidden from readers and left out of the searchable text; Pagefind still reads the meta and filters.
export default function SearchIndexMeta({title, type, date, specs = []}) {
  return (
    <div hidden data-pagefind-ignore>
      <span data-pagefind-meta="title">{title}</span>
      <span data-pagefind-meta="type">{type}</span>
      <span data-pagefind-filter="type">{type}</span>
      {date && <span data-pagefind-meta="date">{date}</span>}
      {specs.map((spec) => (
        <span key={spec} data-pagefind-filter="spec">{spec}</span>
      ))}
    </div>
  );
}

export const SPEC_NAMES = ['Brewmaster', 'Mistweaver', 'Windwalker'];

// Spec names found in a guide's address or title, e.g. "/tww/windwalker/pve-guide/" gives Windwalker.
export function specsFrom(...sources) {
  const text = sources.join(' ').toLowerCase();
  return SPEC_NAMES.filter((spec) => text.includes(spec.toLowerCase()));
}
