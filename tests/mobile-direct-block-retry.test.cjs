'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/messages/[peer].tsx'),'utf8');

test('initial block status and manual retry are scoped to the latest request',()=>{
 assert.match(source,/const blockCheckRequest=useRef\(0\)/);
 assert.match(source,/const blockRequest=\+\+blockCheckRequest\.current/);
 assert.match(source,/blockCheckRequest\.current===blockRequest/);
 assert.match(source,/const requestId=\+\+blockCheckRequest\.current/);
 assert.match(source,/blockCheckRequest\.current!==requestId/);
});

test('a late block retry cannot unblock the next conversation',()=>{
 const retry=source.slice(source.indexOf('>Verificar novamente</Text>')-1000,source.indexOf('>Verificar novamente</Text>'));
 assert.match(retry,/const version=generation\.current,identity=peer\+'\|'\+auth\.token/);
 assert.match(retry,/version!==generation\.current\|\|conversation\.current!==identity/);
 assert.match(retry,/blockCheckRequest\.current!==requestId\)return/);
 assert.match(retry,/if\(version===generation\.current&&conversation\.current===identity&&/);
 assert.match(retry,/setBlockStatusKnown\(false\)/);
});

test('blur invalidates any outstanding safety verification',()=>{
 assert.match(source,/pendingRefresh\.current=false;generation\.current\+\+;blockCheckRequest\.current\+\+/);
 assert.match(source,/!blockStatusKnown/);
});
