'use strict';
const {tr}=require('./i18n-core.cjs');
/** Session presets ("perfis de jogos") — shared with the web through /api/sessions/presets.
 * Never stores dates, passwords or photos; GPS positions are not saved (only map-link points). */
const MAX_PRESETS=20,MAX_NAME=70;
const LOCATION_TO_SERVER={saved:'venue',link:'maps',gps:'gps'};
const LOCATION_FROM_SERVER={venue:'saved',maps:'link',gps:'gps'};
const int=(v,f)=>{const n=Number(v);return Number.isFinite(n)?Math.trunc(n):f;};
function validatePresetName(name){
 const t=String(name||'').replace(/[\u0000-\u001F\u007F]/g,'').trim();
 if(!t||t.length>MAX_NAME)throw new Error(tr('Indica um nome de perfil (até 70 caracteres).'));
 return t;
}
function presetFromForm(form,ctx){
 const f=form||{},c=ctx||{};
 if(!String(f.sport||'').trim())throw new Error(tr('Escolhe primeiro a modalidade que queres guardar.'));
 const max=int(f.maxParticipants,NaN);
 if(!Number.isInteger(max)||max<2||max>100)throw new Error(tr('O número de jogadores tem de estar entre 2 e 100.'));
 const external=c.hasExistingPlayers?Math.max(0,int(f.externalConfirmedParticipants,0)):0;
 const price=Number(String(f.price||'0').replace(',','.'));
 const shares=Array.isArray(f.communityShareIds)?f.communityShareIds.filter(id=>Number.isSafeInteger(id)&&id>0).slice(0,5):[];
 const communityId=Number.isSafeInteger(f.communityId)&&f.communityId>0?f.communityId:null;
 const locationMethod=LOCATION_TO_SERVER[c.locationMode]||'venue';
 const venueId=locationMethod==='venue'&&Number.isSafeInteger(f.venueId)&&f.venueId>0?f.venueId:null;
 const mapPoint=locationMethod==='maps'&&!venueId&&typeof f.latitude==='number'&&typeof f.longitude==='number'&&
  Number.isFinite(f.latitude)&&Number.isFinite(f.longitude)&&!!c.verifiedMapsLink;
 const recurrence=['WEEKLY','BIWEEKLY'].includes(f.recurrence)?f.recurrence:'NONE';
 return {
  sport:String(f.sport).trim(),playFormat:'INDIVIDUAL',
  city:String(f.city||'').trim(),address:String(f.address||'').trim(),description:null,
  maxParticipants:max,creationMode:c.hasExistingPlayers?'COMPLETE':'START',
  confirmedPlayers:Math.min(max,external+1),
  hasPrice:Number.isFinite(price)&&price>0,priceAmount:Number.isFinite(price)&&price>0?price:0,
  privateGame:!shares.length&&!communityId&&!!f.privateGame,
  communityShareIds:communityId?[]:shares,communityId,seasonGame:!!communityId&&!!f.seasonGame,
  selectedVenueId:venueId,locationMethod,
  latitude:mapPoint?f.latitude:null,longitude:mapPoint?f.longitude:null,venueMapLink:mapPoint?String(c.verifiedMapsLink).slice(0,1200):'',
  recurrence,recurrenceOccurrences:Math.min(52,Math.max(2,int(f.recurrenceOccurrences,4))),
  weeklySessionsPerWeek:recurrence==='NONE'?1:Math.min(7,1+(Array.isArray(f.additionalWeeklySlots)?f.additionalWeeklySlots.length:0)),
  registrationOpeningMode:communityId&&['MANUAL','SCHEDULED'].includes(f.registrationOpeningMode)?f.registrationOpeningMode:'IMMEDIATE'
 };
}
/** Build a fresh draft from a preset. Date, time, password and registration date always start empty. */
function formFromPreset(empty,settings,ctx){
 const s=settings||{},c=ctx||{},notes=[];
 const sports=c.sports||[];
 if(!s.sport||(sports.length&&!sports.includes(s.sport)))throw new Error(tr('A modalidade deste perfil já não está disponível. Seleciona outra.'));
 const allowed=new Set((c.communityIds||[]).map(Number));
 const max=Math.min(100,Math.max(2,int(s.maxParticipants,10)));
 const complete=s.creationMode==='COMPLETE';
 let communityId=null,shares=[],mode='INDEPENDENT';
 if(s.communityId){if(allowed.has(Number(s.communityId))){communityId=Number(s.communityId);mode='SINGLE';}else notes.push('community');}
 else{
  const saved=(s.communityShareIds||[]).map(Number);
  shares=saved.filter(id=>allowed.has(id)).slice(0,5);
  if(shares.length)mode='SHARED';
  if(shares.length!==saved.length)notes.push('community');
 }
 const locationMode=LOCATION_FROM_SERVER[s.locationMethod]||'saved';
 const hasPoint=locationMode==='link'&&Number.isFinite(s.latitude)&&Number.isFinite(s.longitude)&&s.latitude!==null&&s.longitude!==null&&!!s.venueMapLink;
 const recurrence=['WEEKLY','BIWEEKLY'].includes(s.recurrence)?s.recurrence:'NONE';
 if(recurrence!=='NONE'&&int(s.weeklySessionsPerWeek,1)>1)notes.push('weeklySlots');
 if(locationMode==='gps')notes.push('gps');
 const price=s.hasPrice?Number(s.priceAmount)||0:0;
 const form={...empty,
  sport:s.sport,city:s.city||'',address:s.address||'',
  maxParticipants:String(max),
  externalConfirmedParticipants:complete?String(Math.max(0,Math.min(max-1,int(s.confirmedPlayers,1)-1))):'0',
  price:price>0?String(price).replace('.',','):'0',
  privateGame:mode==='INDEPENDENT'&&!!s.privateGame,password:'',
  communityId,communityShareIds:shares,seasonGame:!!communityId&&!!s.seasonGame,
  venueId:null,latitude:hasPoint?s.latitude:null,longitude:hasPoint?s.longitude:null,locationConfirmed:hasPoint,
  recurrence,recurrenceOccurrences:String(Math.min(52,Math.max(2,int(s.recurrenceOccurrences,4)))),
  additionalWeeklySlots:[],day:'',time:'',registrationDay:'',registrationTime:'',
  registrationOpeningMode:communityId&&['MANUAL','SCHEDULED'].includes(s.registrationOpeningMode)?s.registrationOpeningMode:'IMMEDIATE'
 };
 if(form.registrationOpeningMode==='SCHEDULED')notes.push('registration');
 return {form,communityMode:mode,hasExistingPlayers:complete,locationMode,
  mapsLink:hasPoint?String(s.venueMapLink):'',venueId:locationMode==='saved'&&Number.isSafeInteger(s.selectedVenueId)&&s.selectedVenueId>0?s.selectedVenueId:null,notes};
}
const NOTE_TEXT={
 community:'Algumas comunidades deste perfil não estão disponíveis ou não podem criar jogos. Verifica as comunidades selecionadas.',
 weeklySlots:'Este perfil tem mais de um jogo por semana: acrescenta os outros horários no passo "Quando e onde?".',
 gps:'Este perfil usa a localização atual: volta a captar o ponto GPS no passo "Quando e onde?".',
 registration:'Escolhe de novo o dia e a hora de abertura das inscrições.'
};
function presetNotesText(notes){return (notes||[]).map(n=>NOTE_TEXT[n]).filter(Boolean).map(x=>tr(x));}
module.exports={MAX_PRESETS,MAX_NAME,validatePresetName,presetFromForm,formFromPreset,presetNotesText};
