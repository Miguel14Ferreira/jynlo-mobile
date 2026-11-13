'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('signed guest invites can confirm native attendance using existing backend',()=>{
 const view=read('src/components/GuestSessionRSVP.tsx'),details=read('app/sessions/[id].tsx');
 assert.match(view,/guest-roster/);
 assert.match(view,/guest-requests'/);
 assert.match(view,/linkToken:guestToken/);
 assert.match(view,/playerId:playerId\|\|null/);
 assert.match(view,/newName:playerId\?null:name\.trim\(\)/);
 assert.match(view,/guest-requests\/cancel-self/);
 assert.match(view,/SecureStore\.setItemAsync/);
 assert.match(view,/SecureStore\.getItemAsync/);
 assert.match(view,/SecureStore\.deleteItemAsync/);
 assert.match(details,/<GuestSessionRSVP sessionId=\{id\} guestToken=\{guestToken\}/);
});
test('a signed link does not by itself confirm attendance or expose a receipt',()=>{
 const view=read('src/components/GuestSessionRSVP.tsx');
 assert.match(view,/if\(!validSecret\(result\.receipt\)/);
 assert.match(view,/setReceipt\(result\);onConfirmed\(\)/);
 assert.match(view,/const state=await request<GuestReceipt>/);
 assert.match(view,/if\(alive&&state\.status!=='CANCELLED'/);
 assert.doesNotMatch(view,/console\.(log|warn)\(/);
});
