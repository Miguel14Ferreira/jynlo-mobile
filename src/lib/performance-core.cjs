'use strict';
/** Presentation only: never calculate finishing places, champions or qualification. */
function nonNegative(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0;}
function formatSeconds(value){
 if(!nonNegative(value))return '—';
 const totalMillis=Math.round(value*1000);
 const h=Math.floor(totalMillis/3600000),m=Math.floor((totalMillis%3600000)/60000),s=(totalMillis%60000)/1000;
 const fraction=s.toFixed(3).replace(/0+$/,'').replace(/\.$/,'');
 const parts=fraction.split('.');
 const seconds=(h||m)?parts[0].padStart(2,'0'):parts[0];
 const front=h?`${h}:${String(m).padStart(2,'0')}:`:m?`${m}:`:'';
 return `${front}${seconds}${parts[1]?','+parts[1]:''} s`;
}
function formatMetres(value){return nonNegative(value)?`${new Intl.NumberFormat('pt-PT',{maximumFractionDigits:3}).format(value)} m`:'—';}
function formatPoints(value){return nonNegative(value)?`${new Intl.NumberFormat('pt-PT').format(value)} pts`:'—';}
function formatChessPoints(halfPointUnits){return Number.isSafeInteger(halfPointUnits)&&halfPointUnits>=0?new Intl.NumberFormat('pt-PT',{maximumFractionDigits:1}).format(halfPointUnits/2):'—';}
function displayPerson(...values){return values.find(x=>typeof x==='string'&&x.trim())?.trim()||'Participante não identificado';}
function validatedRank(rank){return Number.isSafeInteger(rank)&&rank>0?String(rank):'—';}
function sourceRounds(data){return Array.isArray(data)?data.filter(x=>x&&Number.isSafeInteger(x.id)&&x.id>0):[];}
function stageLabel(stage){return stage==='FINAL'?'Final':stage==='QUALIFICATION'?'Qualificação':'Fase não identificada';}
module.exports={formatSeconds,formatMetres,formatPoints,formatChessPoints,displayPerson,validatedRank,sourceRounds,stageLabel};
