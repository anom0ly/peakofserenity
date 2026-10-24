import React from 'react';
import SpecHub from '@site/src/components/SpecHub';

export default function Hub() {
  return (
    <SpecHub
      title="The War Within Brewmaster"
      spec="brewmaster"
      banner="/img/uploads/2020/08/Jari-BrM.png"
      intro={[
        'Welcome to our Brewmaster Home Page!',
        'Here, you will find nearly everything you need to know about Brewmaster.',
        'Guides are consistently updated when anything changes about the spec.',
        'New articles are written about any changes to Brewmaster on Live or the PTR, many abilities that require clarification, and pretty much everything else that has to do with Brewmaster.',
        'Not sure where to start? Check below.',
      ]}
      links={[{label: 'PvE Guide', to: '/tww/brewmaster/pve-guide/'}, {label: 'Recent Articles', to: '/tag/brewmaster/'}]}
    />
  );
}
