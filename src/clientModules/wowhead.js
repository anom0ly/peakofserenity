// Docusaurus swaps pages without a full reload, so ask Wowhead to re-scan links after each navigation.
export function onRouteDidUpdate() {
  if (typeof window !== 'undefined' && window.$WowheadPower) {
    window.$WowheadPower.refreshLinks();
  }
}
