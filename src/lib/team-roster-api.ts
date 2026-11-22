import {fetch as expoFetch} from 'expo/fetch';
import {File} from 'expo-file-system';
import type {DocumentPickerAsset} from 'expo-document-picker';
import {API_BASE,DEMO_MODE,request} from './api';

export type RosterRowStatus='INVITE'|'ALREADY_IN_TEAM'|'NEW'|'DUPLICATE'|'UNKNOWN_USERNAME';
export type TeamRosterPreview={rows:{line:number;name:string;shirtNumber:number|null;position:string|null;username:string|null;status:RosterRowStatus}[];
 invites:number;newPlayers:number;skipped:number;warnings:string[]};
export type TeamRosterEntry={id:number;name:string;shirtNumber:number|null;position:string|null;username:string|null;memberStatus:'INVITED'|'ACTIVE'|'DECLINED'|null;hasClaimLink?:boolean};
export type TeamRosterSuggestion={entryId:number;entryName:string;shirtNumber:number|null;profileId:number;username:string;fullName:string|null};
export type TeamRosterClaim={teamId:number;teamName:string;teamSlug:string;name:string;shirtNumber:number|null;position:string|null;alreadyLinked:boolean};
export const ROSTER_MAX_BYTES=2*1024*1024;
const ACCEPTED=/\.(xlsx|xls|csv|tsv)$/i;

function base(teamId:number){
 if(!Number.isSafeInteger(teamId)||teamId<=0)throw Error('Equipa inválida.');
 return '/api/teams/'+teamId+'/roster';
}
export function checkRosterAsset(asset:Pick<DocumentPickerAsset,'name'|'size'>){
 if(!ACCEPTED.test(asset.name||''))throw Error('Escolhe um ficheiro .xlsx, .xls, .csv ou .tsv.');
 if(typeof asset.size==='number'&&asset.size>ROSTER_MAX_BYTES)throw Error('O ficheiro não pode ultrapassar 2 MB.');
}
async function upload<T>(teamId:number,token:string|null,asset:DocumentPickerAsset,confirm:boolean):Promise<T>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para importar o plantel.');
 checkRosterAsset(asset);
 const file=new File(asset.uri);
 if(!file.exists)throw Error('O ficheiro selecionado já não está disponível.');
 const form=new FormData();
 form.append('file',file as unknown as Blob,asset.name.replace(/[\\/\x00-\x1f\x7f]/g,'_').slice(-140));
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await expoFetch(API_BASE+base(teamId)+(confirm?'/import':'/import/preview'),{
   method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   credentials:'omit',redirect:'error',body:form,signal:controller.signal
  });
  if(!response.ok){
   let message='';
   try{message=String((await response.json() as {message?:string}).message||'');}catch{/* no body */}
   if(response.status===403)throw Error('Apenas o responsável pode gerir o plantel.');
   throw Error(message||'Não foi possível ler o ficheiro.');
  }
  return await response.json() as T;
 }finally{clearTimeout(timeout);}
}
export const previewRosterImport=(teamId:number,token:string|null,asset:DocumentPickerAsset)=>upload<TeamRosterPreview>(teamId,token,asset,false);
export const importRoster=(teamId:number,token:string|null,asset:DocumentPickerAsset)=>upload<{invited:number;added:number;skipped:number}>(teamId,token,asset,true);
export function teamRoster(teamId:number,token:string|null):Promise<TeamRosterEntry[]>{
 if(DEMO_MODE||!token)return Promise.resolve([]);
 return request<TeamRosterEntry[]>(base(teamId),{token});
}
export function removeRosterEntry(teamId:number,token:string|null,entryId:number):Promise<void>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para gerir o plantel.');
 return request<void>(base(teamId)+'/'+entryId,{token,method:'DELETE'});
}

const CLAIM=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function needToken(token:string|null):string{if(DEMO_MODE||!token)throw Error('Inicia sessão para continuar.');return token;}
export const ROSTER_CLAIM_ORIGIN='https://jynlosports.com';
export async function rosterClaimLink(teamId:number,token:string|null,entryId:number):Promise<string>{
 const link=await request<{token:string;path:string}>(base(teamId)+'/'+entryId+'/claim-link',{token:needToken(token),method:'POST'});
 if(!CLAIM.test(link?.token||''))throw Error('Não foi possível criar o convite.');
 return ROSTER_CLAIM_ORIGIN+'/menu/teams/claim/'+link.token;
}
export const linkRosterEntry=(teamId:number,token:string|null,entryId:number,profileId:number)=>
 request<TeamRosterEntry>(base(teamId)+'/'+entryId+'/link',{token:needToken(token),method:'POST',body:{profileId}});
export const unlinkRosterEntry=(teamId:number,token:string|null,entryId:number)=>
 request<void>(base(teamId)+'/'+entryId+'/link',{token:needToken(token),method:'DELETE'});
export const updateRosterEntry=(teamId:number,token:string|null,entryId:number,line:{name:string;shirtNumber:number|null;position:string|null})=>
 request<TeamRosterEntry>(base(teamId)+'/'+entryId,{token:needToken(token),method:'PUT',body:line});
export const rosterSuggestions=(teamId:number,token:string|null)=>
 DEMO_MODE||!token?Promise.resolve([] as TeamRosterSuggestion[]):request<TeamRosterSuggestion[]>(base(teamId)+'/suggestions',{token});
export function rosterClaim(claim:string,token:string|null):Promise<TeamRosterClaim>{
 if(!CLAIM.test(claim))return Promise.reject(Error('Link inválido ou já usado.'));
 return request<TeamRosterClaim>('/api/teams/roster-claims/'+claim,{token:needToken(token)});
}
export function acceptRosterClaim(claim:string,token:string|null):Promise<TeamRosterClaim>{
 if(!CLAIM.test(claim))return Promise.reject(Error('Link inválido ou já usado.'));
 return request<TeamRosterClaim>('/api/teams/roster-claims/'+claim+'/accept',{token:needToken(token),method:'POST'});
}
