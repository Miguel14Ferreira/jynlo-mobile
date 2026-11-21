import {DEMO_MODE,request} from './api';
import {validTournamentId} from './competition-core.cjs';
import type {EventRankingKind,EventRankingResultInput} from './event-ranking-core.cjs';

export interface EventRankingPlaced {participantId:number;name:string;value:number|null;place:number|null;points:number;didNotFinish:boolean;}
export interface EventRankingEvent {id:number;name:string;heldOn:string|null;results:EventRankingPlaced[];}
export interface EventRankingRow {position:number;participantId:number;name:string;points:number;events:number;wins:number;podiums:number;best:number|null;}
export interface EventRankingOverview {
 tournamentId:number;status:string;valueKind:EventRankingKind;pointsByPlace:number[];canManage:boolean;
 participants:{id:number;name:string}[];events:EventRankingEvent[];table:EventRankingRow[];
}
const url=(c:number,t:number)=>'/api/communities/'+validTournamentId(c)+'/tournaments/'+validTournamentId(t)+'/event-ranking';
function guard(token:string,username:string,write=false){
 if(!token||!username)throw Error('Inicia sessão para continuar.');
 if(write&&DEMO_MODE)throw Error('Alterações desativadas nesta demonstração.');
}
export async function eventRankingOverview(c:number,t:number,token:string,username:string):Promise<EventRankingOverview>{
 guard(token,username);
 if(DEMO_MODE)return {tournamentId:t,status:'IN_PROGRESS',valueKind:'SCORE',pointsByPlace:[25,18,15],canManage:false,
  participants:[{id:1,name:'Ana'},{id:2,name:'Rui'}],
  events:[{id:1,name:'Prova 1',heldOn:null,results:[
   {participantId:1,name:'Ana',value:87.5,place:1,points:25,didNotFinish:false},
   {participantId:2,name:'Rui',value:80,place:2,points:18,didNotFinish:false}]}],
  table:[{position:1,participantId:1,name:'Ana',points:25,events:1,wins:1,podiums:1,best:87.5},
   {position:2,participantId:2,name:'Rui',points:18,events:1,wins:0,podiums:1,best:80}]};
 return request<EventRankingOverview>(url(c,t),{token});
}
export async function setEventRankingKind(c:number,t:number,valueKind:EventRankingKind,token:string,username:string){
 guard(token,username,true);
 return request<EventRankingOverview>(url(c,t)+'/value-kind',{token,method:'PUT',body:{valueKind}});
}
export async function setEventRankingPoints(c:number,t:number,pointsByPlace:string,token:string,username:string){
 guard(token,username,true);
 return request<EventRankingOverview>(url(c,t)+'/points',{token,method:'PUT',body:{pointsByPlace}});
}
/** Only an explicit tap calls this; never retried automatically. */
export async function saveEventRankingEvent(c:number,t:number,eventId:number|null,
 body:{name:string;heldOn:string|null;results:EventRankingResultInput[]},token:string,username:string){
 guard(token,username,true);
 return eventId
  ?request<EventRankingOverview>(url(c,t)+'/events/'+validTournamentId(eventId),{token,method:'PUT',body})
  :request<EventRankingOverview>(url(c,t)+'/events',{token,method:'POST',body});
}
export async function deleteEventRankingEvent(c:number,t:number,eventId:number,token:string,username:string){
 guard(token,username,true);
 return request<EventRankingOverview>(url(c,t)+'/events/'+validTournamentId(eventId),{token,method:'DELETE'});
}
export async function completeEventRanking(c:number,t:number,token:string,username:string){
 guard(token,username,true);
 return request<EventRankingOverview>(url(c,t)+'/complete',{token,method:'POST',body:{}});
}
