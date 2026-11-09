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
 assert.match(source,/if\(version===generation\.current\)\{sendingNow\.current=false;setSending\(false\);\}/);
 assert.match(source,/if\(version===generation\.current\)\{uploadingNow\.current=false;setUploading\(false\);\}/);
});
test('community chat prevents concurrent sends and preserves newly typed draft',()=>{
 assert.match(source,/if\(sendingNow\.current\|\|uploadingNow\.current/);
 assert.match(source,/sendingNow\.current=true;setSending\(true\)/);
 assert.match(source,/setDraft\(current=>current===originalDraft\?'':current\)/);
 assert.match(source,/if\(version!==generation\.current\)return;\s*if\(!selected\.canceled/);
});
