'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {feedEntryKey,normalizeHiddenEntries,hideEntry,showEntry,MAX_ENTRIES}=
  require('../src/lib/feed-visibility.cjs');
const root=path.join(__dirname,'..');

test('feed hiding uses the same stable server-backed identity as the web',()=>{
 assert.equal(feedEntryKey({type:'POST',postId:17}), 'post:17');
 assert.equal(feedEntryKey({type:'SESSION_ATTENDED',sessionId:21}), 'attendance:21');
 assert.equal(feedEntryKey({type:'SESSION_CREATED',sessionId:21,authorUsername:'Miguel'}),'created:21:miguel');
 assert.equal(feedEntryKey({type:'POST',postId:0}),null);
 assert.equal(feedEntryKey({type:'POST',postId:1.7}),null);
 assert.equal(feedEntryKey({type:'SESSION_CREATED',sessionId:12,authorUsername:null}),null);
});

test('hiding is undoable and bounded per account without duplicating entries',()=>{
 const one=hideEntry([], 'post:17');
 assert.deepEqual(one,['post:17']);
 assert.deepEqual(hideEntry(one,'post:17'),one);
 assert.deepEqual(showEntry(one,'post:17'),[]);
 assert.deepEqual(normalizeHiddenEntries(['post:1','invalid','post:1','attendance:12']),['post:1','attendance:12']);
 const many=Array.from({length:MAX_ENTRIES+3},(_,i)=>'post:'+(i+1));
 assert.deepEqual(normalizeHiddenEntries(many),many.slice(-MAX_ENTRIES));
});

test('mobile feed has viewer-local hide, undo and protected author actions',()=>{
 const code=fs.readFileSync(path.join(root,'app/(tabs)/index.tsx'),'utf8');
 const api=fs.readFileSync(path.join(root,'src/lib/social-feed-api.ts'),'utf8');
 const store=fs.readFileSync(path.join(root,'src/lib/feed-visibility-store.ts'),'utf8');
 assert.match(code,/Ocultar do meu feed/);
 assert.match(code,/Desfazer/);
 assert.match(code,/Ocultar esta atividade para todos/);
 assert.match(code,/Eliminar a minha publicação/);
 assert.match(code,/hideAttendanceActivity\(item\.sessionId,auth\.token\)/);
 assert.match(code,/deletePost\(item\.postId,auth\.token\)/);
 assert.match(code,/posts\.filter\(item=>/);
 assert.match(api,/api\/feed\/attendance\/\$\{sessionId\}\/hide/);
 assert.match(store,/expo-secure-store/);
 assert.match(store,/username\.toLowerCase\(\)/);
 assert.doesNotMatch(store,/localStorage/);
});
