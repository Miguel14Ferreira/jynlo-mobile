'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/communities/[id]/chat.tsx'),'utf8');
test('community sends and photo uploads ignore late responses after navigation',()=>{
 assert.match(source,/const version=generation\.current,token=auth\.token,username=auth\.username/);
 assert.match(source,/await sendCommunityMessage\(id,message,token,username\)/);
 assert.match(source,/await sendChatPhoto\('community',id,token,selectedPhoto\)/);
 assert.match(source,/if\(version!==generation\.current\)return/);
 assert.match(source,/if\(activeChat\.current===identity\)\{sendingNow\.current=false;setSending\(false\);\}/);
 assert.match(source,/if\(activeChat\.current===identity\)\{uploadingNow\.current=false;setUploading\(false\);\}/);
});
test('community chat prevents concurrent sends and preserves newly typed draft',()=>{
 assert.match(source,/if\(sendingNow\.current\|\|uploadingNow\.current/);
 assert.match(source,/sendingNow\.current=true;setSending\(true\)/);
 assert.match(source,/setDraft\(current=>current===originalDraft\?'':current\)/);
 assert.match(source,/if\(version!==generation\.current\)return;\s*if\(!selected\.canceled/);
});

test('community chat keeps writes locked when navigating away and back',()=>{
 assert.match(source,/pendingWrites=useRef\(new Map<string,'text'\|'photo'>\(\)\)/);
 assert.match(source,/const pending=pendingWrites\.current\.get\(identity\)/);
 assert.match(source,/sendingNow\.current=Boolean\(pending\)/);
 assert.match(source,/pendingWrites\.current\.set\(identity,'text'\)/);
 assert.match(source,/pendingWrites\.current\.set\(identity,'photo'\)/);
 assert.match(source,/pendingWrites\.current\.delete\(identity\)/);
 assert.match(source,/pendingWrites\.current\.has\(identity\)/);
 assert.doesNotMatch(source,/sendingNow\.current=false;uploadingNow\.current=false;setSending\(false\);setUploading\(false\)/);
});
