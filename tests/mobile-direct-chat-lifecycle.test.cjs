'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'../app/messages/[peer].tsx'),'utf8');

test('direct chat history loads are scoped to current account and focused conversation',()=>{
 assert.match(screen,/const generation=useRef\(0\),conversation=useRef\(''\)/);
 assert.match(screen,/if\(refreshing\.current===version\)\{/);
 assert.match(screen,/if\(version!==generation\.current\)return/);
 assert.match(screen,/if\(!silent\)setLoading\(false\)/);
 assert.match(screen,/const identity=peer\+'\|'\+auth\.token/);
 assert.match(screen,/conversation\.current=identity/);
 assert.match(screen,/setMessages\(\[\]\);setDraft\(''\)/);
 assert.match(screen,/generation\.current\+\+;/);
 assert.match(screen,/refresh\(true,version\)/);
});

test('old direct-message send cannot erase draft or errors in the next conversation',()=>{
 assert.match(screen,/await sendDirectChat\(peer,submittedText,auth\.token\)/);
 assert.match(screen,/if\(version!==generation\.current\|\|conversation\.current!==identity\)return/);
 assert.match(screen,/setDraft\(current=>current===submittedText\?'':current\)/);
 assert.match(screen,/await refresh\(false,version\)/);
 assert.match(screen,/if\(version===generation\.current&&conversation\.current===identity\)/);
 assert.match(screen,/setSending\(false\);setPhotoBusy\(false\);sendingNow\.current=false/);
 assert.match(screen,/generation\.current\+\+;\};/);
});

test('old photo upload cannot clear another conversation attachment or status',()=>{
 assert.match(screen,/await sendDirectPhoto\(peer,auth\.token,photo\)/);
 assert.match(screen,/if\(version!==generation\.current\|\|conversation\.current!==identity\)return/);
 assert.match(screen,/setPhoto\(null\);await refresh\(false,version\)/);
 assert.match(screen,/if\(version===generation\.current&&conversation\.current===identity\)\{/);
 assert.match(screen,/sendingNow\.current=false;setPhotoBusy\(false\)/);
});

test('sending while a history poll is in flight queues a new refresh',()=>{
 assert.match(screen,/const pendingRefresh=useRef\(false\)/);
 assert.match(screen,/if\(refreshing\.current===version\)\{/);
 assert.match(screen,/pendingRefresh\.current=true/);
 assert.match(screen,/if\(pendingRefresh\.current\)\{/);
 assert.match(screen,/pendingRefresh\.current=false;\s*void refresh\(true,version\)/);
 assert.match(screen,/pendingRefresh\.current=false;generation\.current\+\+/);
});

test('late gallery result cannot replace selected photo in another conversation',()=>{
 assert.match(screen,/const selected=await ImagePicker\.launchImageLibraryAsync\(/);
 assert.match(screen,/if\(version!==generation\.current\|\|conversation\.current!==identity\)return/);
 assert.match(screen,/if\(!selected\.canceled&&selected\.assets\?\.\[0\]\)setPhoto\(selected\.assets\[0\]\)/);
 assert.match(screen,/if\(version===generation\.current&&conversation\.current===identity\)\s*setError\('Não foi possível abrir a galeria\.'/);
});

test('parallel send actions cannot race and new text is preserved',()=>{
 assert.match(screen,/if\(sending\|\|sendingNow\.current\|\|!auth\.token/);
 assert.match(screen,/if\(!auth\.token\|\|!photo\|\|!photoAvailable\|\|photoBusy\|\|sending\|\|sendingNow\.current\)return/);
 assert.match(screen,/const submittedText=draft\.trim\(\)/);
 assert.match(screen,/setDraft\(current=>current===submittedText\?'':current\)/);
});
