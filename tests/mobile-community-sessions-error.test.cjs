'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/communities/[id].tsx'),'utf8');
test('community sessions load errors are not displayed as empty schedules',()=>{
 assert.match(source,/const \[sessionsError,setSessionsError\]=useState\(''\)/);
 assert.match(source,/catch\{if\(version===generation\.current\)\{setSessions\(\[\]\);setSessionsError\('Não foi possível carregar as sessões/);
 assert.match(source,/sessionsError\?<Message tone="error">\{sessionsError\}<\/Message>/);
 assert.match(source,/!sessionsError&&sessions\.length===0\?<Message>Esta comunidade ainda não tem sessões agendadas/);
 assert.match(source,/Tentar carregar sessões novamente/);
});
test('community session errors reset on reload and identity changes',()=>{
 assert.match(source,/setLoading\(true\);setError\(''\);setCommunity\(null\);setMyRequest\(null\);setSessions\(\[\]\);setSessionsError\(''\)/);
 assert.match(source,/setCommunity\(null\);setSessions\(\[\]\);setSessionsError\(''\);setRequests\(\[\]\);setRequestsError\(''\);setMyRequest\(null\)/);
});
