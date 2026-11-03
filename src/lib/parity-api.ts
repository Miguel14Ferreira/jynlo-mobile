import {DEMO_MODE,request} from './api';
import {demoSessions} from './demo';
import type {FeedItem,MySessions,VenueSuggestionPage,VenueSummary} from './types';

const future=(day:number)=>{const d=new Date();d.setDate(d.getDate()+day);d.setHours(18,0,0,0);return d.toISOString();};
/** Explicit sample data is only shown when the app has NO API configured. */
export async function feed(token:string|null,username:string|null):Promise<FeedItem[]>{
  if(DEMO_MODE)return [
    {type:'POST',postId:910001,authorUsername:'organizador_demo',authorDisplayName:'A malta da bola',authorProfilePicUrl:null,
      content:'Mais uma futebolada esta semana. Quem alinha?',imageUrl:null,createdAt:future(-1),sessionId:null,
      sport:'Futebol',city:'Lisboa',gameDate:null,likeCount:5,likedByMe:false,commentCount:2},
    {type:'SESSION_CREATED',postId:null,authorUsername:'jogador_demo',authorDisplayName:'Rita',authorProfilePicUrl:null,
      content:null,imageUrl:null,createdAt:future(-2),sessionId:900002,
      sport:'Voleibol',city:'Odivelas',gameDate:future(3),likeCount:0,likedByMe:false,commentCount:0}
  ];
  if(!token||!username)throw new Error('Inicia sessão para veres o teu feed.');
  return request<FeedItem[]>('/api/feed',{token});
}
export async function venues(search:{name?:string;city?:string;sport?:string;page?:number}={}):Promise<VenueSuggestionPage>{
  if(DEMO_MODE){const items:VenueSummary[]=[
    {id:920001,name:'Recinto de demonstração — Lisboa',city:'Lisboa',address:'Morada não disponível na demonstração',sports:'Futebol',venueType:'Campo desportivo',latitude:null,longitude:null,lighting:true,parking:false},
    {id:920002,name:'Pavilhão de demonstração — Odivelas',city:'Odivelas',address:'Morada não disponível na demonstração',sports:'Voleibol',venueType:'Pavilhão',latitude:null,longitude:null,lighting:true,parking:true}
  ];const q=(search.name||'').toLocaleLowerCase('pt-PT');const c=(search.city||'').toLocaleLowerCase('pt-PT');const sp=(search.sport||'').toLocaleLowerCase('pt-PT');
    return {venues:items.filter(v=>v.name.toLocaleLowerCase('pt-PT').includes(q)&&v.city.toLocaleLowerCase('pt-PT').includes(c)&&(!sp||v.sports?.toLocaleLowerCase('pt-PT').includes(sp))),page:0,hasMore:false};}
  const q=new URLSearchParams({page:String(Math.max(0,Math.trunc(search.page||0)))});
  if(search.name?.trim())q.set('name',search.name.trim());
  if(search.city?.trim())q.set('city',search.city.trim());
  if(search.sport?.trim())q.set('sport',search.sport.trim());
  return request<VenueSuggestionPage>(`/api/venues/suggest?${q}`);
}
export async function venueDetails(id:number,token?:string|null):Promise<VenueSummary>{
  if(DEMO_MODE){const result=(await venues()).venues.find(x=>x.id===id);if(!result)throw new Error('Recinto de demonstração não encontrado.');return result;}
  if(!Number.isSafeInteger(id)||id<=0)throw new Error('Identificador de recinto inválido.');
  return request<VenueSummary>(`/api/venues/${id}`,{token});
}
export async function mySessions(token:string|null,username:string|null):Promise<MySessions>{
  if(!token||!username)throw new Error('Inicia sessão para veres as tuas sessões.');
  if(DEMO_MODE){const all=demoSessions({},username);return {created:username==='Tiago'?all.filter(x=>x.id===900005):[],joined:all.filter(x=>x.joinedByViewer&&!(username==='Tiago'&&x.id===900005)),waitlisted:[]};}
  return request<MySessions>('/api/sessions/mine',{token});
}
