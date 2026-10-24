import React from 'react';
import SpecHub from '@site/src/components/SpecHub';

export default function Hub() {
  return (
    <SpecHub
      title="Mists Classic Windwalker"
      spec="windwalker"
      banner="/img/uploads/2020/08/Jari-WW.png"
      intro={[
        'Welcome to our Windwalker Home Page!',
        'Here, you will find nearly everything you need to know about Windwalkers in Mists of Pandaria Classic.',
        'Guides are consistently updated when anything changes about the spec.',
        'Not sure where to start? Check below.',
      ]}
      links={[{label: 'PvE Guide', to: '/mop/windwalker/pve-guide/'}]}
    />
  );
}
