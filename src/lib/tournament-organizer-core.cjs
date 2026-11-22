'use strict';
const {tr}=require('./i18n-core.cjs');
const {classificationKind}=require('./competition-core.cjs');
/** A presentation guard, not authorization. Every action is rechecked by the server. */
function isOrganizer(role){return role==='OWNER'||role==='ADMIN';}
function organizerFixtureType(tournament){
 if(!tournament||typeof tournament!=='object')return null;
 const kind=classificationKind(tournament);
 if(tournament.entryType==='TEAM'&&kind==='TEAM')return 'TEAM';
 if(tournament.entryType!=='TEAM'&&tournament.format==='LEAGUE'&&(kind==='INDIVIDUAL'||kind==='CHESS'))return 'INDIVIDUAL';
 return null;
}
function canGenerateSchedule(role,tournament){
 return isOrganizer(role)&&tournament?.status==='DRAFT'&&organizerFixtureType(tournament)!==null;
}
function canRecordTournamentResult(role,tournament){
 return isOrganizer(role)&&tournament?.status==='IN_PROGRESS'&&organizerFixtureType(tournament)!==null;
}
function canCompleteTournament(role,tournament){
 return canRecordTournamentResult(role,tournament)&&tournament?.format==='LEAGUE';
}
function validateTournamentScore(home,away){
 const parse=(value)=>{
  if(typeof value!=='string'||!/^\d{1,3}$/.test(value.trim()))throw Error('Introduz um resultado inteiro de 0 a 999 para cada participante.');
  const score=Number(value.trim());
  if(!Number.isInteger(score)||score<0||score>999)throw Error(tr('Resultado inválido.'));
  return score;
 };
 return {homeScore:parse(home),awayScore:parse(away)};
}
/** Mirrors server match-specific constraints; server still owns authorization and state. */
function validateTournamentMatchScore(tournament,match,home,away){
 const scores=validateTournamentScore(home,away);
 if(!tournament||!match||!Number.isSafeInteger(match.id)||match.id<=0)
  throw Error(tr('Jogo não encontrado. Atualiza o calendário.'));
 if(tournament.scoringMode==='CHESS_HALF_POINTS'||
   (tournament.entryType!=='TEAM'&&classificationKind(tournament)==='CHESS')){
  const a=scores.homeScore,b=scores.awayScore;
  if(!((a===1&&b===0)||(a===0&&b===1)||(a===0&&b===0)))
   throw Error(tr('Xadrez: usa 1–0, 0–1 ou 0–0 para empate.'));
 }
 const elimination=tournament.entryType==='TEAM'&&(
  tournament.format==='KNOCKOUT'||
  (tournament.format==='GROUP_KNOCKOUT'&&match.groupNumber==null));
 if(elimination&&scores.homeScore===scores.awayScore)
  throw Error(tr('Uma eliminatória exige vencedor. Regista o resultado após desempate.'));
 return scores;
}
/** Read-only UI guard for the backend's immutable group and published-round rules. */
function organizerMatchWriteGuard(tournament,match,matches,groupState,groupsConfirmed){
 if(!tournament||!match)return {allowed:false,reason:tr('Jogo não encontrado. Atualiza o calendário.')};
 if(tournament.status!=='IN_PROGRESS')return {allowed:false,reason:tr('Competição concluída ou por iniciar.')};
 if(tournament.entryType!=='TEAM')return {allowed:true,reason:null};
 if(tournament.format==='GROUP_KNOCKOUT'&&match.groupNumber!=null){
  if(!groupsConfirmed)return {allowed:false,reason:tr('Não foi possível confirmar se a fase de grupos está aberta. Atualiza os dados.')};
  if(groupState?.knockoutStarted)return {allowed:false,reason:tr('Os resultados dos grupos estão fechados porque as eliminatórias já começaram.')};
 }
 const elimination=tournament.format==='KNOCKOUT'||(tournament.format==='GROUP_KNOCKOUT'&&match.groupNumber==null);
 if(elimination&&Array.isArray(matches)&&matches.some(item=>item&&item.groupNumber==null&&item.roundNumber>match.roundNumber))
  return {allowed:false,reason:tr('A ronda seguinte já foi publicada. Este resultado não pode ser alterado.')};
 return {allowed:true,reason:null};
}
module.exports={isOrganizer,organizerFixtureType,canGenerateSchedule,canRecordTournamentResult,canCompleteTournament,validateTournamentScore,validateTournamentMatchScore,organizerMatchWriteGuard};
