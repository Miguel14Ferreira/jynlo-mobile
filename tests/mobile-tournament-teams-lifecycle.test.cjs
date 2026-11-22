const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id]/teams.tsx'),'utf8'));

test('opening a different tournament clears the previous teams and draft',()=>{
 assert.match(source,/const generation=useRef\(0\),creatingRef=useRef\(false\)/);
 assert.match(source,/const version=\+\+generation\.current/);
 assert.match(source,/setTournament\(null\);setItems\(\[\]\);setNewName\(''\);setError\(''\);setMessage\(''\)/);
 assert.match(source,/return \(\)=>\{generation\.current\+\+;\}/);
});
test('a stale response cannot populate teams or errors in the next account',()=>{
 assert.match(source,/const load=useCallback\(async\(version=generation\.current,silent=false\)=>/);
 assert.match(source,/if\(version!==generation\.current\)return/);
 assert.match(source,/if\(version===generation\.current\)setError/);
 assert.match(source,/if\(version===generation\.current&&!silent\)setLoading\(false\)/);
});
test('only team tournaments can display and create teams',()=>{
 assert.match(source,/if\(details\.entryType!=='TEAM'\)/);
 assert.match(source,/setTournament\(details\);setItems\(\[\]\);return/);
 assert.match(source,/!tournament\|\|tournament\.entryType!=='TEAM'/);
});
test('creation is single-flight and stale writes cannot mutate another screen',()=>{
 assert.match(source,/creatingRef\.current\|\|!tournament/);
 assert.match(source,/creatingRef\.current=true;setBusy\(true\)/);
 assert.match(source,/await createTournamentTeam\(cid,tid,newName,auth\.token,auth\.username\)/);
 assert.match(source,/if\(version!==generation\.current\)return/);
 assert.match(source,/await load\(version\)/);
 assert.match(source,/creatingRef\.current=false/);
 assert.match(source,/Confirma as equipas antes de repetires para evitar duplicados/);
});
