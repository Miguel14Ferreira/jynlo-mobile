import {DEMO_MODE,request} from './api';
import {validTournamentId} from './competition-core.cjs';
import {validPage} from './tournament-fixtures-core.cjs';
import {communityDetails} from './community-api';
import {tournamentDetails} from './competition-api';
import type {Participant} from './tournament-registration-core.cjs';

export type ParticipantPage={participants:Participant[];page:number;hasMore:boolean};
const base=(communityId:number,tournamentId:number)=>`/api/communities/${validTournamentId(communityId)}/tournaments/${validTournamentId(tournamentId)}`;
const demo=new Map<string,Participant[]>([
 ['930005:940006',[
  {profileId:31,username:'Organizador',displayName:'Organizador',joinedAt:'2026-11-03T15:00:00Z',status:'CONFIRMED'},
  {profileId:32,username:'jogador01',displayName:'Jogador 01',joinedAt:'2026-11-03T15:00:00Z',status:'CONFIRMED'},
 ]],
 ['930005:940007',[
  {profileId:31,username:'Organizador',displayName:'Organizador',joinedAt:'2026-11-03T15:00:00Z',status:'CONFIRMED'},
  {profileId:32,username:'jogador01',displayName:'Jogador 01',joinedAt:'2026-11-03T15:00:00Z',status:'PENDING'},
 ]],
]);
function auth(token:string,username:string){if(!token||!username)throw Error('Inicia sessão para continuar.');}
function key(cid:number,tid:number){return `${validTournamentId(cid)}:${validTournamentId(tid)}`;}
async function demoMember(cid:number,username:string){
 const group=await communityDetails(cid,'demo',username);
 if(!('myRole' in group)||!group.myRole)throw Error('Só membros da comunidade podem consultar inscrições.');
 return group.myRole;
}
async function demoDraft(cid:number,tid:number,username:string){
 await demoMember(cid,username);
 const details=await tournamentDetails(cid,tid,'demo',username);
 if(details.entryType==='TEAM'||details.status!=='DRAFT')throw Error('As inscrições só podem mudar antes do início de um torneio individual.');
}
export async function tournamentParticipants(cid:number,tid:number,page:number,token:string,username:string):Promise<ParticipantPage>{
 auth(token,username);const url=base(cid,tid),p=validPage(page);
 if(DEMO_MODE){await demoMember(cid,username);const entries=demo.get(key(cid,tid))||[];
  return {participants:entries.slice(p*20,(p+1)*20).map(x=>({...x})),page:p,hasMore:(p+1)*20<entries.length};}
 return request<ParticipantPage>(`${url}/participants?page=${p}`,{token});
}
/** Opt-in only. Server registers as PENDING until an authorized organizer confirms. */
export async function joinIndividualTournament(cid:number,tid:number,token:string,username:string):Promise<Participant>{
 auth(token,username);const url=base(cid,tid);
 if(DEMO_MODE){await demoDraft(cid,tid,username);const k=key(cid,tid),entries=demo.get(k)||[];
  const existing=entries.find(x=>x.username===username);if(existing)return {...existing};
  const created:Participant={profileId:990000+entries.length,username,displayName:username,joinedAt:new Date().toISOString(),status:'PENDING'};
  demo.set(k,[...entries,created]);return {...created};}
 return request<Participant>(`${url}/participants/me`,{token,method:'PUT'});
}
/** This request is made only after user confirmation. Never retry a write automatically. */
export async function leaveIndividualTournament(cid:number,tid:number,token:string,username:string):Promise<void>{
 auth(token,username);const url=base(cid,tid);
 if(DEMO_MODE){await demoDraft(cid,tid,username);const k=key(cid,tid);
  demo.set(k,(demo.get(k)||[]).filter(x=>x.username!==username));return;}
 return request<void>(`${url}/participants/me`,{token,method:'DELETE'});
}
/** Organizer-only confirmation. Backend verifies OWNER/ADMIN, membership and DRAFT. */
export async function confirmIndividualParticipant(cid:number,tid:number,profileId:number,token:string,username:string):Promise<Participant>{
 auth(token,username);const url=base(cid,tid),id=validTournamentId(profileId);
 if(DEMO_MODE){await demoDraft(cid,tid,username);const group=await communityDetails(cid,'demo',username);
  if(!('myRole' in group)||!['OWNER','ADMIN'].includes(group.myRole||''))throw Error('Apenas organizadores podem confirmar.');
  const entries=demo.get(key(cid,tid))||[],item=entries.find(x=>x.profileId===id);
  if(!item)throw Error('Inscrição não encontrada.');item.status='CONFIRMED';return {...item};}
 return request<Participant>(`${url}/participants/${id}/confirm`,{token,method:'PUT'});
}
