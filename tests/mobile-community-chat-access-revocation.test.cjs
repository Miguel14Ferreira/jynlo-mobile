const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/CommunityChatPanel.tsx'),'utf8'));

test('confirmed access revocation hides community history and composer',()=>{
 assert.match(source,/e instanceof ApiError&&\[401,403,404,410\]\.includes\(e\.status\)/);
 assert.match(source,/revokedRef\.current=true;setAccessRevoked\(true\);setMessages\(\[\]\);setDraft\(''\);[\s\S]*setPhoto\(null\);[\s\S]*setCanSendPhoto\(false\);setAttachmentsOpen\(false\)/);
 assert.match(source,/auth\.token&&!accessRevoked\?<KeyboardAvoidingView/);
 assert.match(source,/enabled=\{!accessRevoked&&!sending&&!uploading/);
 assert.match(source,/if\(!active\|\|version!==generation\.current\|\|revokedRef\.current\)return/);
});

test('network errors preserve historical community messages and can recover',()=>{
 assert.match(source,/setRefreshWarning\('Não foi possível sincronizar o chat/);
 assert.match(source,/revokedRef\.current=false;setAccessRevoked\(false\)/);
 assert.match(source,/setMessages\(old=>mergeMessages\(old,chat\)\)/);
});
