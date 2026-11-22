const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function source(file){return untranslate(fs.readFileSync(path.join(root,file),'utf8'));}
for(const screen of ['app/messages/[peer].tsx','src/components/CommunityChatPanel.tsx','src/components/SessionChatPanel.tsx']){
 test(screen+' can launch camera and gallery without bypassing media validation',()=>{
  const code=source(screen);
  assert.match(code,/async function choosePhoto\(source:'gallery'\|'camera'='gallery'\)/);
  assert.match(code,/source==='camera'\?/);
  assert.match(code,/launchCameraAsync\(\{mediaTypes:\['images','videos'\]/);
  assert.match(code,/videoMaxDuration:30/);
  assert.match(code,/launchImageLibraryAsync\(\{mediaTypes:\['images','videos'\]/);
  assert.match(code,/allowsMultipleSelection:true,selectionLimit:remaining/);
  assert.match(code,/appendChatMediaSelection\(current,(?:chosen|selected)\.assets\)/);
  assert.match(code,/accessibilityLabel="Abrir câmara"/);
  assert.match(code,/void choosePhoto\('camera'\)/);
  assert.match(code,/accessibilityLabel="Legenda dos anexos"/);
 });
}
