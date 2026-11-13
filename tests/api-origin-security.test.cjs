'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validateApiOrigin}=require('../src/lib/api-origin.cjs');

test('accepts only canonical HTTPS API origins',()=>{
 assert.equal(validateApiOrigin('https://api.jynlo.pt'),'https://api.jynlo.pt');
 assert.equal(validateApiOrigin('https://api.jynlo.pt/'),'https://api.jynlo.pt');
 assert.equal(validateApiOrigin('https://api.jynlo.pt:8443'),'https://api.jynlo.pt:8443');
});
test('rejects credential leaks and URL suffixes before bearer request',()=>{
 for(const url of [
  'https://user:secret@api.jynlo.pt',
  'https://api.jynlo.pt@evil.example',
  'https://api.jynlo.pt?token=x',
  'https://api.jynlo.pt/#fragment',
  'https://api.jynlo.pt/api',
  'https://api.jynlo.pt\\@evil.example',
  'http://api.jynlo.pt',
  'javascript:alert(1)',
 ])assert.throws(()=>validateApiOrigin(url),undefined,url);
});
test('localhost HTTP requires explicit development opt-in',()=>{
 assert.throws(()=>validateApiOrigin('http://localhost:8080'));
 assert.equal(validateApiOrigin('http://localhost:8080',{allowLocalhost:true}),'http://localhost:8080');
 assert.throws(()=>validateApiOrigin('http://localhost:8080/api',{allowLocalhost:true}));
 assert.throws(()=>validateApiOrigin('http://127.0.0.1:8080',{allowLocalhost:true}));
});
test('authenticated API requests consume the validated origin',()=>{
 const api=fs.readFileSync(path.join(__dirname,'../src/lib/api.ts'),'utf8');
 assert.match(api,/API_BASE: string = rawApiUrl \? validateApiOrigin\(rawApiUrl,/);
 assert.match(api,/fetch\(\x60\$\{API_BASE\}\$\{path\}\x60/);
 assert.match(api,/Authorization.*Bearer/);
});
