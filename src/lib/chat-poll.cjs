'use strict';
/** Sondagem: same envelope as the server (ChatPoll.java) and the web. */
const PREFIX='[JYNLO:POLL:1]';
const MAX_QUESTION=140,MAX_OPTION=60,MIN_OPTIONS=2,MAX_OPTIONS=6;
const CONTROL=/[\u0000-\u001f\u007f]/;
function clean(question,options){
 const q=String(question||'').trim();
 const opts=(Array.isArray(options)?options:[]).map(o=>String(o||'').trim()).filter(o=>o.length>0);
 if(!q||q.length>MAX_QUESTION||CONTROL.test(q))return null;
 if(opts.length<MIN_OPTIONS||opts.length>MAX_OPTIONS)return null;
 const seen=new Set();
 for(const o of opts){
  const key=o.toLocaleLowerCase('pt-PT');
  if(o.length>MAX_OPTION||CONTROL.test(o)||seen.has(key))return null;
  seen.add(key);
 }
 return {question:q,options:opts};
}
function encodePoll(question,options){
 const poll=clean(question,options);
 return poll?PREFIX+[poll.question,...poll.options].join('\n'):'';
}
function readPoll(text){
 if(typeof text!=='string')return null;
 const trimmed=text.trim();
 if(!trimmed.startsWith(PREFIX))return null;
 const lines=trimmed.slice(PREFIX.length).split(/\r\n|\r|\n/);
 const options=lines.slice(1);
 if(options.some(o=>o.trim().length===0))return null;
 return clean(lines[0],options);
}
function isPollText(text){return typeof text==='string'&&text.trim().startsWith(PREFIX);}
module.exports={encodePoll,readPoll,isPollText,POLL_PREFIX:PREFIX,POLL_MAX_QUESTION:MAX_QUESTION,POLL_MAX_OPTION:MAX_OPTION,POLL_MAX_OPTIONS:MAX_OPTIONS};
