'use strict';
// Jynlo court bookings: pure helpers shared by the venue, management and "my bookings" screens.

/** "24", "24,5" or "24.50 €" → cents; '' → null (price at the venue); invalid → undefined. */
function parsePrice(value){
 const raw=String(value??'').replace('€','').trim();
 if(!raw)return null;
 if(!/^\d{1,4}([.,]\d{1,2})?$/.test(raw))return undefined;
 return Math.round(Number(raw.replace(',','.'))*100);
}

/** Cents → "24,00 €" (or "€24.00" in English); null when the price is set at the venue. */
function formatPrice(cents,language){
 if(cents===null||cents===undefined||!Number.isFinite(cents))return null;
 const value=(cents/100).toFixed(2);
 return language==='en'?'€'+value:value.replace('.',',')+' €';
}

/** Cents → the text shown in the price field ("24" or "24,50"). */
function priceField(cents){
 if(cents===null||cents===undefined)return '';
 return (cents/100).toFixed(2).replace('.',',').replace(/,00$/,'');
}

function lisbonParts(date){
 const parts={};
 for(const p of new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit',
   hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date))parts[p.type]=p.value;
 return parts;
}

/** "18:00" in Lisbon. */
function lisbonTime(iso){const p=lisbonParts(new Date(iso));return p.hour+':'+p.minute;}

/** "26/11, 18:00" in Lisbon. */
function lisbonDateTime(iso){const p=lisbonParts(new Date(iso));return p.day+'/'+p.month+', '+p.hour+':'+p.minute;}

/** Today and the next days as YYYY-MM-DD in Lisbon. */
function nextLisbonDays(count,from){
 const start=from instanceof Date?from:new Date();
 const days=[];
 for(let i=0;i<count;i++){const p=lisbonParts(new Date(start.getTime()+i*86400000));days.push(p.year+'-'+p.month+'-'+p.day);}
 return [...new Set(days)];
}

/** Opening hours are valid when every range is HH:mm, opens before it closes and does not overlap another that day. */
function validateHours(rows){
 const re=/^([01]\d|2[0-3]):[0-5]\d$/;
 const byDay={};
 for(const r of rows||[]){
  if(!re.test(r.openTime||'')||!re.test(r.closeTime||''))return 'format';
  if(r.openTime>=r.closeTime)return 'order';
  const list=byDay[r.dayOfWeek]||(byDay[r.dayOfWeek]=[]);
  if(list.some(o=>r.openTime<o.closeTime&&r.closeTime>o.openTime))return 'overlap';
  list.push(r);
 }
 return null;
}

/** A booking can still be cancelled by the player while it holds a future slot. */
function canCancel(booking,now){
 const t=now instanceof Date?now.getTime():Date.now();
 return !!booking&&(booking.status==='PENDING'||booking.status==='CONFIRMED')&&Date.parse(booking.startAt)>t;
}

/** Params that open game creation at the booked venue, day and time, linked to the booking. */
function createGameParams(booking,sport){
 const p=lisbonParts(new Date(booking.startAt));
 const params={venueId:String(booking.venueId),bookingId:String(booking.id),day:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute};
 if(sport&&String(sport).trim())params.sport=String(sport).trim();
 return params;
}

module.exports={parsePrice,formatPrice,priceField,lisbonTime,lisbonDateTime,nextLisbonDays,validateHours,canCancel,createGameParams};
