'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../app/notifications.tsx'),'utf8');

test('notification and invitation lists are rendered only for the currently authenticated account',()=>{
 assert.match(code,/const sameAccount=Boolean\(auth\.token&&auth\.username&&account\.current===auth\.username\+'\|'\+auth\.token\)/);
 assert.match(code,/const visibleItems=sameAccount\?items:\[\]/);
 assert.match(code,/const visibleInvites=sameAccount\?invites:\[\]/);
 assert.match(code,/\{sameAccount&&!loading\?<View/);
 assert.match(code,/visibleInvites\.map\(invite=>/);
 assert.match(code,/filteredItems\.map\(n=>/);
 assert.match(code,/const filteredItems=unreadOnly\?visibleItems\.filter\(item=>!item\.read\):visibleItems/);
 assert.doesNotMatch(code,/>Convites para sessões · \{invites\.length\}/);
 assert.doesNotMatch(code,/>Outras notificações · \{items\.length\}/);
});

test('old account cannot trigger invitation, notification, push changes or request refresh',()=>{
 assert.match(code,/if\(!sameAccount\|\|!auth\.token\|\|inviteDecisionInFlight\.current!==null\)return/);
 assert.match(code,/if\(!sameAccount\|\|!auth\.token\|\|!auth\.username\)return/);
 assert.match(code,/if\(!sameAccount\|\|!auth\.username\|\|!auth\.token\|\|pushBusy\)return/);
 assert.match(code,/disabled=\{!sameAccount\|\|loading\|\|busyInvite!==null\}/);
});

test('stale notifications replies require matching generation AND account',()=>{
 assert.match(code,/if\(version!==generation\.current\|\|account\.current!==auth\.username\+'\|'\+auth\.token\)return/);
 assert.match(code,/if\(version===generation\.current&&account\.current===auth\.username\+'\|'\+auth\.token\)\{/);
});
