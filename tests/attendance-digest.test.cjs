const test=require('node:test');
const assert=require('node:assert/strict');
const {attendanceDigest,isDigestAttendance,attendanceTitle}=require('../src/lib/attendance-digest.cjs');
const {feedEntryKey,hideEntry}=require('../src/lib/feed-visibility.cjs');

const activity=(id,username,name='Miguel')=>({
 type:'SESSION_ATTENDED',sessionId:id,authorUsername:username,
 authorDisplayName:name,sport:'Futebol',city:'Cacém',gameDate:'2026-10-22T19:00:00Z'
});
test('groups attendance into a single session row and prefers the signed-in participant',()=>{
 const a=activity(22,'ana','Ana'),b=activity(22,'miguel','Miguel');
 const rows=attendanceDigest([a,b,activity(33,'joao','João')],'MIGUEL');
 assert.equal(rows.length,2);
 assert.equal(rows[0].count,2);
 assert.equal(rows[0].ownActivity,b);
 assert.equal(attendanceTitle(rows[0]),'Miguel e mais 1 participaram num jogo de Futebol');
});
test('does not count the same account twice or merge unrelated sessions',()=>{
 const a=activity(22,'miguel');
 const rows=attendanceDigest([a,{...a},activity(34,'miguel')],'miguel');
 assert.equal(rows[0].count,1);
 assert.equal(rows[1].count,1);
 assert.equal(attendanceTitle(rows[0]),'Miguel participou num jogo de Futebol');
});
test('preserves other activities and handles invalid identifiers',()=>{
 const other={type:'POST',postId:1};
 assert.equal(isDigestAttendance(other),false);
 assert.equal(isDigestAttendance(activity(0,'miguel')),false);
 assert.equal(attendanceDigest([other,activity(0,'miguel'),activity(22,'miguel')],null).length,1);
});
test('hiding one attendance digest hides every participant entry of its session only',()=>{
 const a=activity(22,'miguel'),b=activity(22,'ana'),c=activity(23,'joao');
 const hidden=hideEntry([],feedEntryKey(a));
 assert.ok(hidden.includes(feedEntryKey(b)));
 assert.ok(!hidden.includes(feedEntryKey(c)));
});
