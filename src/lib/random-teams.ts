import type {SessionParticipant,SessionTeamSuggestion,SessionTeamPlayer} from './types';

/** Local preview only. Server remains authoritative for saved team assignments. */
export function drawRandomTeams(participants:SessionParticipant[],random:()=>number=Math.random):SessionTeamSuggestion{
 const eligible=participants.filter(p=>p.username?.trim()&&p.attendanceStatus!=='NO_SHOW'&&p.attendanceStatus!=='LATE_CANCELLED');
 const seen=new Set<string>();
 const unique=eligible.filter(p=>{const name=p.username.trim().toLocaleLowerCase();if(seen.has(name))return false;seen.add(name);return true;});
 if(unique.length<2)throw Error('São necessários pelo menos dois jogadores identificados para sortear equipas.');
 const shuffled=[...unique];
 for(let i=shuffled.length-1;i>0;i--){
  const r=random();
  if(!Number.isFinite(r)||r<0||r>=1)throw Error('Não foi possível realizar o sorteio.');
  const j=Math.floor(r*(i+1));
  const current=shuffled[i]!;
  shuffled[i]=shuffled[j]!;
  shuffled[j]=current;
 }
 const players=shuffled.map((p):SessionTeamPlayer=>({
  username:p.username,displayName:p.username,guest:false,strengthScore:0,statsAvailable:false,
  games:0,wins:0,goals:0,assists:0
 }));
 const midpoint=Math.ceil(players.length/2);
 return {teamA:players.slice(0,midpoint),teamB:players.slice(midpoint),teamAScore:0,teamBScore:0,playersWithStats:0,totalPlayers:players.length};
}
