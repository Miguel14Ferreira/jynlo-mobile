'use strict';
const {tr}=require('./i18n-core.cjs');
const {classificationKind,validTournamentId}=require('./competition-core.cjs');
const {isOrganizer}=require('./tournament-organizer-core.cjs');
function isRelay(t){return !!t&&t.entryType==='TEAM'&&classificationKind(t)==='RELAY';}
function canManageRelay(role,t){return isOrganizer(role)&&isRelay(t)&&t.status!=='COMPLETED';}
function positiveId(id){return validTournamentId(id);}
function validateHeatNumber(value){
 const str=String(value).trim();
 if(!/^(?:[1-9]|1[0-9]|20)$/.test(str))throw Error('A série deve ser um número inteiro entre 1 e 20.');
 return Number(str);
}
function validateElapsedSeconds(value){
 const str=String(value).trim().replace(',','.');
 if(!/^(?:[0-9]{1,8})(?:\.[0-9]{1,3})?$/.test(str)||Number(str)<=0)
  throw Error(tr('Indica um tempo positivo em segundos, com até três casas decimais.'));
 return Number(str);
}
function validateRunners(value,team){
 if(!team||!Array.isArray(team.players)||team.players.length!==4)
  throw Error(tr('A equipa deve ter exatamente quatro atletas confirmados.'));
 const input=String(value).split(',').map(x=>x.trim());
 if(input.length!==4||input.some(x=>!/^[1-9][0-9]*$/.test(x)))throw Error('Indica quatro IDs de atletas, na ordem da estafeta, separados por vírgulas.');
 const ids=input.map(Number),actual=team.players.map(x=>x.profileId);
 if(ids.some(x=>!Number.isSafeInteger(x))||new Set(ids).size!==4||
    new Set(actual).size!==4||ids.some(id=>!actual.includes(id)))
  throw Error(tr('Os quatro corredores devem ser os membros confirmados da equipa, sem repetições.'));
 return ids;
}
function validateDecision(status,reason){
 if(!['VALID','DISQUALIFIED'].includes(status))throw Error(tr('Decisão de júri inválida.'));
 const trimmed=String(reason).trim();
 if(trimmed.length<5||trimmed.length>500)throw Error(tr('O fundamento deve ter entre 5 e 500 caracteres.'));
 return {status,reason:trimmed};
}
function canRecordStage(overview,stage,tournament){
 if(!overview||tournament?.status==='COMPLETED')return false;
 return stage==='FINAL'?overview.finalPublished===true:stage==='QUALIFICATION'&&!overview.finalPublished;
}
function moveRunner(ids,index,direction){
 if(!Array.isArray(ids)||ids.length!==4||new Set(ids).size!==4||ids.some(x=>!Number.isSafeInteger(x)||x<=0))throw Error(tr('Ordem inválida.'));
 if(!Number.isInteger(index)||![-1,1].includes(direction))throw Error(tr('Movimento inválido.'));
 const next=index+direction;
 if(index<0||index>=4||next<0||next>=4)return ids.slice();
 const copy=ids.slice();[copy[index],copy[next]]=[copy[next],copy[index]];
 return copy;
}
function existingHeat(overview,stage,heatNumber,teamId){
 if(!overview||!Array.isArray(overview.heats))return null;
 const number=validateHeatNumber(heatNumber),id=positiveId(teamId);
 return overview.heats.find(h=>h.teamId===id&&h.heatNumber===number&&(h.stage||'QUALIFICATION')===stage)||null;
}
function decisionHistory(overview){
 return (Array.isArray(overview?.decisions)?overview.decisions:[])
  .filter(x=>x&&Number.isSafeInteger(x.id)&&x.id>0&&Number.isSafeInteger(x.heatId)&&x.heatId>0)
  .slice().sort((a,b)=>b.id-a.id);
}
function decisionAllowed(overview,heat,tournament){
 return !!heat&&tournament?.status!=='COMPLETED'&&(heat.stage==='FINAL'||!overview.finalPublished);
}
module.exports={isRelay,canManageRelay,positiveId,validateHeatNumber,validateElapsedSeconds,validateRunners,validateDecision,canRecordStage,decisionAllowed,moveRunner,decisionHistory,existingHeat};
