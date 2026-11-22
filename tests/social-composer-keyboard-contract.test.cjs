const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'..','app','(tabs)','index.tsx'),'utf8'));

test('separate post and Story editors scroll their focused fields above keyboard',()=>{
 assert.match(source,/const postComposerScrollRef=useRef<ScrollViewInstance\|null>\(null\)/);
 assert.match(source,/const storyComposerScrollRef=useRef<ScrollViewInstance\|null>\(null\)/);
 assert.match(source,/Keyboard\.addListener\(showEvent/);
 assert.match(source,/return\(\)=>subscription\.remove\(\)/);
 assert.match(source,/scrollResponderScrollNativeHandleToKeyboard\(focused,28,true\)/);
 assert.match(source,/<ScrollView ref=\{postComposerScrollRef\}/);
 assert.match(source,/<ScrollView ref=\{storyComposerScrollRef\}/);
 assert.match(source,/keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"/);
});
test('lower post and Story text fields explicitly scroll into view on focus',()=>{
 for(const name of ['composerText','composerLocation']){
   assert.match(source,new RegExp('<TextInput onFocus=\\{event=>scrollComposerInput\\(\\\'post\\\',event\\.target\\)\\}[^>]*value=\\{'+name+'\\}'));
 }
 for(const name of ['storyCaption','storyLocation','storyTags','storyFriendSearch']){
   assert.match(source,new RegExp('<TextInput onFocus=\\{event=>scrollComposerInput\\(\\\'story\\\',event\\.target\\)\\}[^>]*value=\\{'+name+'\\}'));
 }
});
test('post media album uses shared icons for reordering without losing file-level controls',()=>{
 assert.match(source,/accessibilityLabel=\{'Mover ficheiro '\+\(i\+1\)\+' para trás'\}/);
 assert.match(source,/accessibilityLabel=\{'Mover ficheiro '\+\(i\+1\)\+' para a frente'\}/);
 assert.match(source,/<JynloIcon name="back" color=\{TEAL\}/);
 assert.match(source,/<JynloIcon name="chevron-right" color=\{TEAL\}/);
 assert.doesNotMatch(source,/<Text style=\{styles\.removeMediaText\}>[←→]<\/Text>/);
 assert.match(source,/changeComposerMedia\(prev=>moveAlbumItem/);
});

test('editing a published post retains focused description and location above keyboard',()=>{
 const edit=untranslate(fs.readFileSync(path.join(__dirname,'..','src','components','PostEditSheet.tsx'),'utf8'));
 assert.match(edit,/Keyboard\.addListener\(showEvent/);
 assert.match(edit,/return\(\)=>subscription\.remove\(\)/);
 assert.match(edit,/<ScrollView ref=\{editorScrollRef\}/);
 assert.match(edit,/scrollResponderScrollNativeHandleToKeyboard\(focused,28,true\)/);
 assert.match(edit,/accessibilityLabel="Editar descrição da publicação"/);
 assert.match(edit,/accessibilityLabel="Editar localização da publicação"/);
 assert.ok((edit.match(/onFocus=\{event=>editorScrollRef\.current\?\.scrollResponderScrollNativeHandleToKeyboard/g)||[]).length===2);
});
