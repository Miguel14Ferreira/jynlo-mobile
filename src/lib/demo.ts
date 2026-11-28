import type { SessionSummary, SessionDetail, SessionParticipant, PublicSessionPreview, SessionFilters, PendingSessionInvite, JoinSessionResponse } from './types';

const future = (days: number, hour: number) => {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d.toISOString();
};
const SEED: SessionSummary[] = [
  { id: 900001, sport: 'Futebol', city: 'Lisboa', gameDate: future(2, 20),
    distanceKm: 2.1, participantCount: 5, maxParticipants: 10, priceAmount: 3,
    privateGame: false, status: 'OPEN' },
  { id: 900002, sport: 'Voleibol', city: 'Odivelas', gameDate: future(3, 19),
    distanceKm: 5.4, participantCount: 8, maxParticipants: 12, priceAmount: 0,
    privateGame: false, status: 'OPEN' },
  { id: 900003, sport: 'Karting', city: 'Lisboa', gameDate: future(5, 18),
    distanceKm: 7.8, participantCount: 7, maxParticipants: 8, priceAmount: 20,
    privateGame: false, status: 'OPEN' },
  { id: 900005, sport: 'Futebol', city: 'Lisboa', gameDate: future(4, 21),
    distanceKm: 3, participantCount: 0, maxParticipants: 10, priceAmount: 0,
    privateGame: false, status: 'OPEN' }
];
const joined = new Map<number, Set<string>>();
const waitlisted = new Map<number, string[]>();
const invites: (PendingSessionInvite & {username:string})[] = [];
const cancelled = new Set<number>();
let nextInviteId = 990001;
function demoNames(id: number): string[] {
  const base = id === 900005 ? ['Tiago'] : [
    'jogador01','jogador02','jogador03','jogador04','jogador05',
    ...(id === 900002 ? ['jogador06','jogador07','jogador08'] : []),
    ...(id === 900003 ? ['jogador06','jogador07'] : [])
  ];
  return [...base, ...(joined.get(id) ? Array.from(joined.get(id)!) : [])];
}
function current(id: number, username?: string): SessionSummary {
  const raw = SEED.find(s => s.id === id);
  if (!raw) throw new Error('Jogo de demonstração não encontrada.');
  const names = demoNames(id);
  return { ...raw, participantCount:names.length,
    joinedByViewer: Boolean(username && names.includes(username)),
    waitlistedByViewer: Boolean(username && waitlisted.get(id)?.includes(username)),
    status: cancelled.has(id) ? 'CANCELLED' : names.length >= raw.maxParticipants ? 'FULL' : 'OPEN' };
}
export const demoSessions = (filters: SessionFilters, username?: string): SessionSummary[] =>
  SEED.map(s=>current(s.id,username)).filter(s =>
    (!filters.sport || s.sport.toLocaleLowerCase('pt-PT').includes(filters.sport.toLocaleLowerCase('pt-PT'))) &&
    (!filters.city || s.city.toLocaleLowerCase('pt-PT').includes(filters.city.toLocaleLowerCase('pt-PT'))) &&
    (!filters.availableOnly || (s.status === 'OPEN' && s.participantCount < s.maxParticipants))
  );
export const demoPreview = (id:number): PublicSessionPreview => {
  const s=current(id);return {id:s.id,sport:s.sport,city:s.city,gameDate:s.gameDate,
    participantCount:s.participantCount,maxParticipants:s.maxParticipants,
    priceAmount:s.priceAmount,status:s.status,gamePhoto:null,venueName:null,address:null};
};
export const demoDetail = (id:number,username:string):SessionDetail => {
  const s=current(id,username);return {...s, creatorUsername:id===900005?'Tiago':'organizador_demo',
    joined:Boolean(s.joinedByViewer),waitlisted:Boolean(s.waitlistedByViewer),
    waitlistPosition:username&&waitlisted.get(id)?.includes(username)?waitlisted.get(id)!.indexOf(username)+1:null,
    address:'Morada fictícia apenas para demonstração',
    meetingPointInstructions:'Entrada do recinto (demonstração)',
    canSeeExactAddress:Boolean(s.joinedByViewer),gamePhoto:null,minParticipants:6};
};
export const demoParticipants = (id:number):SessionParticipant[] => demoNames(id).map((name,index)=>({
  id:index+1,username:name,joinedAt:new Date().toISOString(),attendanceStatus:'PENDING'}
));
export const demoJoin = (id:number,username:string):JoinSessionResponse => {
  const s=current(id,username);
  if(s.joinedByViewer)return {state:'PARTICIPANT',waitlistPosition:null};
  if(s.waitlistedByViewer)return {state:'WAITLISTED',waitlistPosition:waitlisted.get(id)!.indexOf(username)+1};
  if(s.status==='CANCELLED'||s.status==='COMPLETED') throw new Error('Este jogo está encerrado.');
  if(s.status!=='OPEN' && s.status!=='FULL') throw new Error('Inscrição indisponível.');
  if(s.status==='FULL'){
    if(!waitlisted.has(id))waitlisted.set(id,[]);
    const queue=waitlisted.get(id)!;queue.push(username);
    return {state:'WAITLISTED',waitlistPosition:queue.length};
  }
  if(!joined.has(id))joined.set(id,new Set());
  joined.get(id)!.add(username);
  return {state:'PARTICIPANT',waitlistPosition:null};
};
export function demoLeave(id:number,username:string):void {
  if(joined.get(id)?.delete(username))return;
  const queue=waitlisted.get(id);
  if(queue?.includes(username)){queue.splice(queue.indexOf(username),1);return;}
  throw new Error('Não há presença para cancelar.');
}
export function demoCancel(id:number,username:string):void {
  if(id!==900005||username!=='Tiago')throw new Error('Só o organizador pode cancelar.');
  cancelled.add(id);
}
export function demoInvites(username:string):PendingSessionInvite[]{
  return invites.filter(i=>i.username===username).map(({username:_ignore,...rest})=>rest);
}
export function demoInvitePlayer(id:number,organizer:string,username:string):{id:number}{
  if(id!==900005||organizer!=='Tiago')throw new Error('Apenas o organizador pode convidar.');
  if(!username.trim()||username.toLowerCase()===organizer.toLowerCase())throw new Error('Escolhe outro utilizador.');
  if(cancelled.has(id))throw new Error('Jogo cancelado.');
  if(invites.some(i=>i.sessionId===id&&i.username===username))throw new Error('Já existe um convite pendente.');
  const invite:PendingSessionInvite&{username:string}={id:nextInviteId++,sessionId:id,username,inviterUsername:organizer,createdAt:new Date().toISOString(),sport:'Futebol',city:'Lisboa',gameDate:current(id).gameDate,status:current(id).status};
  invites.push(invite);return {id:invite.id};
}
export function demoRespondInvite(sessionId:number,inviteId:number,username:string,accept:boolean):JoinSessionResponse|void {
  const index=invites.findIndex(i=>i.sessionId===sessionId&&i.id===inviteId&&i.username===username);
  if(index<0)throw new Error('Convite não encontrado.');
  if(cancelled.has(sessionId))throw new Error('Jogo cancelado.');
  const result=accept?demoJoin(sessionId,username):undefined;
  invites.splice(index,1);
  return result;
}

