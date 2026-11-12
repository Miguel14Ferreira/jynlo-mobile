'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('private Story replies are requested with the active account token and pagination',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/export async function myStoryReplies\(/);
 assert.match(api,/\/api\/stories\/me\/replies\?page=/);
 assert.match(api,/if\(!token\)throw Error/);
 assert.match(api,/Number\.isSafeInteger\(page\)/);
});
test('only authenticated recipient sees previously stored Story replies',()=>{
 const screen=read('app/stories/replies.tsx');
 assert.match(screen,/sameAccount=Boolean\(auth\.token&&auth\.username&&identity===currentAccount\.current\)/);
 assert.match(screen,/sameAccount\?items\.map\(reply=>/);
 assert.match(screen,/generation\.current/);
 assert.match(screen,/page\.current=requestedPage\+1/);
 assert.match(screen,/setHasMore\(results\.length===20\)/);
 assert.match(screen,/Continuam guardadas depois de as Stories expirarem/);
});
test('notifications surface private reply inbox even if optional push alerts are off',()=>{
 const screen=read('app/notifications.tsx');
 assert.match(screen,/sameAccount\?<Button secondary title="Respostas privadas às minhas Stories"/);
 assert.match(screen,/router\.push\('\/stories\/replies'\)/);
});
