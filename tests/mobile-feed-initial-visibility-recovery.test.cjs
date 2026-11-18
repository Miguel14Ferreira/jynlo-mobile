'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');

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
