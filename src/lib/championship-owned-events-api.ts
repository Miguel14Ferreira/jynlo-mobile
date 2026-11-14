import {DEMO_MODE,request} from './api';

export type OwnedEventFormat='LEAGUE'|'CUP';
export type OwnedEvent={
 id:number;championshipId:number;name:string;format:OwnedEventFormat;
 status:string;createdAt:string;finalizedAt:string|null;
 winnerTeamId:number|null;winnerTeamName:string|null;
};
export type OwnedEventTeam={id:number;championshipTeamId:number;name:string};
export type OwnedFixture={
 id:number;round:number;match:number;homeTeamId:number;homeTeamName:string;
 awayTeamId:number;awayTeamName:string;homeScore:number|null;awayScore:number|null;
};
export type OwnedCupDraw={
 matches:OwnedFixture[];
 byes:{id:number;slot:number;teamId:number;teamName:string}[];
};
const validId=(id:number)=>{
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Identificador de competição inválido.');
 return id;
};
const base=(communityId:number,championshipId:number)=>
 '/api/communities/'+validId(communityId)+'/championships/'+validId(championshipId)+'/owned-events';
const eventPath=(communityId:number,championshipId:number,eventId:number)=>
 base(communityId,championshipId)+'/'+validId(eventId);
const requireAuth=(token:string)=>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para gerir provas do campeonato.');
};
export async function listOwnedEvents(cid:number,chid:number,token:string):Promise<OwnedEvent[]>{
 requireAuth(token);
 const data=await request<OwnedEvent[]>(base(cid,chid),{token});
 if(!Array.isArray(data))throw Error('O servidor devolveu uma lista de provas inválida.');
 return data;
}
export async function createOwnedEvent(cid:number,chid:number,token:string,name:string,format:OwnedEventFormat):Promise<OwnedEvent>{
 requireAuth(token);
 const normalized=name.trim().replace(/\s+/g,' ');
 if(!normalized||normalized.length>120||!['LEAGUE','CUP'].includes(format))
  throw Error('Indica um nome válido e escolhe Liga ou Taça.');
 return request<OwnedEvent>(base(cid,chid),{token,method:'POST',body:{name:normalized,format}});
}
export async function listOwnedEventTeams(cid:number,chid:number,eid:number,token:string):Promise<OwnedEventTeam[]>{
 requireAuth(token);
 const data=await request<OwnedEventTeam[]>(eventPath(cid,chid,eid)+'/teams',{token});
 if(!Array.isArray(data))throw Error('Não foi possível validar as equipas inscritas.');
 return data;
}
export async function registerOwnedEventTeam(cid:number,chid:number,eid:number,teamId:number,token:string):Promise<OwnedEventTeam>{
 requireAuth(token);
 return request<OwnedEventTeam>(eventPath(cid,chid,eid)+'/teams',{token,method:'POST',body:{championshipTeamId:validId(teamId)}});
}
export async function listOwnedFixtures(cid:number,chid:number,eid:number,token:string):Promise<OwnedFixture[]>{
 requireAuth(token);
 const data=await request<OwnedFixture[]>(eventPath(cid,chid,eid)+'/fixtures',{token});
 if(!Array.isArray(data))throw Error('Não foi possível validar as jornadas.');
 return data;
}
export async function scheduleOwnedLeague(cid:number,chid:number,eid:number,legs:1|2,token:string):Promise<OwnedFixture[]>{
 requireAuth(token);
 if(legs!==1&&legs!==2)throw Error('Escolhe uma ou duas voltas.');
 return request<OwnedFixture[]>(eventPath(cid,chid,eid)+'/schedule',{token,method:'POST',body:{legs}});
}
export async function getOwnedCupDraw(cid:number,chid:number,eid:number,token:string):Promise<OwnedCupDraw>{
 requireAuth(token);
 return request<OwnedCupDraw>(eventPath(cid,chid,eid)+'/cup-draw',{token});
}
export async function drawOwnedCup(cid:number,chid:number,eid:number,token:string):Promise<OwnedCupDraw>{
 requireAuth(token);
 return request<OwnedCupDraw>(eventPath(cid,chid,eid)+'/cup-draw',{token,method:'POST'});
}
export async function advanceOwnedCup(cid:number,chid:number,eid:number,token:string):Promise<OwnedCupDraw>{
 requireAuth(token);
 return request<OwnedCupDraw>(eventPath(cid,chid,eid)+'/cup-advance',{token,method:'POST'});
}
export async function recordOwnedFixtureScore(cid:number,chid:number,eid:number,fid:number,
 homeScore:number,awayScore:number,token:string):Promise<OwnedFixture>{
 requireAuth(token);
 if(!Number.isSafeInteger(homeScore)||!Number.isSafeInteger(awayScore)||
   homeScore<0||awayScore<0||homeScore>999||awayScore>999)
  throw Error('Indica resultados inteiros entre 0 e 999.');
 return request<OwnedFixture>(eventPath(cid,chid,eid)+'/fixtures/'+validId(fid)+'/score',
  {token,method:'PUT',body:{homeScore,awayScore}});
}
export async function finishOwnedLeague(cid:number,chid:number,eid:number,token:string):Promise<OwnedEvent>{
 requireAuth(token);
 return request<OwnedEvent>(eventPath(cid,chid,eid)+'/finalize-league',{token,method:'POST'});
}
export type OwnedLeagueStandings={
 standings?:Array<{teamId:number;teamName:string;position:number;played:number;won:number;drawn:number;lost:number;points:number}>;
 rows?:Array<{teamId:number;teamName:string;position:number;played:number;won:number;drawn:number;lost:number;points:number}>;
};
export async function getOwnedLeagueStandings(cid:number,chid:number,eid:number,token:string):Promise<OwnedLeagueStandings>{
 requireAuth(token);
 return request<OwnedLeagueStandings>(eventPath(cid,chid,eid)+'/standings',{token});
}
