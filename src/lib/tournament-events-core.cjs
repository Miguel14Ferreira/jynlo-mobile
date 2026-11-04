'use strict';
const {classificationKind}=require('./competition-core.cjs');
const {isOrganizer}=require('./tournament-organizer-core.cjs');
const ENDPOINTS=Object.freeze({RACE:'races',TIMED:'times',MEASURED:'marks'});
/** These are only presentation guards. The server decides role, status and eligibility. */
function managedKind(tournament){
 if(!tournament||tournament.entryType==='TEAM')return null;
 const kind=classificationKind(tournament);
 return Object.prototype.hasOwnProperty.call(ENDPOINTS,kind)?kind:null;
}
function canManageEvents(role,tournament){
 return isOrganizer(role)&&!!managedKind(tournament)&&
  (tournament.status==='DRAFT'||tournament.status==='IN_PROGRESS');
}
function uniqueRounds(rounds){
 const found=new Set();
 return (Array.isArray(rounds)?rounds:[]).filter(round=>{
  const id=round?.id;
  if(!Number.isSafeInteger(id)||id<=0||found.has(id))return false;
  found.add(id);return true;
 });
}
function roundCollections(overview){
 if(!overview||!Object.prototype.hasOwnProperty.call(ENDPOINTS,overview.kind))return {linked:[],available:[]};
 const data=overview.data||{};
 const linked=uniqueRounds(overview.kind==='RACE'?data.linkedRaces:data.linkedRounds);
 const ids=new Set(linked.map(round=>round.id));
 const available=uniqueRounds(overview.kind==='RACE'?data.availableRaces:data.availableRounds).filter(round=>!ids.has(round.id));
 return {linked,available};
}
/** Follows CommunityRaceStandings.parsePoints on the backend (0..1000, <=20 places, nonincreasing). */
function validateRacePointsCsv(value){
 if(typeof value!=='string'||!value.trim())throw Error('Indica os pontos por posição.');
 const parts=value.split(',');
 if(parts.length>20)throw Error('Só podes configurar as primeiras 20 posições.');
 let previous=Infinity;
 const points=parts.map(part=>{
  const text=part.trim();
  if(!/^[0-9]{1,4}$/.test(text))throw Error('Introduz valores inteiros separados por vírgulas.');
  const n=Number(text);
  if(n>1000||n>previous)throw Error('Os pontos devem ser decrescentes, entre 0 e 1000.');
  previous=n;return n;
 });
 return points.join(',');
}
module.exports={ENDPOINTS,managedKind,canManageEvents,uniqueRounds,roundCollections,validateRacePointsCsv};
