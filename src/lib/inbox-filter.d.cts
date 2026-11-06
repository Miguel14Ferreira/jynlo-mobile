import type {JynloInboxSummary} from './types';

export function filterInbox(
 items:JynloInboxSummary[],
 query?:string,
 unreadOnly?:boolean
):JynloInboxSummary[];
export function unreadInboxCount(items:JynloInboxSummary[]):number;

export function formatInboxTime(value:string|null|undefined):string;
export function formatUnreadBadge(value:number|null|undefined):string;
