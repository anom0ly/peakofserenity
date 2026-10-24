import React from 'react';
import SpecHub from '@site/src/components/SpecHub';

export default function Hub() {
  return (
    <SpecHub
      title="The War Within Mistweaver"
      spec="mistweaver"
      banner="/img/uploads/2020/08/Jari-MW.png"
      intro={[
        'Welcome to our Mistweaver Home Page!',
        'Here, you will find nearly everything you need to know about Mistweaver.',
        'Guides are consistently updated when anything changes about the spec.',
        'New articles are written about any changes to Mistweavers on Live or the PTR, many abilities that require clarification, and pretty much everything else that has to do with Mistweavers.',
        'Not sure where to start? Check below.',
      ]}
      links={[{label: 'PvE Guide', to: '/tww/mistweaver/pve-guide/'}, {label: 'Recent Articles', to: '/tag/mistweaver/'}]}
    />
  );
}
