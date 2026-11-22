'use strict';
const {tr}=require('./i18n-core.cjs');
/** Keep source-specific sporting results separated. The API owns all rankings. */
const TEAM_MATCH_SPORTS=new Set(['Futebol','Futsal']);
const RACE_SPORTS=new Set(['Karting','BMX','Ciclismo','Mountain Bike','Ciclocrosse','Ciclismo de Estrada','Ciclismo de Pista','Automobilismo','Motociclismo','Motocross','Corrida','Trail Running','Corrida de obstáculos','Motonáutica']);
const TIMED_MODES=new Set(['SWIM_BEST_TIME','TRACK_BEST_TIME','CANOE_BEST_TIME','ROWING_BEST_TIME']);
function classificationKind(t){
 if(!t||typeof t!=='object')throw Error(tr('Torneio inválido.'));
 const mode=t.scoringMode||null;
 if(mode==='RACE_POINTS')return 'RACE';
 if(TIMED_MODES.has(mode))return 'TIMED';
 if(mode==='FIELD_BEST_MARK')return 'MEASURED';
 if(mode==='RELAY_BEST_TIME')return 'RELAY'; // /relays, never /times
 if(mode==='CHESS_HALF_POINTS')return 'CHESS';
 if(mode==='EVENT_RANKING')return 'EVENT_RANKING';
 if(mode)return 'UNSUPPORTED';
 if(t.entryType==='TEAM')return TEAM_MATCH_SPORTS.has(t.sport||'')?'TEAM':'UNSUPPORTED';
 if(['Futebol','Futsal','Padel','Ténis','Xadrez'].includes(t.sport||''))return 'INDIVIDUAL';
 return 'UNSUPPORTED';
}
function label(kind){return ({RACE:tr('Campeonato por pontos de corrida'),TEAM:tr('Classificação por equipas'),INDIVIDUAL:tr('Classificação individual'),TIMED:tr('Melhores tempos'),MEASURED:tr('Melhores marcas'),RELAY:tr('Estafetas por tempo'),CHESS:tr('Pontos de xadrez'),EVENT_RANKING:tr('Classificação por provas'),UNSUPPORTED:tr('Classificação específica indisponível')})[kind]||'Classificação';}
function standingsColumns(kind){
 if(kind==='RACE')return [tr('Pos.'),tr('Piloto'),tr('Corridas'),tr('Pódios'),tr('Pontos')];
 if(kind==='TEAM')return [tr('Pos.'),tr('Equipa'),tr('tabela::J'),tr('tabela::V'),tr('tabela::E'),tr('tabela::D'),tr('Pts')];
 if(kind==='INDIVIDUAL')return [tr('Pos.'),tr('Jogador'),tr('tabela::J'),tr('tabela::V'),tr('tabela::E'),tr('tabela::D'),tr('Pts')];
 if(kind==='CHESS')return [tr('Pos.'),tr('Jogador'),tr('Partidas'),tr('tabela::V'),tr('tabela::E'),tr('tabela::D'),tr('Pontos')];
 if(kind==='TIMED'||kind==='RELAY')return [tr('Pos.'),tr('Participante'),tr('Melhor tempo')];
 if(kind==='MEASURED')return [tr('Pos.'),tr('Participante'),tr('Melhor marca')];
 return [tr('Pos.'),tr('Participante'),tr('Resultado')];
}
function isPerformanceKind(kind){return ['RACE','TIMED','MEASURED','RELAY'].includes(kind);}
function validTournamentId(value){const n=Number(value);if(!Number.isSafeInteger(n)||n<=0)throw Error(tr('Identificador de torneio inválido.'));return n;}
module.exports={RACE_SPORTS,TEAM_MATCH_SPORTS,classificationKind,label,standingsColumns,isPerformanceKind,validTournamentId};
