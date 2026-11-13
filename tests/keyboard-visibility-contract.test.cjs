'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');

test('Android resizes the screen rather than panning behind the keyboard',()=>{
 const expo=require('../app.json').expo;
 assert.equal(expo.android.softwareKeyboardLayoutMode,'resize');
});
test('shared form pages provide keyboard avoidance and scrollable content',()=>{
 const source=read('src/components/UI.tsx');
 assert.match(source,/KeyboardAvoidingView/);
 assert.match(source,/behavior=\{Platform\.OS==='ios'\?'padding':'height'\}/);
 assert.match(source,/keyboardShouldPersistTaps="handled"/);
 assert.match(source,/keyboardDismissMode="on-drag"/);
});
test('posts, stories, comments, and story replies keep content above keyboard',()=>{
 const source=read('app/(tabs)/index.tsx');
 assert.match(source,/KeyboardAvoidingView/);
 assert.match(source,/visible=\{identityMatches&&composerOpen\}/);
 assert.match(source,/visible=\{identityMatches&&storyComposer\}/);
 assert.match(source,/visible=\{identityMatches&&expandedComments!==null\}/);
 assert.ok((source.match(/KeyboardAvoidingView/g)||[]).length>=8,'four separate keyboard-aware wrappers');
});
test('editing a post is keyboard-aware',()=>{
 const source=read('src/components/PostEditSheet.tsx');
 assert.match(source,/KeyboardAvoidingView/);
 assert.match(source,/keyboardDismissMode="on-drag"/);
});
