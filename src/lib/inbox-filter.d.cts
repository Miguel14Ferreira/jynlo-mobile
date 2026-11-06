import type {JynloInboxSummary} from './types';

export function filterInbox(
 items:JynloInboxSummary[],
 query?:string,
 unreadOnly?:boolean
):JynloInboxSummary[];
export function unreadInboxCount(items:JynloInboxSummary[]):number;
