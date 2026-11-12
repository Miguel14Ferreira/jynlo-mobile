'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('the mobile inbox displays real community and session names, not raw IDs',()=>{
 const api=read('src/lib/chat-api.ts');
 const screen=read('app/(tabs)/messages.tsx');
 const types=read('src/lib/types.ts');
 assert.match(types,/interface JynloInboxSummary \{[^\n]*title\?:string/);
 assert.match(api,/title:c\.name\?\.trim\(\)\|\|'Comunidade'/);
 assert.match(api,/title:allowed\.get\(summary\.id\)/);
 assert.match(api,/title:allowed\.get\(item\.id\)/);
 assert.match(api,/session\.sport/);
 assert.match(api,/session\.city/);
 assert.match(screen,/item\.title\|\|\(item\.kind==='community'\?'Comunidade':'Sessão desportiva'\)/);
 assert.doesNotMatch(screen,/'Comunidade #'\+item\.id/);
 assert.doesNotMatch(screen,/'Sessão #'\+item\.id/);
});

test('inbox titles are derived only from authenticated, authorized membership lists',()=>{
 const api=read('src/lib/chat-api.ts');
 assert.match(api,/const groups=await myCommunities\(token,username\)/);
 assert.match(api,/const mine=await mySessions\(token,username\)/);
 assert.match(api,/!allowed\.has\(item\.id\)\|\|returned\.has\(item\.id\)/);
 assert.match(api,/allowed\.get\(item\.id\)/);
});
