'use strict';
const {tr}=require('./i18n-core.cjs');
function normalizeInstant(value){
 if(typeof value==='string' && !/^\d+(?:\.\d+)?$/.test(value.trim()))return value;
 if(typeof value!=='string'&&typeof value!=='number')return '';
 const n=Number(value);if(!Number.isFinite(n)||n<=0)return '';
 const date=new Date(Math.round(n<100_000_000_000?n*1000:n));
 return Number.isFinite(date.getTime())?date.toISOString():'';
}
function reconnectDelay(attempt){const n=Number.isFinite(attempt)?Math.max(0,Math.floor(attempt)):0;return Math.min(30_000,3000*(2**Math.min(n,4)));}
function parseCommunityEnvelope(raw,authenticated,expectedId){
 if(!authenticated)return null;
 let env;try{env=typeof raw==='string'?JSON.parse(raw):raw;}catch{return null;}
 if(env?.type!=='COMMUNITY_CHAT_MESSAGE')return null;
 const m=env.message;
 if(!m||m.kind!=='CHAT'||!Number.isSafeInteger(m.id)||m.id<=0||!Number.isSafeInteger(m.communityId)||m.communityId!==expectedId||typeof m.username!=='string'||typeof m.body!=='string')return null;
 return {...m,createdAt:normalizeInstant(m.createdAt)};
}
function mergeMessages(oldList,newList){
 const m=new Map();for(const x of [...oldList,...newList])if(Number.isSafeInteger(x?.id)&&x.id>0)m.set(x.id,x);
 return [...m.values()].sort((a,b)=>a.id-b.id);
}
function safePositiveId(value){const n=Number(value);if(!Number.isSafeInteger(n)||n<=0)throw Error(tr('Identificador inválido'));return n;}
function teamInviteUrl(origin,communityId,tournamentId,teamId){
 [communityId,tournamentId,teamId].forEach(safePositiveId);
 if(origin!=='https://d24sports.com')throw Error(tr('Origem não autorizada'));
 const u=new URL('/menu/communities/'+communityId,origin);
 u.searchParams.set('tab','tournaments');u.searchParams.set('tournament',String(tournamentId));u.searchParams.set('team',String(teamId));u.searchParams.set('teamPage',String(teamId));
 return u.toString();
}
module.exports={normalizeInstant,reconnectDelay,parseCommunityEnvelope,mergeMessages,safePositiveId,teamInviteUrl};
