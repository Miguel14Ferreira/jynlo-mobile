import type {JynloInboxSummary} from './types';
export function filterAuthorizedSummaries(
 kind:'community'|'session',
 allowed:ReadonlyMap<string,string>,
 raw:unknown,
 fallbackTitle:string
):JynloInboxSummary[];

export function filterAuthorizedDirectSummaries(
 allowed:ReadonlyMap<string,string>,
 raw:unknown
):JynloInboxSummary[];
