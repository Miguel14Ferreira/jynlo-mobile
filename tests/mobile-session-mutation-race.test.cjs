'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'../app/sessions/[id].tsx'),'utf8');

test('two rapid session actions cannot issue duplicate mutations',()=>{
 const perform=screen.slice(screen.indexOf('const perform=async('),screen.indexOf('const s=detail||preview'));
 assert.match(screen,/const operationInFlight=useRef\(false\)/);
 assert.match(perform,/if\(operationInFlight\.current\)return/);
 assert.match(perform,/operationInFlight\.current=true/);
 assert.match(perform,/const result=await operation\(\)/);
 assert.match(perform,/operationInFlight\.current=false/);
 assert.ok(perform.indexOf('operationInFlight.current=true')<perform.indexOf('await operation()'));
});

test('session mutation response cannot report success for another route or user',()=>{
 const perform=screen.slice(screen.indexOf('const perform=async('),screen.indexOf('const s=detail||preview'));
 assert.match(perform,/const version=detailRequestGeneration\.current/);
 assert.match(perform,/if\(version!==detailRequestGeneration\.current\)return/);
 assert.match(perform,/if\(version===detailRequestGeneration\.current\)/);
});

test('busy state recovers after load refresh yet does not affect a newly focused route',()=>{
 assert.match(screen,/const actionEpoch=useRef\(0\)/);
 assert.match(screen,/detailRequestGeneration\.current\+\+;actionEpoch\.current\+\+/);
 const perform=screen.slice(screen.indexOf('const perform=async('),screen.indexOf('const s=detail||preview'));
 assert.match(perform,/const epoch=actionEpoch\.current/);
 assert.match(perform,/await load\(\)/);
 assert.match(perform,/if\(epoch===actionEpoch\.current\)setBusy\(false\)/);
});
