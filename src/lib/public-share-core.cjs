'use strict';
const {tr}=require('./i18n-core.cjs');
const ORIGIN='https://jynlosports.com';
/** Only the two public routes are ever shared; anything else from the server is refused. */
function publicShareUrl(path){
 // Older servers answer with the Portuguese addresses; links always go out in English.
 const p=String(path||'').replace(/^\/torneio\//,'/tournaments/').replace(/^\/classificacao\//,'/rankings/');
 if(!/^\/(tournaments|rankings)\/[1-9]\d*$/.test(p))throw Error(tr('Ligação pública inválida.'));
 return ORIGIN+p;
}
function shareMessage(kind,name,url){
 return kind==='TOURNAMENT'
  ?tr('🏆 {name} — classificação e jogos ao vivo na Jynlo:',{name:name||tr('Torneio')})+'\n'+url
  :tr('📊 Classificação da época — {name} na Jynlo:',{name:name||tr('comunidade')})+'\n'+url;
}
module.exports={publicShareUrl,shareMessage};
