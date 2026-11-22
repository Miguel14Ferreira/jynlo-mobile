'use strict';
/** Builds the /api/ideas/submit body; returns an error key in Portuguese when something is missing. */
const KINDS={IDEA:'Sugestão',PROBLEM:'Problema',OTHER:'Outro assunto'};
function buildFeedback(input){
  const name=String(input.name||'').trim().slice(0,120);
  const email=String(input.email||'').trim().slice(0,255);
  const message=String(input.message||'').trim();
  const kind=KINDS[input.kind]?input.kind:'IDEA';
  if(name.length<2)return {error:'Indica o teu nome.'};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {error:'Indica um email válido para te podermos responder.'};
  if(message.length<10)return {error:'Escreve pelo menos 10 caracteres.'};
  if(message.length>4000)return {error:'A mensagem pode ter no máximo 4000 caracteres.'};
  const platform=String(input.platform||'').slice(0,20);
  return {body:{name,email,city:null,gender:null,
    subject:('App '+(platform?platform+' · ':'')+KINDS[kind]).slice(0,160),
    problem:message}};
}
module.exports={KINDS,buildFeedback};
