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

test('chat pages scroll focused controls into view without blindly jumping past replies',()=>{
 const page=read('src/components/UI.tsx');
 const community=read('src/components/CommunityChatPanel.tsx');
 const session=read('src/components/SessionChatPanel.tsx');
 assert.match(page,/Platform\.OS==='ios'\?'keyboardWillShow':'keyboardDidShow'/);
 assert.match(page,/Keyboard\.addListener\(event,/);
 assert.match(page,/scrollResponderScrollNativeHandleToKeyboard\(focused,24,true\)/);
 assert.match(page,/else if\(autoScrollToEnd&&nearBottom\.current\)/);
 assert.match(page,/return\(\)=>subscription\.remove\(\)/);
 assert.match(community,/<ScrollView ref=\{inlineHistoryRef\}/);
 assert.match(session,/<ScrollView ref=\{inlineHistoryRef\}/);
});

test('private messages scroll to the latest conversation only when the message composer has focus',()=>{
 const source=read('app/messages/[peer].tsx');
 assert.match(source,/const composerFocused=useRef\(false\)/);
 assert.match(source,/Keyboard\.addListener\(event,/);
 assert.match(source,/if\(!composerFocused\.current\)return/);
 assert.match(source,/onFocus=\{\(\)=>\{composerFocused\.current=true;if\(nearBottom\.current\)conversationScroll\.current\?\.scrollToEnd/);
 assert.match(source,/onBlur=\{\(\)=>\{composerFocused\.current=false;\}\}/);
 assert.match(source,/return\(\)=>subscription\.remove\(\)/);
});

test('long forms scroll the actual focused input above the keyboard',()=>{
 const source=read('src/components/UI.tsx');
 assert.match(source,/if\(!scroll\)return/);
 assert.match(source,/TextInput\.State\.currentlyFocusedInput\?\.\(\)/);
 assert.match(source,/scrollResponderScrollNativeHandleToKeyboard\(focused,24,true\)/);
 assert.match(source,/Keyboard\.addListener\(event,/);
 assert.match(source,/return\(\)=>subscription\.remove\(\)/);
});
