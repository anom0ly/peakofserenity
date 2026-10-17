import React from 'react';
import SpecHub from '@site/src/components/SpecHub';

export default function Hub() {
  return (
    <SpecHub
      title="The War Within Brewmaster"
      spec="brewmaster"
      banner="/img/uploads/2020/08/Jari-BrM.png"
      links={[{label: 'PvE Guide', to: '/tww/brewmaster/pve-guide/'}, {label: 'Recent Articles', to: '/category/brewmaster/'}]}
    />
  );
}
