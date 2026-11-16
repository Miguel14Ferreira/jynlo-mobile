'use strict';
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
  if(!Number.isInteger(score)||score<0||score>999)throw Error('Resultado inválido.');
  return score;
 };
 return {homeScore:parse(home),awayScore:parse(away)};
}
/** Mirrors server match-specific constraints; server still owns authorization and state. */
function validateTournamentMatchScore(tournament,match,home,away){
 const scores=validateTournamentScore(home,away);
 if(!tournament||!match||!Number.isSafeInteger(match.id)||match.id<=0)
  throw Error('Jogo não encontrado. Atualiza o calendário.');
 if(tournament.scoringMode==='CHESS_HALF_POINTS'||
   (tournament.entryType!=='TEAM'&&classificationKind(tournament)==='CHESS')){
  const a=scores.homeScore,b=scores.awayScore;
  if(!((a===1&&b===0)||(a===0&&b===1)||(a===0&&b===0)))
   throw Error('Xadrez: usa 1–0, 0–1 ou 0–0 para empate.');
 }
 const elimination=tournament.entryType==='TEAM'&&(
  tournament.format==='KNOCKOUT'||
  (tournament.format==='GROUP_KNOCKOUT'&&match.groupNumber==null));
 if(elimination&&scores.homeScore===scores.awayScore)
  throw Error('Uma eliminatória exige vencedor. Regista o resultado após desempate.');
 return scores;
}
module.exports={isOrganizer,organizerFixtureType,canGenerateSchedule,canRecordTournamentResult,canCompleteTournament,validateTournamentScore,validateTournamentMatchScore};
