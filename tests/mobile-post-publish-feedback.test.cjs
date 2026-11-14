'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const feed=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');

test('a server-confirmed post is inserted immediately and gets visible feedback',()=>{
 assert.match(feed,/const created=await publishPost\(body,media,actor,username,place\)/);
 assert.match(feed,/recentlyConfirmedPosts\.current=\[/);
 assert.match(feed,/setPosts\(current=>\[created,\.\.\.current\.filter\(item=>item\.postId!==created\.postId\)\]\)/);
 assert.match(feed,/setPublishNotice\('post'\)/);
 assert.match(feed,/Publicação confirmada! Já aparece no teu feed/);
});

test('a server-confirmed story is inserted immediately and gets visible feedback',()=>{
 assert.match(feed,/const created=await publishStory\(body,media,actor,username,null,geometry,details\)/);
 assert.match(feed,/setOwnStories\(current=>\[created,\.\.\.current\.filter\(item=>item\.id!==created\.id\)\]\)/);
 assert.match(feed,/setPublishNotice\('story'\)/);
 assert.match(feed,/Story confirmada! Já aparece nas tuas Stories/);
});

test('publication success never belongs to another account or survives account switch',()=>{
 assert.match(feed,/if\(feedIdentity\.current===\x60\$\{username\}:\$\{actor\}\x60\)\{/);
 assert.match(feed,/recentlyConfirmedPosts\.current=\[\];recentlyConfirmedStories\.current=\[\];setPublishNotice\(null\)/);
 assert.match(feed,/identityMatches&&publishNotice\?/);
 assert.match(feed,/accessibilityLabel="Fechar confirmação de publicação"/);
});
