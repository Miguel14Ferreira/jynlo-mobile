'use strict';
const test=require('node:test');
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');

const api=fs.readFileSync(path.join(__dirname,'../src/lib/community-api.ts'),'utf8');
const screen=fs.readFileSync(path.join(__dirname,'../app/communities/[id].tsx'),'utf8');

test('community visibility uses the owner-only endpoint with PUBLIC or PRIVATE',()=>{
  assert.match(api,/setCommunityVisibility\(id:number,visibility:'PUBLIC'\|'PRIVATE'/);
  assert.match(api,/\/visibility`,\{token,method:'PUT',body:\{visibility\}\}/);
});

test('only the owner sees and can use the public/private switch',()=>{
  assert.match(screen,/role!=='OWNER'\|\|visibilityBusy/);
  assert.match(screen,/\{role==='OWNER'\?<>\s*<Text style=\{styles\.sectionTitle\}>\{t\('Comunidade pública ou privada\?'\)\}/);
  assert.match(screen,/community\.visibility==='PRIVATE'\?'PUBLIC':'PRIVATE'/);
});
