import type {FeedItem} from './types';
export const MAX_ENTRIES:number;
export function feedEntryKey(item:FeedItem):string|null;
export function normalizeHiddenEntries(value:unknown):string[];
export function hideEntry(keys:string[],key:string):string[];
export function showEntry(keys:string[],key:string):string[];
