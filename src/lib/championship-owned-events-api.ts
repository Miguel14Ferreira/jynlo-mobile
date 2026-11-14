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
export async function deleteOwnedEvent(cid:number,chid:number,eid:number,token:string):Promise<void>{
 requireAuth(token);
 await request<unknown>(eventPath(cid,chid,eid),{token,method:'DELETE'});
}
export async function removeOwnedEventTeam(cid:number,chid:number,eid:number,registrationId:number,token:string):Promise<void>{
 requireAuth(token);
 await request<unknown>(eventPath(cid,chid,eid)+'/teams/'+validId(registrationId),{token,method:'DELETE'});
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
 eventId:number;totalMatches:number;playedMatches:number;completed:boolean;firstPlaceTied:boolean;
 standings:Array<{position:number;teamId:number;teamName:string;played:number;wins:number;draws:number;
 losses:number;goalsFor:number;goalsAgainst:number;goalDifference:number;points:number}>;
};
export async function getOwnedLeagueStandings(cid:number,chid:number,eid:number,token:string):Promise<OwnedLeagueStandings>{
 requireAuth(token);
 return request<OwnedLeagueStandings>(eventPath(cid,chid,eid)+'/standings',{token});
}

export type ChampionshipTeamPlayer={profileId:number;username:string;displayName:string;profilePicUrl:string|null};
export type OwnedGoal={id:number;profileId:number;scorerName:string;teamId:number;teamName:string;minute:number|null;assistProfileId:number|null;assisterName:string|null};
export type OwnedCard={id:number;profileId:number;playerName:string;teamId:number;teamName:string;cardType:'YELLOW'|'RED';minute:number|null};
export type OwnedLineup={id:number;teamId:number;profileId:number;playerName:string;selection:'STARTER'|'BENCH'};
export type OwnedSubstitution={id:number;teamId:number;teamName:string;outProfileId:number;playerOutName:string;inProfileId:number;playerInName:string;minute:number};
const fixturePath=(cid:number,chid:number,eid:number,fid:number)=>
 eventPath(cid,chid,eid)+'/fixtures/'+validId(fid);
export async function championshipTeamPlayers(cid:number,chid:number,teamId:number,token:string):Promise<ChampionshipTeamPlayer[]>{
 requireAuth(token);
 const data=await request<ChampionshipTeamPlayer[]>('/api/communities/'+validId(cid)+'/championships/'+validId(chid)+'/teams/'+validId(teamId)+'/players',{token});
 if(!Array.isArray(data))throw Error('Plantel inválido.');
 return data;
}
export async function ownedFixtureGoals(cid:number,chid:number,eid:number,fid:number,token:string):Promise<OwnedGoal[]>{
 requireAuth(token);return request<OwnedGoal[]>(fixturePath(cid,chid,eid,fid)+'/goals',{token});
}
export async function addOwnedFixtureGoal(cid:number,chid:number,eid:number,fid:number,teamId:number,profileId:number,minute:number,token:string):Promise<OwnedGoal[]>{
 requireAuth(token);return request<OwnedGoal[]>(fixturePath(cid,chid,eid,fid)+'/goals',{token,method:'POST',body:{teamId:validId(teamId),profileId:validId(profileId),minute:validMinute(minute)}});
}
export async function ownedFixtureCards(cid:number,chid:number,eid:number,fid:number,token:string):Promise<OwnedCard[]>{
 requireAuth(token);return request<OwnedCard[]>(fixturePath(cid,chid,eid,fid)+'/cards',{token});
}
export async function addOwnedFixtureCard(cid:number,chid:number,eid:number,fid:number,teamId:number,profileId:number,cardType:'YELLOW'|'RED',minute:number,token:string):Promise<OwnedCard[]>{
 requireAuth(token);
 if(cardType!=='YELLOW'&&cardType!=='RED')throw Error('Tipo de cartão inválido.');
 return request<OwnedCard[]>(fixturePath(cid,chid,eid,fid)+'/cards',{token,method:'POST',body:{teamId:validId(teamId),profileId:validId(profileId),cardType,minute:validMinute(minute)}});
}
export async function ownedFixtureLineup(cid:number,chid:number,eid:number,fid:number,token:string):Promise<OwnedLineup[]>{
 requireAuth(token);return request<OwnedLineup[]>(fixturePath(cid,chid,eid,fid)+'/lineup',{token});
}
export async function setOwnedFixtureLineup(cid:number,chid:number,eid:number,fid:number,teamId:number,profileId:number,selection:'STARTER'|'BENCH',token:string):Promise<OwnedLineup[]>{
 requireAuth(token);
 if(selection!=='STARTER'&&selection!=='BENCH')throw Error('Posição inválida.');
 return request<OwnedLineup[]>(fixturePath(cid,chid,eid,fid)+'/lineup',{token,method:'PUT',body:{teamId:validId(teamId),profileId:validId(profileId),selection}});
}
export async function ownedFixtureSubstitutions(cid:number,chid:number,eid:number,fid:number,token:string):Promise<OwnedSubstitution[]>{
 requireAuth(token);return request<OwnedSubstitution[]>(fixturePath(cid,chid,eid,fid)+'/substitutions',{token});
}
export async function addOwnedFixtureSubstitution(cid:number,chid:number,eid:number,fid:number,teamId:number,outProfileId:number,inProfileId:number,minute:number,token:string):Promise<OwnedSubstitution[]>{
 requireAuth(token);
 if(outProfileId===inProfileId)throw Error('Seleciona jogadores diferentes.');
 return request<OwnedSubstitution[]>(fixturePath(cid,chid,eid,fid)+'/substitutions',{token,method:'POST',body:{teamId:validId(teamId),outProfileId:validId(outProfileId),inProfileId:validId(inProfileId),minute:validMinute(minute)}});
}
function validMinute(minute:number):number{
 if(!Number.isSafeInteger(minute)||minute<0||minute>200)throw Error('O minuto deve estar entre 0 e 200.');
 return minute;
}

export async function removeOwnedFixtureGoal(cid:number,chid:number,eid:number,fid:number,goalId:number,token:string):Promise<void>{
 requireAuth(token);
 await request<unknown>(fixturePath(cid,chid,eid,fid)+'/goals/'+validId(goalId),{token,method:'DELETE'});
}
export async function removeOwnedFixtureCard(cid:number,chid:number,eid:number,fid:number,cardId:number,token:string):Promise<void>{
 requireAuth(token);
 await request<unknown>(fixturePath(cid,chid,eid,fid)+'/cards/'+validId(cardId),{token,method:'DELETE'});
}
export async function removeOwnedFixtureSubstitution(cid:number,chid:number,eid:number,fid:number,substitutionId:number,token:string):Promise<void>{
 requireAuth(token);
 await request<unknown>(fixturePath(cid,chid,eid,fid)+'/substitutions/'+validId(substitutionId),{token,method:'DELETE'});
}
export async function removeOwnedFixtureLineup(cid:number,chid:number,eid:number,fid:number,profileId:number,token:string):Promise<void>{
 requireAuth(token);
 await request<unknown>(fixturePath(cid,chid,eid,fid)+'/lineup/'+validId(profileId),{token,method:'DELETE'});
}
