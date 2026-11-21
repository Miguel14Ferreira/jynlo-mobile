import {DEMO_MODE,request} from './api';
import {searchCommunities} from './community-api';
import {discoverSportsTeams,type SportsTeam} from './sports-teams-api';
import {venues} from './parity-api';
import {SPORTS} from './sports';
import {sessionFilters} from './global-search-core.cjs';
import type {CommunitySummary,SessionSummary,VenueSummary} from './types';

export interface PersonHit {username:string;fullName:string|null;nickname:string|null;location:string|null;profilePicUrl:string|null}
export interface GlobalSearchResults {people:PersonHit[];communities:CommunitySummary[];teams:SportsTeam[];venues:VenueSummary[];sessions:SessionSummary[];failed:string[]}

/** Searches every area at once; one failing area never hides the others. */
export async function globalSearch(query:string,token:string|null):Promise<GlobalSearchResults>{
 const q=query.trim();
 const filters=sessionFilters(q,SPORTS);
 const [people,communities,teams,places,games]=await Promise.allSettled([
  token&&!DEMO_MODE?request<PersonHit[]>('/api/profile/search?name='+encodeURIComponent(q),{token}):Promise.resolve([] as PersonHit[]),
  searchCommunities(q,'',0).then(r=>r.communities),
  discoverSportsTeams(q,token||undefined),
  venues({name:q}).then(r=>r.venues),
  // Direct request: the Explorar offline copy must not be replaced by search results.
  filters&&!DEMO_MODE?request<SessionSummary[]>('/api/sessions?'+new URLSearchParams({...filters,sort:'date'} as Record<string,string>).toString(),{token}):Promise.resolve([] as SessionSummary[]),
 ]);
 const value=<T,>(r:PromiseSettledResult<T>,fallback:T)=>r.status==='fulfilled'&&Array.isArray(r.value)?r.value:fallback;
 const failed=[['pessoas',people],['comunidades',communities],['equipas',teams],['recintos',places],['jogos',games]]
  .filter(([,r])=>(r as PromiseSettledResult<unknown>).status==='rejected').map(([name])=>name as string);
 return {
  people:value(people,[] as PersonHit[]),communities:value(communities,[] as CommunitySummary[]),
  teams:value(teams,[] as SportsTeam[]),venues:value(places,[] as VenueSummary[]),
  sessions:value(games,[] as SessionSummary[]).filter(s=>s.status==='OPEN'||s.status==='FULL'),failed,
 };
}
