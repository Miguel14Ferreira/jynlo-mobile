'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validateApiOrigin}=require('../src/lib/api-origin.cjs');

test('authenticated API origin requires public HTTPS',()=>{
 assert.equal(validateApiOrigin('https://api.jynlo.com'),'https://api.jynlo.com');
 for(const origin of [
  'http://api.jynlo.com',
  'https://127.0.0.1',
  'https://192.168.1.25',
  'https://[::1]',
  'https://localhost',
  'https://gateway.internal',
  'https://somehost.local',
  'https://api.jynlo.com@localhost',
  'https://api.jynlo.com/redirect',
  'https://api.jynlo.com?next=evil',
 ]) assert.throws(()=>validateApiOrigin(origin),undefined,origin);
});
test('local development requires explicit opt-in and port',()=>{
 assert.equal(validateApiOrigin('http://localhost:8080',{allowLocalhost:true}),'http://localhost:8080');
 assert.throws(()=>validateApiOrigin('http://localhost:8080'));
 assert.throws(()=>validateApiOrigin('http://localhost',{allowLocalhost:true}));
});
test('authenticated API never follows redirects or caches responses',()=>{
 const api=fs.readFileSync(path.join(__dirname,'../src/lib/api.ts'),'utf8');
 assert.match(api,/redirect:\s*'error'/);
 assert.match(api,/cache:\s*'no-store'/);
 assert.match(api,/credentials:\s*'omit'/);
});
