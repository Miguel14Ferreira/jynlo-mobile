const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/CommunityChatPanel.tsx'),'utf8'));

test('community chat refreshes promptly offline and periodically online',()=>{
 assert.match(source,/AppState\.currentState==='active'&&!sendingNow\.current/);
 assert.match(source,/connectionStatus\.current!=='online'\|\|pollTicks%6===0/);
 assert.match(source,/setInterval\(\(\)=>\{/);
 assert.match(source,/\},5000\)/);
 assert.match(source,/AppState\.addEventListener\('change',state=>/);
 assert.match(source,/void refresh\(version,true\)/);
 assert.match(source,/clearInterval\(timer\);resume\.remove\(\)/);
});

test('background refresh is silent and coalesces concurrent history requests',()=>{
 assert.match(source,/if\(refreshing\.current===version\)\{queuedRefresh\.current=true;return;\}/);
 assert.match(source,/if\(!silent\)\{setLoading\(true\);setError\(''\);\}/);
 assert.match(source,/if\(!silent\)\{const message=e instanceof Error/);
 assert.match(source,/if\(!silent\)setLoading\(false\)/);
 assert.match(source,/if\(queuedRefresh\.current\)\{queuedRefresh\.current=false;void refresh\(version,true\);\}/);
});

test('community websocket reconnect reconciles missed history without user refresh',()=>{
 assert.match(source,/const wasConnected=connectionStatus\.current==='online'/);
 assert.match(source,/if\(status==='online'&&!wasConnected\)void refresh\(version,true\)/);
 assert.match(source,/setMessages\(old=>mergeMessages\(old,chat\)\)/);
 assert.match(source,/setRefreshWarning\(''\)/);
});
