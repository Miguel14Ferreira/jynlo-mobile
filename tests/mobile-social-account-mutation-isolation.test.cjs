const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const feed=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8'));

test('account changes release all mutation locks and clear obsolete busy UI',()=>{
 assert.match(feed,/postActionInFlight\.current=false;commentWriteLock\.current=false/);
 assert.match(feed,/postInFlight\.current=false;storyInFlight\.current=false;mediaPickerInFlight\.current=false/);
 assert.match(feed,/setPublishing\(false\);setStoryPublishing\(false\)/);
 assert.match(feed,/setCommentWriteBusy\(null\);setBusyPost\(null\)/);
});

test('old post deletes and attendance hides cannot release a newer account lock',()=>{
 assert.match(feed,/\.finally\(\(\)=>\{if\(feedIdentity\.current===identity\)\{postActionInFlight\.current=false;setBusyPost\(null\);\}\}\)/);
 assert.match(feed,/if\(feedIdentity\.current===account\)\{postActionInFlight\.current=false;setBusyPost\(null\);\}/);
});

test('old comment submissions, likes and edits cannot release a new account lock',()=>{
 assert.match(feed,/if\(account===feedIdentity\.current\)\{commentWriteLock\.current=false;setBusyPost\(null\);\}/);
 assert.match(feed,/finally\{if\(account===feedIdentity\.current\)\{commentWriteLock\.current=false;setCommentWriteBusy\(null\);\}\}/);
});

test('stale uploads and pickers cannot modify new account progress',()=>{
 assert.match(feed,/finally\{if\(feedIdentity\.current===\x60\$\{username\}:\$\{actor\}\x60\)\{postInFlight\.current=false;setPublishing\(false\);\}\}/);
 assert.match(feed,/finally\{if\(feedIdentity\.current===\x60\$\{username\}:\$\{actor\}\x60\)\{storyInFlight\.current=false;setStoryPublishing\(false\);\}\}/);
 assert.match(feed,/finally\{if\(activeStoryAccount\.current===actorToken\)mediaPickerInFlight\.current=false;\}/);
});
