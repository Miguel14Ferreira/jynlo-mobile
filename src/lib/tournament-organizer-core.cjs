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
module.exports={isOrganizer,organizerFixtureType,canGenerateSchedule,canRecordTournamentResult,canCompleteTournament,validateTournamentScore};
