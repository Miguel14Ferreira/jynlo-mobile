'use strict';
const {tr}=require('./i18n-core.cjs');
/**
 * Draft creation rules mirror the explicitly supported Jynlo web/BE contracts.
 * This is client-side UX validation, never a substitute for server authorization.
 */
const RACE_SPORTS=new Set(['Karting','BMX','Ciclismo','Mountain Bike','Ciclocrosse','Ciclismo de Estrada','Ciclismo de Pista','Automobilismo','Motociclismo','Motocross','Corrida','Trail Running','Corrida de obstáculos','Motonáutica']);
const NUMERIC_INDIVIDUAL=new Set(['Futebol','Futsal','Padel','Ténis']);
const NUMERIC_TEAM=new Set(['Futebol','Futsal']);
const DISCIPLINES=Object.freeze({
  SWIM_LCM:['FREE_50','FREE_100','FREE_200','BACK_100','BREAST_100','FLY_100','IM_200'],
  CANOE_SPRINT:['K1_200','K1_500','K1_1000'],
  ROWING_SINGLE:['SINGLE_500','SINGLE_1000','SINGLE_2000'],
  TRACK:['TRACK_100','TRACK_200','TRACK_400','TRACK_800','TRACK_1500','TRACK_5000','TRACK_10000','TRACK_HURDLES_100','TRACK_HURDLES_110','TRACK_HURDLES_400','TRACK_STEEPLE_3000'],
  JUMP:['LONG_JUMP','TRIPLE_JUMP','HIGH_JUMP','POLE_VAULT'],
  THROW:['SHOT_PUT','DISCUS','JAVELIN','HAMMER'],
  TRACK_RELAY:['RELAY_4X100','RELAY_4X400']
});
/** Individual sports without a dedicated engine: generic "classificação por provas" (same list as the web). */
const EVENT_RANKING_SPORTS=new Set(['Aeromodelismo','Aikido','Apneia','Artes Marciais Chinesas','Atividades Subaquáticas','Bodyboard','Bowling','Breaking','Bridge','Calistenia','Canoagem','Canoagem Slalom','Columbofilia','Dança Desportiva','Escalada','Esqui','Esqui Alpino','Esqui de Fundo','Esqui Freestyle','Esqui de Montanha','Ginástica','Ginástica Artística','Ginástica Rítmica','Golfe','Halterofilismo','Hipismo','Mergulho','Natação Artística','Natação em Águas Abertas','Orientação','Paraquedismo','Parkour','Patinagem','Patinagem Artística','Pentatlo Moderno','Pesca Desportiva','Powerlifting','Skate','Snowboard','Stand Up Paddle','Surf','Tiro','Tiro com Arco','Trampolim','Triatlo','Vela','Voo Livre']);
const RACE_EVENTS=Object.freeze({'BMX':'RACE','Ciclismo de Estrada':'ROAD_RACE','Ciclismo de Pista':'TRACK_SCRATCH'});
function creationProfile(sport,entryType='INDIVIDUAL',athleticsMode='FIELD'){
 if(typeof sport!=='string'||!sport||!['INDIVIDUAL','TEAM'].includes(entryType))return {model:'UNAVAILABLE',events:[],formats:[]};
 if(sport==='Atletismo'){
  if(entryType==='TEAM')return {model:'RELAY_BEST_TIME',events:['TRACK_RELAY'],formats:['LEAGUE']};
  return athleticsMode==='TRACK'
   ?{model:'TRACK_BEST_TIME',events:['TRACK'],formats:['LEAGUE']}
   :{model:'FIELD_BEST_MARK',events:['JUMP','THROW'],formats:['LEAGUE']};
 }
 if(entryType==='TEAM')return NUMERIC_TEAM.has(sport)
  ?{model:'NUMERIC_TEAM',events:[],formats:['LEAGUE','KNOCKOUT','GROUP_KNOCKOUT']}
  :{model:'UNAVAILABLE',events:[],formats:[]};
 if(sport==='Xadrez')return {model:'CHESS_HALF_POINTS',events:['CHESS_GAME'],formats:['LEAGUE']};
 if(sport==='Natação')return {model:'SWIM_BEST_TIME',events:['SWIM_LCM'],formats:['LEAGUE']};
 if(sport==='Remo')return {model:'ROWING_BEST_TIME',events:['ROWING_SINGLE'],formats:['LEAGUE']};
 if(sport==='Canoagem Velocidade')return {model:'CANOE_BEST_TIME',events:['CANOE_SPRINT'],formats:['LEAGUE']};
 if(RACE_SPORTS.has(sport))return {model:'RACE_POINTS',events:RACE_EVENTS[sport]?[RACE_EVENTS[sport]]:[],formats:['LEAGUE']};
 if(NUMERIC_INDIVIDUAL.has(sport))return {model:'NUMERIC_INDIVIDUAL',events:[],formats:['LEAGUE']};
 if(EVENT_RANKING_SPORTS.has(sport))return {model:'EVENT_RANKING',events:[],formats:['LEAGUE']};
 return {model:'UNAVAILABLE',events:[],formats:[]};
}
function disciplineChoices(eventType){return DISCIPLINES[eventType]||[];}
function isNumericModel(model){return model==='NUMERIC_INDIVIDUAL'||model==='NUMERIC_TEAM'||model==='CHESS_HALF_POINTS';}
function asInt(value,min,max,label){
 const n=typeof value==='string'&&!value.trim()?NaN:Number(value);
 if(!Number.isInteger(n)||n<min||n>max)throw Error(label);
 return n;
}
function createTournamentDraft(data){
 if(!data||typeof data!=='object')throw Error(tr('Configuração inválida.'));
 const name=String(data.name||'').trim(),sport=String(data.sport||'').trim();
 if(name.length<2||name.length>120)throw Error(tr('O nome deve ter entre 2 e 120 caracteres.'));
 if(!sport||sport.length>100)throw Error(tr('Seleciona uma modalidade válida.'));
 const entryType=data.entryType==='TEAM'?'TEAM':'INDIVIDUAL';
 const profile=creationProfile(sport,entryType,data.athleticsMode);
 if(profile.model==='UNAVAILABLE')throw Error(tr('Esta modalidade ainda não tem um modelo de torneio validado no mobile.'));
 const format=data.format||'LEAGUE';
 if(!profile.formats.includes(format))throw Error(tr('O formato não é compatível com esta modalidade.'));
 let groupCount=null,playersPerTeam=null,roundRobinLegs=null;
 if(format==='GROUP_KNOCKOUT'){
  if(entryType!=='TEAM'||profile.model!=='NUMERIC_TEAM')throw Error(tr('Os grupos exigem um torneio numérico por equipas.'));
  groupCount=asInt(data.groupCount,2,4,'Seleciona 2 ou 4 grupos.');
  if(groupCount!==2&&groupCount!==4)throw Error('Seleciona 2 ou 4 grupos.');
 }
 if(entryType==='TEAM'){
  playersPerTeam=profile.model==='RELAY_BEST_TIME'?4:asInt(data.playersPerTeam,1,30,'Indica de 1 a 30 jogadores por equipa.');
  if(format==='LEAGUE'&&profile.model==='NUMERIC_TEAM')roundRobinLegs=asInt(data.roundRobinLegs||1,1,2,'Seleciona 1 ou 2 voltas.');
 }
 let eventType=null,eventDiscipline=null;
 if(profile.events.length){
  const requested=String(data.eventType||'').trim();
  if(!profile.events.includes(requested))throw Error(tr('Seleciona um tipo de prova compatível.'));
  eventType=requested;
 }else if(data.eventType)throw Error(tr('Este torneio não utiliza esse tipo de prova.'));
 const disciplines=disciplineChoices(eventType);
 if(disciplines.length){
  const requested=String(data.eventDiscipline||'').trim();
  if(!disciplines.includes(requested))throw Error(tr('Seleciona uma disciplina válida para a prova.'));
  eventDiscipline=requested;
 }else if(data.eventDiscipline)throw Error(tr('Esta competição não utiliza uma disciplina de prova.'));
 const numeric=isNumericModel(profile.model);
 const points=numeric
  ?profile.model==='CHESS_HALF_POINTS'?[2,1,0]:[
    asInt(data.winPoints??3,0,999,'Pontos de vitória inválidos.'),
    asInt(data.drawPoints??1,0,999,'Pontos de empate inválidos.'),
    asInt(data.lossPoints??0,0,999,'Pontos de derrota inválidos.')
   ]
  :[null,null,null];
 return {
  name,sport,entryType,format,groupCount,playersPerTeam,roundRobinLegs,
  teamTieBreakPriority:null,winPoints:points[0],drawPoints:points[1],lossPoints:points[2],
  scoringMode:profile.model==='NUMERIC_TEAM'||profile.model==='NUMERIC_INDIVIDUAL'?null:profile.model,
  eventType,eventDiscipline
 };
}
module.exports={RACE_SPORTS,EVENT_RANKING_SPORTS,DISCIPLINES,creationProfile,disciplineChoices,isNumericModel,createTournamentDraft};
