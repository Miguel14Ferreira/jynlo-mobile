const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id]/participants.tsx'),'utf8'));
test('switching tournament or account clears private enrollment and organizer data',()=>{
 assert.match(source,/const generation=useRef\(0\),readEpoch=useRef\(0\),mutationRef=useRef\(false\),pageRef=useRef\(false\)/);
 assert.match(source,/const version=\+\+generation\.current/);
 assert.match(source,/setTournament\(null\);setRole\(null\);setItems\(\[\]\);setPage\(0\);setMore\(false\)/);
 assert.match(source,/return \(\)=>\{generation\.current\+\+;readEpoch\.current\+\+;\}/);
});
test('stale roster requests and refreshes cannot publish another tournament roster',()=>{
 assert.match(source,/const load=useCallback\(async\(version=generation\.current\)=>/);
 assert.match(source,/const epoch=\+\+readEpoch\.current/);
 assert.match(source,/if\(version!==generation\.current\|\|epoch!==readEpoch\.current\)return/);
 assert.match(source,/if\(community\.id!==cid\)throw Error/);
 assert.match(source,/if\(!currentRole\)throw Error/);
});
test('pagination is single-flight and refresh cannot append outdated participants',()=>{
 assert.match(source,/mutationRef\.current\|\|pageRef\.current\|\|loading\|\|!more/);
 assert.match(source,/pageRef\.current=true/);
 assert.match(source,/const version=generation\.current,epoch=readEpoch\.current/);
 assert.match(source,/if\(version!==generation\.current\|\|epoch!==readEpoch\.current\)return/);
 assert.match(source,/pageRef\.current=false/);
});
test('writes validate enrollment and confirmation permissions and never retry automatically',()=>{
 assert.match(source,/mutationRef\.current\|\|pageRef\.current\|\|loading/);
 assert.match(source,/expectedVersion!==generation\.current/);
 assert.match(source,/!entriesOpen\(tournament\)/);
 assert.match(source,/which==='CONFIRM'&&\(!participant\|\|!canConfirmParticipant\(role,tournament,participant\)\)/);
 assert.match(source,/registrationAction\(tournament,items,auth\.username,more\)!=='JOIN'/);
 assert.match(source,/registrationAction\(tournament,items,auth\.username,more\)!=='LEAVE'/);
 assert.match(source,/mutationRef\.current=true/);
 assert.match(source,/if\(version!==generation\.current\)return/);
 assert.match(source,/await load\(version\)/);
 assert.match(source,/mutationRef\.current=false/);
});
test('cancel confirmation cannot act in a new route after popup is opened',()=>{
 assert.match(source,/const version=generation\.current;\s*Alert\.alert\('Cancelar inscrição\?'/);
 assert.match(source,/mutate\('LEAVE',undefined,version\)/);
});
