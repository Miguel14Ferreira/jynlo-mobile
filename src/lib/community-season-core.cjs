'use strict';
const {tr}=require('./i18n-core.cjs');
const {sportName}=require('./sport-names.cjs');

const num=v=>Number.isFinite(v)?v:0;
const person=r=>({profileId:Number.isSafeInteger(r?.profileId)?r.profileId:null,
 username:typeof r?.username==='string'?r.username:null,fullName:typeof r?.fullName==='string'?r.fullName:null});

/**
 * Classification tabs for one season: "Geral" first (only when the backend
 * returned it), then one tab per sport. Sports keep their own scoring; the
 * "Geral" table counts wins and games, never summed points.
 */
function standingTabs(overview){
 const tabs=[];
 const overall=Array.isArray(overview?.overallStandings)?overview.overallStandings:[];
 if(overall.length)tabs.push({key:'overall',label:tr('Geral'),kind:'overall',rows:overall.map(r=>({...person(r),
  position:num(r.position),games:num(r.games),wins:num(r.wins),sports:num(r.sports),winRate:num(r.winRate)}))});
 const seen=new Set();
 for(const g of Array.isArray(overview?.sportStandings)?overview.sportStandings:[]){
  const rows=(Array.isArray(g?.standings)?g.standings:[]).filter(r=>num(r?.games)>0);
  if(!g?.sport||!rows.length)continue;
  const key='team:'+g.sport.toLowerCase();if(seen.has(key))continue;seen.add(key);
  tabs.push({key,label:sportName(g.sport),kind:'team',rows:rows.map(r=>({...person(r),position:num(r.position),
   games:num(r.games),wins:num(r.wins),draws:num(r.draws),losses:num(r.losses),points:num(r.points)}))});
 }
 const rackets=(Array.isArray(overview?.racketStandings)?overview.racketStandings:[])
  .filter(g=>g?.sport&&Array.isArray(g.standings)&&g.standings.some(r=>num(r?.matches)>0));
 for(const g of rackets){
  const several=rackets.filter(o=>o.sport===g.sport).length>1;
  const format=g.matchFormat==='SINGLES'?tr('Singulares'):g.matchFormat==='DOUBLES'?tr('Pares'):'';
  const key='racket:'+g.sport.toLowerCase()+':'+(g.matchFormat||'');if(seen.has(key))continue;seen.add(key);
  tabs.push({key,label:sportName(g.sport)+(several&&format?' · '+format:''),kind:'racket',
   rows:g.standings.filter(r=>num(r?.matches)>0).map(r=>({...person(r),position:num(r.position),
    matches:num(r.matches),wins:num(r.wins),losses:num(r.losses),setDifference:num(r.setDifference),
    championshipPoints:Number.isFinite(r.championshipPoints)?r.championshipPoints:null}))});
 }
 return tabs;
}

/** Validates a new season before it is sent. A blank sport means "all sports". */
function seasonDraft(input,sports){
 const name=typeof input?.name==='string'?input.name.trim().replace(/\s+/g,' '):'';
 if(!name)throw Error(tr('Dá um nome à época.'));
 if(name.length>120)throw Error(tr('O nome da época pode ter até 120 caracteres.'));
 const sport=typeof input?.sport==='string'&&input.sport.trim()?input.sport.trim():null;
 const allowed=Array.isArray(sports)?sports:[];
 if(sport&&!allowed.some(s=>s.toLowerCase()===sport.toLowerCase()))throw Error(tr('Escolhe uma modalidade da comunidade.'));
 return {name,sport};
}

function defaultSeasonName(sport,now=new Date()){
 return tr('Época {y}',{y:now.getFullYear()})+(sport?' · '+sportName(sport):'');
}

module.exports={standingTabs,seasonDraft,defaultSeasonName};
