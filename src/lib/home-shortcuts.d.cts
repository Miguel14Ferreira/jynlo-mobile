export interface HomeShortcut {id: string; label: string; icon: string; href: string}
export const SHORTCUT_CATALOG: HomeShortcut[];
export const DEFAULT_SHORTCUTS: string[];
export const MAX_SHORTCUTS: number;
export function availableShortcutIds(manager: boolean, bookingsOpen: boolean): string[];
export function resolveShortcuts(saved: string[] | null, available: string[], manager: boolean): string[];
export function moveShortcut(ids: string[], index: number, step: number): string[];
