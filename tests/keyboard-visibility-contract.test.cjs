const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(file)=>untranslate(fs.readFileSync(path.join(root,file),'utf8'));

test('Android resizes the screen rather than panning behind the keyboard',()=>{
 const expo=require('../app.json').expo;
 assert.equal(expo.android.softwareKeyboardLayoutMode,'resize');
});
test('shared form pages provide keyboard avoidance and scrollable content',()=>{
 const source=read('src/components/UI.tsx');
 assert.match(source,/from 'react-native-keyboard-controller'/);
 // iOS pads; Android (edge-to-edge) measures the focused field against the keyboard.
 assert.match(source,/<KeyboardFrame style=\{styles\.keyboardFrame\}>/);
  assert.match(source,/keyboardShouldPersistTaps=\"handled\"/);
 assert.match(source,/keyboardDismissMode="on-drag"/);
});
test('posts, stories, comments, and story replies keep content above keyboard',()=>{
 const source=read('app/(tabs)/index.tsx');
 assert.match(source,/KeyboardFrame/);
 assert.match(source,/visible=\{identityMatches&&composerOpen\}/);
 assert.match(source,/visible=\{identityMatches&&storyComposer\}/);
 assert.match(source,/visible=\{identityMatches&&expandedComments!==null\}/);
 assert.ok((source.match(/<KeyboardFrame /g)||[]).length>=4,'four separate keyboard-aware wrappers');
});
test('editing a post is keyboard-aware',()=>{
 const source=read('src/components/PostEditSheet.tsx');
 assert.match(source,/<KeyboardFrame style=\{styles\.keyboardFrame\}>/);
 assert.match(source,/keyboardDismissMode="on-drag"/);
});

test('chat pages scroll focused controls into view without blindly jumping past replies',()=>{
 const page=read('src/components/UI.tsx');
 const community=read('src/components/CommunityChatPanel.tsx');
 const session=read('src/components/SessionChatPanel.tsx');
 // Show/hide listeners; the focused field is measured (not a blind jump to the end).
 assert.match(page,/<KeyboardAwareScrollView[^>]*bottomOffset=\{\d+\}/);
 assert.match(page,/if\(autoScrollToEnd&&nearBottom\.current\)/);
 assert.match(community,/<ScrollView ref=\{inlineHistoryRef\}/);
 assert.match(session,/<ScrollView ref=\{inlineHistoryRef\}/);
});

test('private messages scroll to the latest conversation only when the message composer has focus',()=>{
 const source=read('app/messages/[peer].tsx');
 assert.match(source,/const composerFocused=useRef\(false\)/);
 assert.match(source,/if\(!composerFocused\.current\)return/);
 assert.match(source,/onFocus=\{\(\)=>\{composerFocused\.current=true;if\(nearBottom\.current\)conversationScroll\.current\?\.scrollToEnd/);
 assert.match(source,/onBlur=\{\(\)=>\{composerFocused\.current=false;\}\}/);
 assert.match(source,/return\(\)=>subscription\.remove\(\)/);
});

test('long forms scroll the actual focused input above the keyboard',()=>{
 const source=read('src/components/UI.tsx');
 assert.match(source,/<KeyboardAwareScrollView[^>]*bottomOffset=\{\d+\}/);
 // Android: extra bottom space so mid-form inputs stay reachable above the keyboard.
 assert.match(source,/extraKeyboardSpace=\{\d+\}/);
});

test('sheets, dialogs and post comments keep the focused field above the keyboard',()=>{
 for(const file of ['src/components/AttendanceHistory.tsx','src/components/ReportSheet.tsx','src/components/PollComposer.tsx','app/posts/[postId]/index.tsx'])
  assert.match(read(file),/<KeyboardFrame/,file);
 // The call chat uses the frame only beside the video (wide); on a phone the call page follows the keyboard.
 assert.match(read('src/components/CallChatSidePanel.tsx'),/const Frame=wide\?KeyboardFrame:View/);
 assert.match(read('app/posts/[postId]/index.tsx'),/ref=\{keyboard\.scrollRef\} onScroll=\{keyboard\.onScroll\}/);
 const frame=read('src/components/KeyboardFrame.tsx');
 assert.match(frame,/export function useKeyboardReveal\(\)/);
 assert.match(frame,/<KeyboardAvoidingView style=\{style\} behavior=\"padding\"/);
});
