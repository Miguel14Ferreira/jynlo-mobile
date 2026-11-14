'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/components/CommunityChatPanel.tsx'),'utf8');

test('community chat polls while websocket is offline and the app is active',()=>{
 assert.match(source,/connectionStatus\.current!=='online'&&AppState\.currentState==='active'/);
 assert.match(source,/setInterval\(\(\)=>\{/);
 assert.match(source,/15000\)/);
 assert.match(source,/AppState\.addEventListener\('change',state=>/);
 assert.match(source,/void refresh\(version,true\)/);
 assert.match(source,/clearInterval\(timer\);resume\.remove\(\)/);
});

test('background refresh is silent and coalesces concurrent history requests',()=>{
 assert.match(source,/if\(refreshing\.current===version\)\{queuedRefresh\.current=true;return;\}/);
 assert.match(source,/if\(!silent\)\{setLoading\(true\);setError\(''\);\}/);
 assert.match(source,/if\(!silent\)setError\(/);
 assert.match(source,/if\(!silent\)setLoading\(false\)/);
 assert.match(source,/if\(queuedRefresh\.current\)\{queuedRefresh\.current=false;void refresh\(version,true\);\}/);
});

test('community websocket reconnect reconciles missed history without user refresh',()=>{
 assert.match(source,/const wasConnected=connectionStatus\.current==='online'/);
 assert.match(source,/if\(status==='online'&&!wasConnected\)void refresh\(version,true\)/);
 assert.match(source,/setMessages\(old=>mergeMessages\(old,chat\)\)/);
 assert.match(source,/setRefreshWarning\(''\)/);
});
