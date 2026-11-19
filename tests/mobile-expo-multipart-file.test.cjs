'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('social Stories and posts send Expo File objects rather than unsupported URI dictionaries',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/new File\(uri\) as unknown as Blob,'jynlo-media\.'\+extension/);
 assert.match(api,/form\.append\(forceFilesParts\|\|files\.length>1\?'files':file\.type==='video'\?'video':'image'/);
 assert.doesNotMatch(api,/form\.append\(files\.length>1\?'files'[\s\S]{0,90}\{\s*uri,/);
 assert.match(api,/Authorization:\s*`Bearer \$\{token\}`/);
 assert.match(api,/confirmedSocialMediaReceipt\(/);
});
test('private, session and community chat media use native Blob-backed files in all flows',()=>{
 const paths=['src/lib/direct-photo-attachment.ts','src/lib/chat-photo-attachment.ts',
  'src/lib/chat-photo-album.ts','src/lib/chat-pdf-attachment.ts'];
 for(const file of paths){
  const source=read(file);
  assert.match(source,/new File\([^)]*\)|form\.append\((?:target\.scope==='team'\?'files':'file'|'file'),file as unknown as Blob/);
  assert.doesNotMatch(source,/form\.append\('(?:file|files)',\{\s*uri:/);
  assert.match(source,/credentials:'omit'/);
 }
});
test('post and Story receipt is inserted directly into the feed after confirmed server success',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/const created=await publishPost\(/);
 assert.match(home,/setPosts\(current=>\[created,\.\.\.current\.filter\(item=>item\.postId!==created\.postId\)\]\)/);
 assert.match(home,/const created=await publishStory\(/);
 assert.match(home,/setOwnStories\(current=>\[created,\.\.\.current\.filter\(item=>item\.id!==created\.id\)\]\)/);
 assert.match(home,/catch\(e\)\{\s*if\(feedIdentity\.current===`\$\{username\}:\$\{actor\}`\)/);
});
test('media upload retains user draft when server confirmation is uncertain',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/postInFlight\.current=true/);
 assert.match(home,/storyInFlight\.current=true/);
 assert.match(home,/if\(unchanged\)\{/);
 assert.match(home,/Alert\.alert\('Publicação',message\)/);
 assert.match(home,/Alert\.alert\('Story',message\)/);
});

test('freshly confirmed posts are retained until the authenticated feed catches up',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/const recentlyConfirmedPosts=useRef/);
 assert.match(home,/const recentlyConfirmedStories=useRef/);
 assert.match(home,/entry\.until>Date\.now\(\)&&!received\.some\(item=>item\.postId===entry\.item\.postId\)/);
 assert.match(home,/entry\.until>Date\.now\(\)&&!received\.some\(item=>item\.id===entry\.item\.id\)/);
 assert.match(home,/const merged=\[\.\.\.recentlyConfirmedPosts\.current\.map\(entry=>entry\.item\),\.\.\.visibleReceived\]/);
 assert.match(home,/setOwnStories\(\[\.\.\.recentlyConfirmedStories\.current\.map\(entry=>entry\.item\),\.\.\.received\]\)/);
 assert.match(home,/recentlyConfirmedPosts\.current=\[\.\.\.recentlyConfirmedPosts\.current\.filter/);
 assert.match(home,/recentlyConfirmedStories\.current=\[\.\.\.recentlyConfirmedStories\.current\.filter/);
 assert.match(home,/recentlyConfirmedPosts\.current=\[\];recentlyConfirmedStories\.current=\[\]/);
});


test('replacing media uses the repeated files contract even for one file',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/const confirmed=await sendMedia\(`\/api\/feed\/posts\/\$\{postId\}\/media`/);
 assert.match(api,/files,token!,'PUT',true\)/);
 assert.match(api,/forceFilesParts\|\|files\.length>1\?'files'/);
});
test('publish notices from previous accounts cannot overwrite the current feed',()=>{
 const screen=read('app/(tabs)/index.tsx');
 assert.match(screen,/if\(feedIdentity\.current===`\$\{username\}:\$\{actor\}`&&linkedSessionId&&created\.sessionId!==linkedSessionId\)/);
 for(const message of [
  'Publicação enviada. Não foi possível atualizar o feed',
  'Story enviada. Não foi possível atualizar o feed'
 ]){
  const index=screen.indexOf(message);
  assert.ok(index>0,message);
  const before=screen.slice(Math.max(0,index-180),index);
  assert.match(before,/if\(feedIdentity\.current===`\$\{username\}:\$\{actor\}`\)/);
 }
});
