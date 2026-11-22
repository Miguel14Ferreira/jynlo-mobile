const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screen=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8'));

test('a canceled first feed load must retry stored hidden-post preferences',()=>{
 assert.match(screen,/const hiddenReadyRef=useRef\(false\)/);
 assert.match(screen,/hiddenReadyRef\.current=false;setHiddenReady\(false\)/);
 assert.match(screen,/\(identityChanged\|\|!hiddenReadyRef\.current\)&&auth\.token&&auth\.username\?readHiddenFeedEntries\(auth\.username\)/);
 assert.match(screen,/if\(!hiddenReadyRef\.current\)\{[\s\S]*?hiddenReadyRef\.current=true;setHiddenReady\(true\)/);
});

test('feed cannot expose a prior account’s hidden posts while preferences reload',()=>{
 assert.match(screen,/const visiblePosts=identityMatches&&hiddenReady\?posts\.filter/);
 assert.match(screen,/hiddenKeysRef\.current=\[\];setHiddenKeys\(\[\]\);setRecentlyHidden\(null\);hiddenReadyRef\.current=false;setHiddenReady\(false\)/);
 const read=screen.indexOf('readHiddenFeedEntries(auth.username)');
 const ignoreStale=screen.indexOf('if(id!==reloadNumber.current)return;',read);
 const markReady=screen.indexOf('hiddenReadyRef.current=true;setHiddenReady(true)',read);
 assert.ok(read>0&&ignoreStale>read&&markReady>ignoreStale,'stale loads must not mark a new account ready');
});


test('failed hidden-post storage reads must never unlock visible posts',()=>{
 const begin=screen.indexOf('if(!hiddenReadyRef.current){',screen.indexOf('const fetches=await Promise.allSettled'));
 const end=screen.indexOf("if(fetches[0].status==='rejected')",begin);
 const block=screen.slice(begin,end);
 assert.match(block,/if\(fetches\[3\]\.status==='fulfilled'\)/);
 assert.match(block,/hiddenKeysRef\.current=stored;setHiddenKeys\(stored\)/);
 assert.match(block,/hiddenReadyRef\.current=true;setHiddenReady\(true\)/);
 assert.match(block,/else\{[\s\S]*?setError\('Não foi possível ler as publicações ocultadas/);
 assert.equal(block.split('hiddenReadyRef.current=true').length-1,1);
 assert.match(screen,/const visiblePosts=identityMatches&&hiddenReady\?posts\.filter/);
 assert.match(screen,/onPress=\{\(\)=>void load\(\)\}/);
});
