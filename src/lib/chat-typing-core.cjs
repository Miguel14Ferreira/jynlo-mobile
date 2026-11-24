'use strict';
/** Pure helpers for the ephemeral "typing…" indicator (shared with tests). */
const KINDS=['direct','session','community','team','private'];
/** Does a CHAT_TYPING event belong to the chat that is open? Direct chats are keyed by the sender. */
function matches(event,kind,id,self){
 if(!event||typeof event!=='object'||!KINDS.includes(event.kind)||event.kind!==kind)return false;
 if(typeof event.username!=='string'||typeof event.conversationId!=='string'||typeof event.active!=='boolean')return false;
 if(self&&event.username.toLowerCase()===String(self).toLowerCase())return false;
 return event.conversationId.toLowerCase()===String(id).toLowerCase();
}
/** Same wording as the website. */
function label(kind,users,t){
 if(!users.length)return '';
 if(kind==='direct')return t('A escrever…');
 return users.length===1?t('{name} está a escrever…',{name:users[0]}):t('Várias pessoas estão a escrever…');
}
module.exports={KINDS,matches,label};
