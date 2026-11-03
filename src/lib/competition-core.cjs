'use strict';
/** Read-only display selection. Never reinterpret non-football results as goal statistics. */
const RACE_SPORTS=new Set(['Karting','BMX','Ciclismo','Mountain Bike','Ciclocrosse','Ciclismo de Estrada','Ciclismo de Pista','Automobilismo','Motociclismo','Motocross','Corrida','Trail Running','Corrida de obstáculos','Motonáutica']);
function classificationKind(t){
  if (!t||typeof t!=='object') throw Error('Torneio inválido.');
  const mode=t.scoringMode||null;
  if(mode==='RACE_POINTS'||(!mode&&RACE_SPORTS.has(t.sport||'')))return 'RACE';
  if(['SWIM_BEST_TIME','TRACK_BEST_TIME','CANOE_BEST_TIME','ROWING_BEST_TIME','RELAY_BEST_TIME'].includes(mode))return 'TIMED';
  if(mode==='FIELD_BEST_MARK')return 'MEASURED';
  if(mode==='CHESS_HALF_POINTS')return 'CHESS';
  if(t.entryType==='TEAM')return 'TEAM';
  // Individual match standings are supported on the API, but only for the
  // traditional match point system; unknown discipline rules stay explicit.
  if((t.sport==='Futebol'||t.sport==='Futsal'||t.sport==='Padel'||t.sport==='Ténis'||t.sport==='Xadrez')&&!mode)return 'INDIVIDUAL';
  return 'UNSUPPORTED';
}
function label(kind){return ({RACE:'Classificação por corrida',TEAM:'Classificação por equipas',INDIVIDUAL:'Classificação individual',TIMED:'Classificação por tempo',MEASURED:'Classificação por marca',CHESS:'Classificação por pontos de xadrez',UNSUPPORTED:'Classificação específica indisponível'})[kind]||'Classificação';}
function standingsColumns(kind){
  if(kind==='RACE')return ['Pos.','Piloto','Corridas','Pódios','Pontos'];
  if(kind==='TEAM')return ['Pos.','Equipa','J','V','E','D','Pts'];
  if(kind==='INDIVIDUAL')return ['Pos.','Jogador','J','V','E','D','Pts'];
  return ['Pos.','Participante','Resultado'];
}
function validTournamentId(value){const n=Number(value);if(!Number.isSafeInteger(n)||n<=0)throw Error('Identificador de torneio inválido.');return n;}
module.exports={RACE_SPORTS,classificationKind,label,standingsColumns,validTournamentId};
