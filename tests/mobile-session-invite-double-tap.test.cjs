'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'../app/notifications.tsx'),'utf8');
const decision=screen.slice(screen.indexOf('async function decide('),screen.indexOf('async function open('));

test('rapid taps cannot answer the same invitation twice before React updates',()=>{
 assert.match(screen,/const inviteDecisionInFlight=useRef<number\|null>\(null\)/);
 assert.match(decision,/if\(!sameAccount\|\|!auth\.token\|\|inviteDecisionInFlight\.current!==null\)return/);
 assert.match(decision,/const operation=\+\+inviteOperation\.current/);
 assert.match(decision,/inviteDecisionInFlight\.current=operation/);
 assert.ok(decision.indexOf('inviteDecisionInFlight.current=operation')<decision.indexOf('await answerSessionInvite('));
});

test('old account operation cannot unlock a new account invitation response',()=>{
 assert.match(screen,/pushOperation\.current\+\+;inviteOperation\.current\+\+;\s*inviteDecisionInFlight\.current=null/);
 assert.match(decision,/if\(inviteDecisionInFlight\.current===operation\)inviteDecisionInFlight\.current=null/);
 assert.match(decision,/if\(account\.current===initialIdentity&&inviteOperation\.current===operation\)setBusyInvite\(null\)/);
});

test('server outcome, not optimistic local state, determines invitation confirmation',()=>{
 assert.match(decision,/await answerSessionInvite\(invite\.sessionId,invite\.id,accept,auth\.token/);
 assert.match(decision,/if\(account\.current!==initialIdentity\|\|inviteOperation\.current!==operation\)return/);
 assert.match(decision,/confirmedSessionJoin\(response\)/);
 assert.match(decision,/if\(accept&&!confirmed\)/);
 assert.match(decision,/confirmed\?\.state==='WAITLISTED'/);
});

test('acceptance must have a verified participant or waitlist receipt before dismissing invite',()=>{
 const decision=screen.slice(screen.indexOf('async function decide('),screen.indexOf('async function markAllRead('));
 assert.match(decision,/const confirmed=accept\?confirmedSessionJoin\(response\):null/);
 assert.match(decision,/if\(accept&&!confirmed\)/);
 assert.ok(decision.indexOf('if(accept&&!confirmed)')<decision.indexOf('setInvites(old=>old.filter'));
 assert.match(decision,/confirmed\?\.state==='WAITLISTED'/);
 assert.doesNotMatch(decision,/Resposta registada\. Abre a sessão/);
});
test('invite response API validates IDs and requires backend-confirmed accept states',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const api=fs.readFileSync(path.join(__dirname,'../src/lib/api.ts'),'utf8');
 const method=api.slice(api.indexOf('export async function answerSessionInvite('),api.indexOf('export async function logoutServer('));
 assert.match(method,/Number\.isSafeInteger\(sessionId\)/);
 assert.match(method,/Number\.isSafeInteger\(inviteId\)/);
 assert.match(method,/if\(accept&&!confirmedSessionJoin\(result\)\)/);
 assert.match(method,/decline is HTTP 204/);
});
