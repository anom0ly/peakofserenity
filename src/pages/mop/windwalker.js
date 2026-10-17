import React from 'react';
import SpecHub from '@site/src/components/SpecHub';

export default function Hub() {
  return (
    <SpecHub
      title="Mists Classic Windwalker"
      spec="windwalker"
      banner="/img/uploads/2020/08/Jari-WW.png"
      links={[{label: 'PvE Guide', to: '/mop/windwalker/pve-guide/'}]}
    />
  );
}
