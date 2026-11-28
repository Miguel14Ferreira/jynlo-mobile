const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('the mobile inbox displays real community and session names, not raw IDs',()=>{
 const api=read('src/lib/chat-api.ts');
 const screen=read('app/(tabs)/messages.tsx');
 const types=read('src/lib/types.ts');
 assert.match(types,/interface JynloInboxSummary \{[^\n]*title\?:string/);
 assert.match(api,/title:typeof c\.name==='string'&&c\.name\.trim\(\)\?c\.name\.trim\(\):'Comunidade'/);
 assert.match(api,/filterAuthorizedSummaries\('community',allowed,summaries,'Comunidade'\)/);
 assert.match(api,/filterAuthorizedSummaries\('session',allowed,summaries,'Jogo'\)/);
 assert.match(api,/session\.sport/);
 assert.match(api,/session\.city/);
 assert.match(screen,/item\.title\|\|\(item\.kind==='community'\?'Comunidade':item\.kind==='private'\?'Grupo':item\.kind==='team'\?'Equipa':'Jogo'\)/);
 assert.doesNotMatch(screen,/'Comunidade #'\+item\.id/);
 assert.doesNotMatch(screen,/'Jogo #'\+item\.id/);
});

test('inbox titles are derived only from authenticated, authorized membership lists',()=>{
 const api=read('src/lib/chat-api.ts');
 const guard=read('src/lib/authorized-inbox-summaries.cjs');
 assert.match(guard,/!allowed\.has\(item\.id\)\|\|seen\.has\(item\.id\)/);
 assert.match(guard,/result\.push\(\{\.\.\.item,title:/);
 assert.match(api,/const groups=await myCommunities\(token,username\)/);
 assert.match(api,/const mine=await mySessions\(token,username\)/);
 assert.match(api,/filterAuthorizedSummaries\(/);
 assert.match(api,/filterAuthorizedSummaries\(/);
});
