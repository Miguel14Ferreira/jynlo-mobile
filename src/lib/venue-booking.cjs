'use strict';
/** What the venue "Reservar" button does, from the best information available (same rules as the web). */
function safeBookingUrl(raw){
  const value=String(raw||'').trim();
  if(!value)return null;
  const url=/^[a-z][a-z0-9+.-]*:/i.test(value)?value:'https://'+value;
  try{
    const p=new URL(url);
    if(p.protocol!=='https:'||!p.hostname.includes('.')||p.username||p.password)return null;
    return p.toString();
  }catch{return null;}
}
function telephoneUrl(contact){
  if(!contact)return null;
  const c=String(contact).trim().replace(/^(?:tel(?:efone)?|contacto|phone)\s*:\s*/i,'');
  if(!c||/[@\/?#;]|https?:|[a-z]/i.test(c)||!/^\+?[0-9\s().-]+$/.test(c))return null;
  const d=c.replace(/\D/g,'');
  if(/^351[289]\d{8}$/.test(d)&&c.startsWith('+'))return 'tel:+'+d;
  if(/^[289]\d{8}$/.test(d)&&!c.includes('+'))return 'tel:+351'+d;
  return null;
}
function whatsAppUrl(tel){
  const d=String(tel||'').replace(/\D/g,'');
  return /^3519[1236]\d{7}$/.test(d)?'https://wa.me/'+d:null;
}
function venueBookingAction(venue){
  if(!venue)return null;
  if(venue.freeAccess===true)return {kind:'free'};
  const link=safeBookingUrl(venue.bookingUrl)||safeBookingUrl(venue.website);
  if(link)return {kind:'link',url:link};
  const tel=telephoneUrl(venue.contact);
  if(tel)return {kind:'phone',url:tel,whatsapp:whatsAppUrl(tel)};
  const q=[venue.name,venue.city,'reservar'].filter(p=>p&&String(p).trim()).join(' ');
  return q?{kind:'search',url:'https://www.google.com/search?q='+encodeURIComponent(q)}:null;
}
module.exports={safeBookingUrl,telephoneUrl,whatsAppUrl,venueBookingAction};
