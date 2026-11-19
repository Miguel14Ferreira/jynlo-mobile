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
 assert.match(screen,/myStoryReplies\(auth\.token,requestedPage,auth\.username\)/);
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


test('Story responses are scoped to the active account, item and operation epoch',()=>{
 const screen=read('app/(tabs)/index.tsx');
 assert.match(screen,/const storyMutationEpoch=useRef\(0\)/);
 assert.match(screen,/storyMutationEpoch\.current\+\+;\s*submittingStory\.current=false;\s*setStoryBusy\(false\)/);
 assert.match(screen,/const id=story\.id,actor=token,operation=\+\+storyMutationEpoch\.current/);
 assert.match(screen,/activeAccount\.current===actor&&storyMutationEpoch\.current===operation/);
 assert.match(screen,/if\(!current\(\)\|\|activeStoryIdRef\.current!==id\)return/);
 assert.match(screen,/if\(current\(\)\)\{submittingStory\.current=false;setStoryBusy\(false\);setPaused\(false\);\}/);
});
test('Story deletion confirmations cannot execute after account or story changes',()=>{
 const screen=read('app/(tabs)/index.tsx');
 assert.match(screen,/activeAccount\.current!==actorToken\|\|activeStoryIdRef\.current!==storyId\)return/);
 assert.match(screen,/const operation=\+\+storyMutationEpoch\.current/);
 assert.match(screen,/if\(current\(\)&&activeStoryIdRef\.current===storyId\)\{onClose\(\);onDeleted\(\);\}/);
});


test('changing Story releases the previous Story mutation and audience state',()=>{
 const screen=read('app/(tabs)/index.tsx');
 assert.match(screen,/activeStoryIdRef\.current=story\?\.id\?\?null/);
 assert.match(screen,/storyMutationEpoch\.current\+\+;\s*submittingStory\.current=false;\s*setStoryBusy\(false\);\s*setPaused\(false\);\s*audienceRequest\.current\+\+/);
 assert.match(screen,/setAudience\(null\);setAudienceOpen\(false\);setAudienceBusy\(false\);setAudienceError\(''\)/);
 assert.match(screen,/\},\[story\?\.id\]\)/);
});
test('late media callbacks cannot mark another Story loaded or record a view',()=>{
 const screen=read('app/(tabs)/index.tsx');
 assert.match(screen,/if\(activeStoryIdRef\.current!==id\|\|activeAccount\.current!==actor\)return;\s*setMediaState\('ready'\)/);
 assert.match(screen,/recordStoryView\(id,actor\)\.catch/);
 assert.match(screen,/if\(activeAccount\.current===actor\)viewedStoryIds\.current\.delete\(id\)/);
 assert.match(screen,/const mediaFailed=\(\)=>\{/);
 assert.match(screen,/onPlaybackError=\{mediaFailed\}/);
 assert.match(screen,/onError=\{mediaFailed\}/);
 assert.match(screen,/onEnd=\{\(\)=>\{if\(activeStoryIdRef\.current===story\.id&&activeAccount\.current===token\)go\(1\);\}\}/);
});
