'use strict';
/** Quick session competition result: report only actual team membership and outcome. */
function optionalStat(value,label){
 if(value===undefined||value===null||value==='')return null;
 const normalized=String(value).trim();
 if(!/^(?:0|[1-9][0-9]?)$/.test(normalized))
  throw Error(label+' deve ser um número inteiro entre 0 e 99.');
 return Number(normalized);
}
function buildSessionCompetitionResult(outcome,players,sport=null,scoreA='',scoreB=''){
 if(!['A','B','DRAW'].includes(outcome))throw Error('Escolhe Equipa A, Equipa B ou empate.');
 if(!Array.isArray(players))throw Error('A lista de jogadores não está disponível.');
 const byName=new Set(),selected=[];
 let a=0,b=0;
 for(const player of players){
  if(!player?.selected)continue;
  const username=typeof player.username==='string'?player.username.trim():'';
  const team=player.team;
  const key=username.toLowerCase();
  if(!username||!['A','B'].includes(team)||byName.has(key))
    throw Error('Verifica os jogadores e as equipas antes de registar o resultado.');
  const goals=optionalStat(player.goals,'Golos');
  const assists=optionalStat(player.assists,'Assistências');
  if((goals!==null||assists!==null)&&sport!=='Futebol')
   throw Error('Golos e assistências só podem ser registados em sessões de Futebol.');
  byName.add(key);
  selected.push(goals!==null||assists!==null
   ?{username,team,...(goals!==null?{goals}:{}),...(assists!==null?{assists}:{})}
   :{username,team});
  if(team==='A')a++;else b++;
 }
 if(selected.length<2||selected.length>100||!a||!b)
  throw Error('Seleciona pelo menos um jogador em cada equipa.');
 const hasA=String(scoreA??'').trim().length>0;
 const hasB=String(scoreB??'').trim().length>0;
 if(hasA!==hasB)throw Error('Preenche os dois resultados ou deixa os dois vazios.');
 if(!hasA)return {outcome,players:selected};
 if(sport!=='Futebol')throw Error('O marcador oficial só pode ser registado para Futebol.');
 const aScore=optionalStat(scoreA,'Golos da Equipa A');
 const bScore=optionalStat(scoreB,'Golos da Equipa B');
 const winner=aScore===bScore?'DRAW':aScore>bScore?'A':'B';
 if(outcome!==winner)throw Error('O vencedor ou empate não corresponde ao marcador.');
 const goalsA=selected.filter(p=>p.team==='A').reduce((sum,p)=>sum+(p.goals||0),0);
 const goalsB=selected.filter(p=>p.team==='B').reduce((sum,p)=>sum+(p.goals||0),0);
 if(goalsA>aScore||goalsB>bScore)
  throw Error('Os golos atribuídos aos jogadores excedem o marcador oficial.');
 return {outcome,players:selected,scoreA:aScore,scoreB:bScore};
}
function editableCompetitionRoster(roster){
 if(!Array.isArray(roster))throw Error('Não foi possível confirmar os jogadores inscritos.');
 const seen=new Set();
 return roster.filter(p=>{
  const username=typeof p?.username==='string'?p.username.trim():'';
  if(!Number.isSafeInteger(p?.id)||p.id<=0||!username||seen.has(username.toLowerCase())||
     ['NO_SHOW','LATE_CANCELLED'].includes(p.attendanceStatus))return false;
  seen.add(username.toLowerCase());return true;
 }).map(p=>({
  id:p.id,username:p.username.trim(),
  // Only server-persisted team assignments are trusted. Never invent teams.
  team:p.teamCode==='A'||p.teamCode==='B'?p.teamCode:null,
  selected:p.teamCode==='A'||p.teamCode==='B',
  goals:'',assists:''
 }));
}
/** An older backend may accept unknown JSON fields but silently drop stats.
 * Verify persisted player values before claiming they were recorded. */
function confirmedPlayerStatistics(payload,round){
 const reported=(payload?.players||[]).filter(p=>p.goals!==undefined||p.assists!==undefined);
 if(!reported.length)return true;
 if(!Array.isArray(round?.entries))return false;
 const byUsername=new Map();
 for(const entry of round.entries){
  if(typeof entry?.username==='string')byUsername.set(entry.username.toLowerCase(),entry);
 }
 return reported.every(player=>{
  const actual=byUsername.get(player.username.toLowerCase());
  return actual&&
   (player.goals===undefined||actual.goals===player.goals)&&
   (player.assists===undefined||actual.assists===player.assists);
 });
}
function confirmedOfficialScore(payload,round){
 if(payload?.scoreA===undefined&&payload?.scoreB===undefined)return true;
 return round?.teamScore?.sideA===payload.scoreA&&round?.teamScore?.sideB===payload.scoreB;
}
module.exports={buildSessionCompetitionResult,editableCompetitionRoster,optionalStat,confirmedPlayerStatistics,confirmedOfficialScore};
