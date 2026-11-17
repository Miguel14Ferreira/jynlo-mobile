'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('native session memories use the same social post endpoint as the web with server-enforced privacy',()=>{
 const api=read('src/lib/social-feed-api.ts');
 const component=read('src/components/SessionMemoriesPanel.tsx');
 const screen=read('app/sessions/[id].tsx');
 assert.match(api,/export async function sessionSocialMemories\(sessionId:number,token:string\|null\)/);
 assert.match(api,/\/api\/feed\/sessions\/.*\/memories/);
 assert.match(component,/if\(!canSharePublicly\|\|!token\)return null/);
 assert.match(component,/post\.type==='POST'&&post\.sessionId===sessionId/);
 assert.match(component,/generation\.current/);
 assert.match(screen,/detail\.canSharePublicly===true\?/);
 assert.match(screen,/canPublish=\{owner\|\|detail\.joined\}/);
 assert.match(component,/pathname:'\/posts\/\[postId\]'/);
 assert.match(component,/\/api\/profile-media\//);
 assert.doesNotMatch(component,/publishPost\(/);
});

test('native post-game composer requires verified completion and membership',()=>{
 const home=read('app/(tabs)/index.tsx');
 const panel=read('src/components/SessionMemoriesPanel.tsx');
 assert.match(panel,/completed&&canPublish\?<Pressable/);
 assert.match(home,/sessionDetail\(gameId,actor,username\)/);
 assert.match(home,/game\.status!=='COMPLETED'\|\|game\.canSharePublicly!==true/);
 assert.match(home,/!game\.joined&&game\.creatorUsername\?\.toLowerCase\(\)!==username\.toLowerCase\(\)/);
 assert.match(home,/openPostComposer\(gameId\)/);
 assert.match(home,/router\.setParams\(\{momentSession:undefined,compose:undefined\}\)/);
 assert.match(home,/const linkedSessionId=composerSessionId/);
 assert.match(home,/publishPost\(body,media,actor,username,place,linkedSessionId\?\?undefined\)/);
 assert.match(home,/setComposerSessionId\(null\)/);
});

test('text and album publishing send the selected session identity, never attach it by default',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/createTextPost\(caption,token,username,place,sessionId\)/);
 assert.match(api,/\.\.\.\(sessionId\?\{sessionId\}:\{\}\)/);
 assert.match(api,/sessionId:String\(sessionId\)/);
 assert.match(api,/sessionId:sessionId\?\?null/);
 assert.match(api,/sessionId!==undefined&&\(!Number\.isSafeInteger\(sessionId\)\|\|sessionId<=0\)/);
});
