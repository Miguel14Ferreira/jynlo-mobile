'use strict';
const {tr}=require('./i18n-core.cjs');
const DISTRICTS=['Aveiro','Beja','Braga','Bragança','Castelo Branco','Coimbra','Évora','Faro','Guarda','Leiria','Lisboa','Portalegre','Porto','Santarém','Setúbal','Viana do Castelo','Vila Real','Viseu'];
const LIMITS={name:140,city:120,district:120,address:255,venueType:80,surfaceType:80,openingHours:1000,priceInfo:255,contact:255,website:255};
function parseGps(latitude,longitude){
 const lat=String(latitude||'').trim(),lon=String(longitude||'').trim();
 if(!lat&&!lon)return {latitude:null,longitude:null};
 // Require both decimal components; do not silently drop a half-entered point.
 if(!/^-?(?:0|[1-9]\d{0,2})(?:\.\d{1,7})?$/.test(lat)||!/^-?(?:0|[1-9]\d{0,2})(?:\.\d{1,7})?$/.test(lon))
  throw new Error(tr('Indica latitude e longitude decimais completas, com ponto.'));
 const a=Number(lat),b=Number(lon);
 if(!Number.isFinite(a)||!Number.isFinite(b)||a<36.8||a>42.3||b< -9.6||b> -6.0)
  throw new Error(tr('As coordenadas devem estar na área de Portugal continental suportada.'));
 return {latitude:a,longitude:b};
}
function parseHttps(value){
 if(!value.trim())return null;
 try{const u=new URL(value.trim());
  if(u.protocol!=='https:'||!u.hostname||u.username||u.password||u.port&&u.port!=='443')
   throw new Error();
  return u.href;
 }catch{throw new Error(tr('O website tem de ser uma ligação HTTPS válida.'));}
}
function buildVenueRequest(fields,sports,catalog){
 const cleaned={};
 for(const [field,max] of Object.entries(LIMITS)){
  const value=String(fields[field]||'').trim();
  if(value.length>max)throw new Error('O campo '+field+' excede o limite permitido.');
  cleaned[field]=value;
 }
 if(!cleaned.name||!cleaned.city)throw new Error(tr('O nome e a cidade são obrigatórios.'));
 if(cleaned.district&&!DISTRICTS.includes(cleaned.district))throw new Error(tr('Seleciona um distrito válido.'));
 if(!['INDOOR','OUTDOOR','BOTH'].includes(fields.environmentType))
  throw new Error(tr('Seleciona o ambiente do recinto.'));
 if(fields.ownershipType&&!['PUBLIC','PRIVATE'].includes(fields.ownershipType))
  throw new Error(tr('Tipo de propriedade inválido.'));
 if(!Array.isArray(catalog)||!catalog.length)throw new Error(tr('Catálogo de modalidades indisponível.'));
 if(sports.some(s=>!catalog.includes(s)))throw new Error(tr('Existem modalidades que não pertencem ao catálogo Jynlo.'));
 const selected=[...new Set(sports)];
 const sportsCsv=selected.join(';');
 if(sportsCsv.length>255)throw new Error(tr('Selecionaste demasiadas modalidades.'));
 const gps=parseGps(fields.latitude,fields.longitude);
 if(!cleaned.address&&gps.latitude===null)
  throw new Error(tr('Indica uma morada ou um par de coordenadas GPS.'));
 const url=parseHttps(cleaned.website);
 return {
  name:cleaned.name,city:cleaned.city,district:cleaned.district||null,
  address:cleaned.address||null,sports:sportsCsv||null,
  venueType:cleaned.venueType||null,ownershipType:fields.ownershipType||null,
  surfaceType:cleaned.surfaceType||null,environmentType:fields.environmentType,
  indoor:fields.environmentType!=='OUTDOOR',
  changingRooms:!!fields.changingRooms,
  toilets:fields.toilets===true?true:null,showers:fields.showers===true?true:null,
  accessible:fields.accessible===true?true:null,wifi:fields.wifi===true?true:null,
  lighting:!!fields.lighting,parking:!!fields.parking,
  openingHours:cleaned.openingHours||null,priceInfo:cleaned.priceInfo||null,
  contact:cleaned.contact||null,website:url,
  latitude:gps.latitude,longitude:gps.longitude
 };
}
module.exports={DISTRICTS,parseGps,parseHttps,buildVenueRequest};
