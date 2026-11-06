'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'../app/messages/[peer].tsx'),'utf8');

test('direct chat history loads are scoped to current account and focused conversation',()=>{
 assert.match(screen,/const generation=useRef\(0\),conversation=useRef\(''\)/);
 assert.match(screen,/if\(refreshing\.current===version\)return/);
 assert.match(screen,/if\(version!==generation\.current\)return/);
 assert.match(screen,/if\(version===generation\.current&&!silent\)setLoading\(false\)/);
 assert.match(screen,/const identity=peer\+'\|'\+auth\.token/);
 assert.match(screen,/conversation\.current=identity/);
 assert.match(screen,/setMessages\(\[\]\);setDraft\(''\)/);
 assert.match(screen,/generation\.current\+\+;/);
 assert.match(screen,/refresh\(true,version\)/);
});

test('old direct-message send cannot erase draft or errors in the next conversation',()=>{
 assert.match(screen,/await sendDirectChat\(peer,draft,auth\.token\)/);
 assert.match(screen,/if\(version!==generation\.current\|\|conversation\.current!==identity\)return/);
 assert.match(screen,/setDraft\(''\);await refresh\(false,version\)/);
 assert.match(screen,/if\(version===generation\.current&&conversation\.current===identity\)/);
 assert.match(screen,/setSending\(false\);setPhotoBusy\(false\);sendingNow\.current=false/);
 assert.match(screen,/generation\.current\+\+;\};/);
});
