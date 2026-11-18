'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/communities/[id].tsx'),'utf8');

test('community loads are scoped to the focused community and authenticated session',()=>{
 assert.match(source,/const generation=useRef\(0\)/);
 assert.match(source,/const reload=useCallback\(async\(version=generation\.current\)=>/);
 assert.match(source,/if\(version!==generation\.current\)return/);
 assert.match(source,/const version=\+\+generation\.current/);
 assert.match(source,/return \(\)=>\{generation\.current\+\+;\}/);
 assert.match(source,/setCommunity\(null\);setSessions\(\[\]\);setSessionsError\(''\);setRequests\(\[\]\);setRequestsError\(''\);setMyRequest\(null\);setMyRequestError\(''\)/);
});
test('late community sessions and membership requests cannot overwrite another community',()=>{
 assert.match(source,/const next=await communitySessions\(id,auth\.token,auth\.username\);\s*if\(version!==generation\.current\)return;\s*setSessions\(next\)/);
 assert.match(source,/const next=await pendingCommunityRequests\(id,auth\.token,auth\.username\);\s*if\(version!==generation\.current\)return;\s*setRequests\(next\)/);
 assert.match(source,/const next=await myPendingCommunityRequest\(id,auth\.token,auth\.username\);\s*if\(version!==generation\.current\)return;\s*setMyRequest\(next\)/);
 assert.match(source,/if\(version===generation\.current\)setLoading\(false\)/);
});
test('community member can still create a preselected session and view competitions',()=>{
 assert.match(source,/pathname:'\/sessions\/create',params:\{communityId:String\(id\)\}/);
 assert.match(source,/pathname:'\/communities\/\[id\]\/competitions'/);
 assert.match(source,/pathname:"\/tournaments\/create",params:\{communityId:String\(id\)\}/);
});

test('old membership and invitation mutations cannot change the next community view',()=>{
 assert.match(source,/if\(version!==generation\.current\)return;\s*setNotice\(action==='join'/);
 assert.match(source,/if\(version!==generation\.current\)return;\s*setInviteName\(''\)/);
 assert.match(source,/await reload\(version\);\s*if\(version===generation\.current\)setNotice\('Pedido aprovado\.'/);
 assert.match(source,/if\(version===generation\.current\)setBusy\(false\)/);
 assert.match(source,/await reload\(version\)/);
});

test('community detail shows a retry when initial loading fails',()=>{
 assert.match(source,/\{error&&!community&&!loading\?<Button secondary title="Tentar carregar comunidade novamente"/);
 assert.match(source,/onPress=\{\(\)=>\{void reload\(\);\}\}/);
});

test('organizer sees request loading failures and can retry',()=>{
 assert.match(source,/const \[requestsError,setRequestsError\]=useState\(''\)/);
 assert.match(source,/setRequestsError\('Não foi possível carregar os pedidos de adesão\.'\)/);
 assert.match(source,/\{owner&&requestsError\?<View style=\{styles\.section\}>/);
 assert.match(source,/title="Tentar carregar pedidos novamente"/);
});

test('private membership status lookup errors do not invite duplicate requests',()=>{
 assert.match(source,/setMyRequestError\('Não foi possível confirmar o estado do teu pedido de adesão\.'\)/);
 assert.match(source,/community\.visibility==='PRIVATE'&&!myRequest&&!myRequestError/);
 assert.match(source,/title="Verificar estado do pedido novamente"/);
});

test('community details use compact banner and readable member information',()=>{
 assert.match(source,/banner:\{padding:14/);
 assert.match(source,/bannerText:\{color:C\.mint,fontWeight:'800',fontSize:14,lineHeight:21/);
 assert.match(source,/sportText:\{fontSize:14/);
 assert.match(source,/muted:\{fontSize:14,color:C\.muted,lineHeight:21/);
 assert.match(source,/input:\{minHeight:52/);
});
