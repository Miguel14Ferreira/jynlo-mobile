export interface NavTab {id: string; label: string; icon: string; href: string; managerOnly?: boolean}
export const NAV_TAB_CATALOG: NavTab[];
export const NAV_SLOTS: number;
export const DEFAULT_NAV_TABS: string[];
export function availableNavTabs(manager: boolean): NavTab[];
export function resolveNavTabs(saved: unknown, manager: boolean): string[];
export function setNavSlot(ids: string[], slot: number, id: string): string[];
