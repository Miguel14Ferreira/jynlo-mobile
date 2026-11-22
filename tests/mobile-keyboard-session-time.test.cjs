const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=(p)=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('Android session time field remains in a keyboard-aware scrollable Page',()=>{
 const page=read('src/components/UI.tsx');
 const create=read('app/sessions/create.tsx');
 const app=JSON.parse(read('app.json'));
 assert.equal(app.expo.android.softwareKeyboardLayoutMode,'resize');
 assert.match(create,/field\('Hora local','time','HH:mm \(24h\)','numeric'\)/);
 assert.match(create,/return <Page>/);
 assert.match(page,/Keyboard\.addListener\(Platform\.OS==='ios'\?'keyboardWillShow':'keyboardDidShow'/);
 assert.match(page,/scrollResponderScrollNativeHandleToKeyboard\(focused,64,true\)/);
 assert.match(page,/paddingBottom:keyboardHeight\+88/);
 assert.match(page,/onLayout=\{\(\)=>\{if\(keyboardVisible\.current\)scrollFocused\(\);\}\}/);
 assert.match(page,/onContentSizeChange=\{\(\)=>\{/);
 assert.match(page,/setKeyboardHeight\(0\)/);
});
