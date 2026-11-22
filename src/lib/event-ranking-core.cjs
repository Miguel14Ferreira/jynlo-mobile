'use strict';
const {tr}=require('./i18n-core.cjs');
/** "Classificação por provas": client helpers. The server computes places, points and the table. */
const KINDS=['TIME','SCORE','POSITION'];
const KIND_LABELS={TIME:'⏱️ Tempo / pancadas (menor ganha)',SCORE:'🎯 Pontos / marca / nota (maior ganha)',POSITION:'🏁 Só posições'};
const KIND_SHORT={TIME:'tempo (ganha o menor)',SCORE:'pontuação ou marca (ganha o maior)',POSITION:'posição de chegada'};
/** "62,4", "62.4", "1:02,40" or "1:02:03" → seconds; null when empty; NaN when invalid. */
function parseEventValue(raw,kind){
 const text=String(raw??'').trim().replace(',','.');
 if(!text)return null;
 if(kind==='POSITION')return /^\d+$/.test(text)&&Number(text)>0?Number(text):NaN;
 if(kind==='TIME'&&text.includes(':')){
  const parts=text.split(':');
  if(parts.length>3||parts.some(p=>p===''||!/^\d+(\.\d+)?$/.test(p)))return NaN;
  return parts.reduce((total,part)=>total*60+Number(part),0);
 }
 if(!/^\d+(\.\d+)?$/.test(text))return NaN;
 return Number(text);
}
function formatEventValue(value,kind){
 if(value===null||value===undefined||!Number.isFinite(Number(value)))return '—';
 const v=Number(value);
 if(kind!=='TIME'||v<60)return String(Number(v.toFixed(3))).replace('.',',');
 const minutes=Math.floor(v/60),seconds=v-minutes*60;
 const sec=seconds.toFixed(2).padStart(5,'0').replace('.',',');
 return minutes>=60?Math.floor(minutes/60)+':'+String(minutes%60).padStart(2,'0')+':'+sec:minutes+':'+sec;
}
/** Builds the request rows; throws a readable error for an invalid value. Empty rows = did not take part. */
function buildResults(rows,kind){
 const results=[];
 for(const row of rows||[]){
  if(row.dnf){results.push({participantId:row.participantId,value:null,position:null,didNotFinish:true});continue;}
  const parsed=parseEventValue(row.raw,kind);
  if(parsed===null)continue;
  if(Number.isNaN(parsed)||parsed<0)throw Error(tr('Valor inválido para {name}.',{name:row.name}));
  results.push({participantId:row.participantId,didNotFinish:false,
   value:kind==='POSITION'?null:parsed,position:kind==='POSITION'?parsed:null});
 }
 if(!results.length)throw Error(tr('Regista pelo menos um resultado.'));
 return results;
}
/** Draft input rows for editing an existing event (or a new one when event is null). */
function draftRows(participants,event,kind){
 const byId=new Map(((event&&event.results)||[]).map(r=>[r.participantId,r]));
 return (participants||[]).map(p=>{
  const r=byId.get(p.id);
  const raw=!r||r.didNotFinish?'':kind==='POSITION'?String(r.place??''):String(r.value??'').replace('.',',');
  return {participantId:p.id,name:p.name,raw,dnf:!!(r&&r.didNotFinish)};
 });
}
module.exports={KINDS,KIND_LABELS,KIND_SHORT,parseEventValue,formatEventValue,buildResults,draftRows};
