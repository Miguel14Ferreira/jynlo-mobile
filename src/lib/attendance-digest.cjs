'use strict';

/** Mirror the web attendance digest: one compact activity per session, not
 * one social post per participant. Use only already-authorized feed items.
 * Never synthesize extra participants or fetch private attendance rosters.
 */
function attendanceDigest(items,currentUsername) {
 const bySession=new Map();
 const current=String(currentUsername||'').trim().toLowerCase();
 for(const item of items||[]){
  if(item?.type!=='SESSION_ATTENDED'||!Number.isSafeInteger(item.sessionId)||item.sessionId<=0)continue;
  let row=bySession.get(item.sessionId);
  if(!row){
   row={sessionId:item.sessionId,item,count:0,ownActivity:null,usernames:new Set()};
   bySession.set(item.sessionId,row);
  }
  const username=String(item.authorUsername||'').trim().toLowerCase();
  if(username)row.usernames.add(username);
  if(username&&username===current)row.ownActivity=item;
 }
 return [...bySession.values()].map(row=>({
  sessionId:row.sessionId,
  item:row.item,
  count:row.usernames.size,
  ownActivity:row.ownActivity
 }));
}
function isDigestAttendance(item) {
 return item?.type==='SESSION_ATTENDED' && Number.isSafeInteger(item.sessionId)&&item.sessionId>0;
}
function attendanceTitle(group){
 const representative=group.ownActivity||group.item;
 const name=representative.authorDisplayName||representative.authorUsername||'Alguém';
 const sport=group.item.sport||'desporto';
 return group.count>1
  ? `${name} e mais ${group.count-1} participaram numa sessão de ${sport}`
  : `${name} participou numa sessão de ${sport}`;
}
module.exports={attendanceDigest,isDigestAttendance,attendanceTitle};
