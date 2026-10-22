import React from 'react';
import SpecHub from '@site/src/components/SpecHub';

export default function Hub() {
  return (
    <SpecHub
      title="The War Within Mistweaver"
      spec="mistweaver"
      banner="/img/uploads/2020/08/Jari-MW.png"
      links={[{label: 'PvE Guide', to: '/tww/mistweaver/pve-guide/'}, {label: 'Recent Articles', to: '/tag/mistweaver/'}]}
    />
  );
}
