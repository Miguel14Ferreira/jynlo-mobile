const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const feed=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8'));
const source=feed.slice(feed.indexOf('const identityChanged='),feed.indexOf('setLoading(true);setError(\'\');',feed.indexOf('const identityChanged=')));

test('account changes dismiss open stories and draft media, not just feed lists',()=>{
 assert.match(source,/if\(identityChanged\)\{/);
 for(const name of ['setStoryViewer(null)','setStoryComposer(false)','setStoryMedia(null)','setStoryCaption(\'\')',
  'setComposerOpen(false)','changeComposerMedia(()=>[])','setComposerText(\'\')',
  'setExpandedComments(null)','setComments([])','setCommentText(\'\')']){
  assert.ok(source.includes(name),name);
 }
});

test('old comment responses cannot repopulate new-account feed',()=>{
 assert.match(feed,/const commentsRequest=useRef\(0\)/);
 assert.match(source,/commentsRequest\.current\+\+/);
 const comments=feed.slice(feed.indexOf('async function openComments'),feed.indexOf('async function submitComment'));
 assert.match(comments,/const requestId=\+\+commentsRequest\.current/);
 assert.match(comments,/if\(requestId===commentsRequest\.current\)setComments\(next\)/);
 assert.match(comments,/if\(requestId===commentsRequest\.current\)setCommentsLoading\(false\)/);
});
