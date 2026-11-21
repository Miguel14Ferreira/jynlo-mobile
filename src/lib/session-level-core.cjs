'use strict';
/** Level a session is aimed at. null = all levels welcome. The server validates. */
const LEVELS=['BEGINNER','INTERMEDIATE','ADVANCED'];
const LABELS={BEGINNER:'Iniciante',INTERMEDIATE:'Intermédio',ADVANCED:'Avançado'};
function isLevel(value){return typeof value==='string'&&LEVELS.includes(value);}
function levelLabel(value){return isLevel(value)?LABELS[value]:'Todos os níveis';}
/** Chips for search: '' = any level. */
function filterChoices(){return [{value:'',label:'Qualquer nível'},...LEVELS.map(v=>({value:v,label:LABELS[v]}))];}
/** Chips for create/edit: '' = all levels. */
function sessionChoices(){return [{value:'',label:'Todos os níveis'},...LEVELS.map(v=>({value:v,label:LABELS[v]}))];}
module.exports={LEVELS,isLevel,levelLabel,filterChoices,sessionChoices};
