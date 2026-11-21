'use strict';
const ORIGIN='https://d24sports.com';
/** Only the two public routes are ever shared; anything else from the server is refused. */
function publicShareUrl(path){
 const p=String(path||'');
 if(!/^\/(torneio|classificacao)\/[1-9]\d*$/.test(p))throw Error('Ligação pública inválida.');
 return ORIGIN+p;
}
function shareMessage(kind,name,url){
 return kind==='TOURNAMENT'
  ?`🏆 ${name||'Torneio'} — classificação e jogos ao vivo na Jynlo:\n${url}`
  :`📊 Classificação da época — ${name||'comunidade'} na Jynlo:\n${url}`;
}
module.exports={publicShareUrl,shareMessage};
