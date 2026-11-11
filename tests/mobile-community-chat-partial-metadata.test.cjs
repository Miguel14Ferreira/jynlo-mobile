'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/communities/[id]/chat.tsx'),'utf8');

test('community chat fetches messages and metadata independently',()=>{
 assert.match(source,/Promise\.allSettled\(\[/);
 assert.match(source,/communityMessages\(id,auth\.token,auth\.username\)/);
 assert.match(source,/communityDetails\(id,auth\.token,auth\.username\)/);
 assert.match(source,/if\(chatResult\.status==='rejected'\)throw chatResult\.reason/);
 assert.match(source,/const chat=chatResult\.value/);
 assert.match(source,/setMessages\(old=>mergeMessages\(old,chat\)\)/);
 assert.match(source,/if\(detailsResult\.status==='fulfilled'\)setName\(detailsResult\.value\.name\)/);
});

test('confirmed revoked membership from metadata wins over a successful history response',()=>{
 assert.match(source,/detailsResult\.status==='rejected'&&detailsResult\.reason instanceof ApiError/);
 assert.match(source,/\[401,403,404,410\]\.includes\(detailsResult\.reason\.status\)\)throw detailsResult\.reason/);
 assert.match(source,/revokedRef\.current=true;setAccessRevoked\(true\);setMessages\(\[\]\)/);
});

test('temporary community-name lookup failures do not trigger chat retry prompt',()=>{
 assert.doesNotMatch(source,/await Promise\.all\(\[communityMessages/);
 assert.match(source,/if\(detailsResult\.status==='fulfilled'\)setName\(detailsResult\.value\.name\)/);
 assert.match(source,/setRefreshWarning\(''\)/);
});
