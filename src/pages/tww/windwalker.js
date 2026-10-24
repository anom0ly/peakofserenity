import React from 'react';
import SpecHub from '@site/src/components/SpecHub';

export default function Hub() {
  return (
    <SpecHub
      title="The War Within Windwalker"
      spec="windwalker"
      banner="/img/uploads/2020/08/Jari-WW.png"
      intro={[
        'Welcome to our Windwalker Home Page!',
        'Here, you will find nearly everything you need to know about Windwalkers.',
        'Guides are consistently updated when anything changes about the spec.',
        'New articles are written about any changes to Windwalkers on Live or the PTR, many abilities that require clarification, and pretty much everything else that has to do with Windwalkers.',
        'Not sure where to start? Check below.',
      ]}
      links={[{label: 'PvE Guide', to: '/tww/windwalker/pve-guide/'}, {label: 'Recent Articles', to: '/tag/windwalker/'}]}
    />
  );
}
