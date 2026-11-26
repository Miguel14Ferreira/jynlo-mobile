import type {CommunityGroup,JynloInboxSummary,SessionSummary} from './types';
export type CommunityNews={kind:'unread';count:number}|{kind:'game';gameDate:string}|{kind:'members';count:number};
export function communityNews(group:Pick<CommunityGroup,'id'|'memberCount'>,unreadById:Map<string,number>,sessions:Pick<SessionSummary,'communityId'|'gameDate'>[],now?:number):CommunityNews;
export function unreadMap(summaries:Pick<JynloInboxSummary,'kind'|'id'|'unreadCount'>[]):Map<string,number>;
