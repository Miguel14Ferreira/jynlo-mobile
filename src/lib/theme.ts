export const C = {
  background: '#061820', surface: '#102932', surface2: '#15343D',
  surface3: '#20434A', mint: '#7AE5C5', green: '#3DCDA5',
  white: '#F4FAF9', muted: '#99B2B5', border: '#27444B',
  warning: '#EAC081', danger: '#F2A19B',
};

/** Shared design tokens for the native Jynlo experience.
 * Keep the original C palette stable for older screens during migration.
 */
export const MobileTheme = {
  colors: {
    background:'#051824',
    surface:'#082635',
    raised:'#092D3A',
    border:'#0B5264',
    accent:'#22DFCB',
    text:'#F6FCFE',
    muted:'#A6C6CD',
    danger:'#FF7797',
    tabBackground:'#06121D',
    tabInactive:'#85A8B0',
  },
  spacing:{xs:4,sm:8,md:12,lg:16,xl:24,xxl:32},
  radius:{sm:10,md:14,lg:18,xl:24,pill:999},
  touchTarget:44,
  typography:{
    label:11,
    body:14,
    title:18,
    headline:24,
  },
} as const;
