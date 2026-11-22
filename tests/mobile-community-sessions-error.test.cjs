const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../app/communities/[id].tsx'),'utf8'));
// The reset statements grew (follow state, sections); check each reset exists, in any order.
function resetsInclude(source,calls){
 const lines=source.split('\n').filter(line=>line.includes('setCommunity(null)'));
 return lines.some(line=>calls.every(call=>line.includes(call)));
}

test('community sessions load errors are not displayed as empty schedules',()=>{
 assert.match(source,/const \[sessionsError,setSessionsError\]=useState\(''\)/);
 assert.match(source,/catch\{if\(version===generation\.current\)\{setSessions\(\[\]\);setSessionsError\('Não foi possível carregar as sessões/);
 assert.match(source,/sessionsError\?<Message tone="error">\{sessionsError\}<\/Message>/);
 assert.match(source,/!sessionsError&&sessions\.length===0\?<Message>Esta comunidade ainda não tem sessões agendadas/);
 assert.match(source,/Tentar carregar sessões novamente/);
});
test('community session errors reset on reload and identity changes',()=>{
 assert.ok(resetsInclude(source,["setLoading(true)","setError('')",'setCommunity(null)','setMyRequest(null)',"setMyRequestError('')",'setSessions([])',"setSessionsError('')"]));
 assert.ok(resetsInclude(source,['setCommunity(null)','setSessions([])',"setSessionsError('')",'setRequests([])',"setRequestsError('')",'setMyRequest(null)',"setMyRequestError('')"]));
});
