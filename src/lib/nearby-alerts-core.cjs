'use strict';
// "Novos jogos perto de ti": choices and checks for the settings screen.
// The server validates again; these keep the screen honest and testable.

const RADII_KM=Object.freeze([10,25,50,100]);
const MAX_SPORTS=12;

// Reference points for a manual choice, so the person never has to share GPS.
const PLACES=Object.freeze([
 {label:'Lisboa',latitude:38.72,longitude:-9.14},
 {label:'Porto',latitude:41.15,longitude:-8.61},
 {label:'Braga',latitude:41.55,longitude:-8.42},
 {label:'Coimbra',latitude:40.21,longitude:-8.43},
 {label:'Aveiro',latitude:40.64,longitude:-8.65},
 {label:'Leiria',latitude:39.74,longitude:-8.81},
 {label:'Setúbal',latitude:38.52,longitude:-8.89},
 {label:'Évora',latitude:38.57,longitude:-7.91},
 {label:'Faro',latitude:37.02,longitude:-7.93},
 {label:'Viseu',latitude:40.66,longitude:-7.91},
 {label:'Funchal',latitude:32.65,longitude:-16.91},
 {label:'Ponta Delgada',latitude:37.74,longitude:-25.67},
].map(Object.freeze));

function emptyPreference(){return{enabled:false,latitude:null,longitude:null,placeLabel:null,radiusKm:25,sports:[]};}

function round2(value){return Math.round(value*100)/100;}

/** Approximate position (about 1 km), as stored by the server. */
function approximate(latitude,longitude){
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return null;
 return{latitude:round2(latitude),longitude:round2(longitude)};
}

function normalizePreference(value){
 const base=emptyPreference();
 if(!value||typeof value!=='object')return base;
 const point=typeof value.latitude==='number'&&typeof value.longitude==='number'?approximate(value.latitude,value.longitude):null;
 return{
  enabled:value.enabled===true&&!!point,
  latitude:point?point.latitude:null,
  longitude:point?point.longitude:null,
  placeLabel:typeof value.placeLabel==='string'&&value.placeLabel.trim()?value.placeLabel.trim().slice(0,80):null,
  radiusKm:RADII_KM.includes(value.radiusKm)?value.radiusKm:25,
  sports:Array.isArray(value.sports)?value.sports.filter(s=>typeof s==='string'&&s.trim()).map(s=>s.trim()).slice(0,MAX_SPORTS):[],
 };
}

function key(sport){return sport.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();}

function toggleSport(preference,sport){
 const present=preference.sports.some(s=>key(s)===key(sport));
 if(present)return{...preference,sports:preference.sports.filter(s=>key(s)!==key(sport))};
 if(preference.sports.length>=MAX_SPORTS)return preference;
 return{...preference,sports:[...preference.sports,sport]};
}

/** Up to `limit` catalog sports that match the search and are not yet chosen. */
function sportSuggestions(catalog,search,chosen,limit=8){
 const q=key(search.trim());
 if(!q)return[];
 const taken=new Set(chosen.map(key));
 return catalog.filter(s=>key(s).includes(q)&&!taken.has(key(s))).slice(0,limit);
}

/** Error message for the screen, or '' when the draft can be saved. */
function problem(preference){
 if(preference.enabled&&(preference.latitude===null||preference.longitude===null))return 'Escolhe um local para receberes avisos.';
 return '';
}

function samePreference(a,b){return JSON.stringify(normalizePreference(a))===JSON.stringify(normalizePreference(b));}

function summary(preference){
 if(!preference.enabled)return 'Desligado';
 const where=preference.placeLabel||'o local escolhido';
 const what=preference.sports.length?preference.sports.join(', '):'todas as modalidades';
 return `Até ${preference.radiusKm} km de ${where} · ${what}`;
}

module.exports={RADII_KM,MAX_SPORTS,PLACES,emptyPreference,approximate,normalizePreference,toggleSport,sportSuggestions,problem,samePreference,summary};
