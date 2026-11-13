'use strict';
/** Quick session competition result: report only actual team membership and outcome. */
function buildSessionCompetitionResult(outcome,players){
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
  byName.add(key);selected.push({username,team});
  if(team==='A')a++;else b++;
 }
 if(selected.length<2||selected.length>100||!a||!b)
  throw Error('Seleciona pelo menos um jogador em cada equipa.');
 return {outcome,players:selected};
}
function editableCompetitionRoster(roster){
 if(!Array.isArray(roster))throw Error('Não foi possível confirmar os jogadores inscritos.');
 const seen=new Set();
 return roster.filter(p=>{
  const username=typeof p?.username==='string'?p.username.trim():'';
  if(!Number.isSafeInteger(p?.id)||p.id<=0||!username||seen.has(username.toLowerCase()))return false;
  seen.add(username.toLowerCase());return true;
 }).map(p=>({
  id:p.id,username:p.username.trim(),
  // Only server-persisted team assignments are trusted. Never invent teams.
  team:p.teamCode==='A'||p.teamCode==='B'?p.teamCode:null,
  selected:p.teamCode==='A'||p.teamCode==='B'
 }));
}
module.exports={buildSessionCompetitionResult,editableCompetitionRoster};
