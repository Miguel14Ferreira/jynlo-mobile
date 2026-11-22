const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=file=>untranslate(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
const chats=[
 'src/components/SessionChatPanel.tsx',
 'src/components/CommunityChatPanel.tsx',
 'app/messages/[peer].tsx'
];
test('each chat checks camera authorization before invoking native capture',()=>{
 for(const filename of chats){
  const source=read(filename);
  assert.match(source,/import \{ensureChatCameraPermission\} from/);
  const guard=source.indexOf("if(source==='camera'&&!await ensureChatCameraPermission())return;");
  const camera=source.indexOf("ImagePicker.launchCameraAsync(",guard);
  assert.ok(guard>=0&&camera>guard,filename);
  assert.match(source,/ImagePicker\.launchImageLibraryAsync\(/);
  // Community chat releases the picker lock only for the operation that took it.
  assert.match(source,/finally\{(pickerInFlight\.current=false;\}|\s*if\(pickerOwner\.current===identity&&pickerEpoch\.current===operation\)\{\s*pickerInFlight\.current=false;)/);
 }
});
test('shared permission denial provides Android settings recovery and leaves gallery independent',()=>{
 const source=read('src/lib/chat-camera-permission.ts');
 assert.match(source,/requestCameraPermissionsAsync\(\)/);
 assert.match(source,/if\(permission\.granted\)return true/);
 assert.match(source,/Linking\.openSettings\(\)/);
 assert.match(source,/return false/);
});
test('all three chats display vector previews for videos',()=>{
 for(const filename of chats){
  const source=read(filename);
  assert.match(source,/<JynloIcon name="video"/);
  assert.doesNotMatch(source,/>▶ Vídeo</);
 }
});

test('location links share one validated parser across all chat types',()=>{
 for(const filename of chats){
  const source=read(filename);
  assert.match(source,/chatLocationUrl\(/);
  assert.match(source,/Linking\.openURL\(chatLocationUrl\(/);
 }
 const helper=read('src/lib/chat-location.cjs');
 assert.match(helper,/Math\.abs\(lat\)>90\|\|Math\.abs\(lng\)>180/);
});
