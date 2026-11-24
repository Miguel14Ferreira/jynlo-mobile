'use strict';
// Splits chat text into plain text and web links (http/https only; never other schemes).
const LINK=/(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|jynlosports\.com(?:\/[^\s<>"']*)?)/gi;
const TRAILING=/[.,;:!?)\]}»"']+$/;
function linkParts(value){
 const text=String(value??'');const parts=[];let index=0;
 for(const match of text.matchAll(LINK)){
  const start=match.index??0;
  if(start>0&&!/\s/.test(text[start-1])&&!/^https?:/i.test(match[0])&&!/^www\./i.test(match[0]))continue;
  let raw=match[0];const trailing=(raw.match(TRAILING)||[''])[0];
  if(trailing)raw=raw.slice(0,raw.length-trailing.length);
  if(!raw)continue;
  const href=/^https?:\/\//i.test(raw)?raw:'https://'+raw;
  let url=null;try{url=new URL(href);}catch{url=null;}
  if(!url||(url.protocol!=='https:'&&url.protocol!=='http:'))continue;
  if(start>index)parts.push({text:text.slice(index,start),url:null,internalPath:null});
  const internal=/(^|\.)jynlosports\.com$/i.test(url.hostname);
  parts.push({text:raw,url:url.href,internalPath:internal?(url.pathname+url.search)||'/':null});
  index=start+raw.length;
 }
 if(index<text.length)parts.push({text:text.slice(index),url:null,internalPath:null});
 return parts.length?parts:[{text,url:null,internalPath:null}];
}
module.exports={linkParts};
