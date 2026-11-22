'use strict';
const {tr}=require('./i18n-core.cjs');
/** "Adicionar ao calendário": a Google Calendar event link (opens the Calendar app on Android).
 * Google needs start AND end; the game lasts 90 minutes by default, like the web. */
const DEFAULT_MINUTES=90;
const icsUtc=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
function calendarWindow(gameDate,minutes){
 const start=new Date(gameDate);
 if(Number.isNaN(start.getTime()))return null;
 const end=new Date(start.getTime()+(Number.isFinite(minutes)&&minutes>0?minutes:DEFAULT_MINUTES)*60000);
 return {start,end,dates:icsUtc(start)+'/'+icsUtc(end)};
}
/** Exact address only when the viewer may see it (joined or organiser); otherwise just the city. */
function calendarLocation(session,exactAddress){
 const a=typeof exactAddress==='string'?exactAddress.trim():'';
 if(a)return a+(session&&session.city&&!a.toLowerCase().includes(String(session.city).toLowerCase())?', '+session.city:'');
 return (session&&session.city)||'';
}
function googleCalendarUrl(session,exactAddress,now){
 if(!session||!session.gameDate)return null;
 const w=calendarWindow(session.gameDate);
 if(!w||w.end.getTime()<(now||Date.now()))return null;
 const sport=session.sport||tr('Sessão');
 const q=new URLSearchParams({
  action:'TEMPLATE',
  text:'Jynlo — '+sport,
  dates:w.dates,
  details:tr('Sessão de {sport} na Jynlo.',{sport})+(session.creatorUsername?' '+tr('Criada por {user}.',{user:session.creatorUsername}):'')+
   (Number.isSafeInteger(session.id)?'\nhttps://jynlosports.com/sessions/'+session.id:''),
  location:calendarLocation(session,exactAddress)
 });
 return 'https://calendar.google.com/calendar/render?'+q.toString();
}
module.exports={DEFAULT_MINUTES,calendarWindow,calendarLocation,googleCalendarUrl};
