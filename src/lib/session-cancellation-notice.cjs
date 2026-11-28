'use strict';
const {tr}=require('./i18n-core.cjs');
/** Public-only cancellation message suitable for external invitees.
 * Never accept address, precise coordinates, password or private notes.
 */
function cancellationNotice({sport,gameDate,city}={}){
 const label=(value,missing='')=>typeof value==='string'&&value.trim()
   ?value.trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,80):missing;
 const parsed=typeof gameDate==='string'?Date.parse(gameDate):NaN;
 const date=Number.isFinite(parsed)?new Date(parsed).toLocaleString('pt-PT',{
   timeZone:'Europe/Lisbon',day:'2-digit',month:'2-digit',year:'numeric',
   hour:'2-digit',minute:'2-digit'
 }):'';
 const summary=[label(sport,'desporto'),date,label(city)].filter(Boolean).join(' · ');
 return tr('⚠️ Jogo cancelado — {summary}. O organizador cancelou este jogo e o jogo não se vai realizar. Por favor, não te desloques ao recinto.',{summary});
}
module.exports={cancellationNotice};
