'use strict';
/** Private group chats (/api/private-groups) — same rules as the server and the web "Conversas de grupo". */
const MAX_MEMBERS=30,MAX_MESSAGE=2000;
const clean=s=>String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'');
function validateGroupTitle(title){
 const t=clean(title).replace(/\s+/g,' ').trim();
 if(t.length<2||t.length>90)throw new Error('O nome do grupo tem de ter entre 2 e 90 caracteres.');
 return t;
}
/** Invitees: 1–29 distinct friends, never yourself. currentCount is the group size when adding. */
function validateInvitees(usernames,me,currentCount){
 const seen=new Set(),out=[];
 for(const u of Array.isArray(usernames)?usernames:[]){
  const v=String(u||'').trim();if(!v)continue;const k=v.toLowerCase();
  if(k===String(me||'').toLowerCase()||seen.has(k))continue;seen.add(k);out.push(v);
 }
 if(!out.length)throw new Error('Escolhe pelo menos um amigo.');
 const room=MAX_MEMBERS-(currentCount||1);
 if(out.length>room)throw new Error(room<=0?'O grupo já tem 30 membros.':'Podes adicionar no máximo '+room+(room===1?' pessoa.':' pessoas.'));
 return out;
}
function validateGroupMessage(text){
 const t=clean(text).trim();
 if(!t)throw new Error('Escreve uma mensagem.');
 if(t.length>MAX_MESSAGE)throw new Error('A mensagem não pode ter mais de 2000 caracteres.');
 return t;
}
/** Merge pages / live updates by id, oldest first. */
function mergeMessages(current,incoming){
 const map=new Map();
 for(const m of [...(current||[]),...(incoming||[])])if(m&&Number.isSafeInteger(m.id))map.set(m.id,m);
 return [...map.values()].sort((a,b)=>a.id-b.id);
}
const isCreator=(group,me)=>!!group&&!!me&&String(group.creatorUsername||'').toLowerCase()===String(me).toLowerCase();
const isMine=(message,me)=>!!message&&!!me&&String(message.sender||'').toLowerCase()===String(me).toLowerCase();
function membersLabel(n){const c=Number(n)||0;return c+(c===1?' membro':' membros');}
/** Friends that can still be invited, filtered by a search term. */
function invitableFriends(friends,group,query){
 const inGroup=new Set(((group&&group.members)||[]).map(m=>String(m.username).toLowerCase()));
 const q=clean(query).trim().toLocaleLowerCase('pt-PT');
 return (friends||[]).filter(f=>f&&!inGroup.has(String(f.username).toLowerCase())).filter(f=>!q||
  [f.username,f.nickname,f.fullName].some(v=>v&&String(v).toLocaleLowerCase('pt-PT').includes(q)));
}
/** Own text message, not deleted, without files, sent less than 15 minutes ago (server rule). */
function editableGroupMessage(message,me,now=Date.now()){
 if(!message||message.deleted||!isMine(message,me))return false;
 if(Array.isArray(message.attachments)&&message.attachments.length)return false;
 if(typeof message.text!=='string'||!message.text.trim()||message.text.startsWith('[JYNLO:GIPHY:1]'))return false;
 const created=Date.parse(message.createdAt);
 return Number.isFinite(created)&&created<=now+60000&&now-created<=15*60*1000;
}
/** Short quote for a reply: who and what (the original may be older than the loaded page). */
function replyQuote(messages,message){
 if(!message||!Number.isSafeInteger(message.replyToId))return null;
 const original=(messages||[]).find(m=>m&&m.id===message.replyToId);
 if(!original)return {sender:'',text:'Mensagem anterior'};
 if(original.deleted)return {sender:original.sender,text:'Mensagem apagada'};
 const text=(original.text||'').trim()||((original.attachments||[])[0]?.filename)||'Anexo';
 return {sender:original.sender,text:text.length>120?text.slice(0,120)+'…':text};
}
module.exports={editableGroupMessage,replyQuote,MAX_MEMBERS,MAX_MESSAGE,validateGroupTitle,validateInvitees,validateGroupMessage,mergeMessages,isCreator,isMine,membersLabel,invitableFriends};
