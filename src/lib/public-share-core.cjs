'use strict';
const {tr}=require('./i18n-core.cjs');
const ORIGIN='https://d24sports.com';
/** Only the two public routes are ever shared; anything else from the server is refused. */
function publicShareUrl(path){
 const p=String(path||'');
 if(!/^\/(torneio|classificacao)\/[1-9]\d*$/.test(p))throw Error(tr('Ligação pública inválida.'));
 return ORIGIN+p;
}
function shareMessage(kind,name,url){
 return kind==='TOURNAMENT'
  ?tr('🏆 {name} — classificação e jogos ao vivo na Jynlo:',{name:name||tr('Torneio')})+'\n'+url
  :tr('📊 Classificação da época — {name} na Jynlo:',{name:name||tr('comunidade')})+'\n'+url;
}
module.exports={publicShareUrl,shareMessage};
