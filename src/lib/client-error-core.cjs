'use strict';
// Builds the error report the app sends to /api/client-errors and decides
// whether to send it. Pure, so it is tested without React Native.
//
// Privacy: no username, token, email or screen content is added here. The
// route is the path only (query strings dropped); the server masks again.

const MAX_PER_RUN=10;
const REPEAT_WINDOW_MS=60_000;
const MAX_MESSAGE=300;
const MAX_STACK=1500;

function text(value,max){
  if(typeof value!=='string')return '';
  const trimmed=value.trim();
  return trimmed.length>max?trimmed.slice(0,max):trimmed;
}

function routeOnly(route){
  if(typeof route!=='string')return '';
  return text(route.split('?')[0].split('#')[0],120);
}

function errorParts(error){
  if(error instanceof Error)return{message:error.name&&error.name!=='Error'?`${error.name}: ${error.message}`:error.message,stack:error.stack};
  if(typeof error==='string')return{message:error,stack:''};
  if(error&&typeof error==='object'&&typeof error.message==='string')return{message:error.message,stack:typeof error.stack==='string'?error.stack:''};
  return{message:'',stack:''};
}

/** @returns the request body, or null when there is nothing worth sending. */
function buildReport(error,{platform,appVersion,route,fatal}={}){
  if(platform!=='android'&&platform!=='ios'&&platform!=='web')return null;
  const parts=errorParts(error);
  const message=text(parts.message,MAX_MESSAGE);
  if(!message)return null;
  return{platform,appVersion:text(appVersion,32),route:routeOnly(route),message,stack:text(parts.stack,MAX_STACK),fatal:fatal===true};
}

/** Tracks what was sent in this run of the app. */
function createSendGate(now=()=>Date.now()){
  let sent=0;
  const lastByKey=new Map();
  return function shouldSend(report){
    if(!report||sent>=MAX_PER_RUN)return false;
    const key=report.message+'|'+(report.stack.split('\n')[0]||'');
    const at=now(),last=lastByKey.get(key);
    if(last!==undefined&&at-last<REPEAT_WINDOW_MS)return false;
    lastByKey.set(key,at);
    sent++;
    return true;
  };
}

module.exports={buildReport,createSendGate,MAX_PER_RUN,REPEAT_WINDOW_MS};
