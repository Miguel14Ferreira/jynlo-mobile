const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('participant removal requires an authenticated server-authorized DELETE',()=>{
 const api=read('src/lib/api.ts');
 assert.match(api,/export async function removeSessionParticipant/);
 assert.match(api,/Number\.isSafeInteger\(sessionId\)/);
 assert.match(api,/Number\.isSafeInteger\(participantId\)/);
 assert.match(api,/\/api\/sessions\/\$\{sessionId\}\/participants\/\$\{participantId\}/);
 assert.match(api,/token,method:'DELETE'/);
 assert.match(api,/if\(DEMO_MODE\|\|!token\)/);
});
test('organizer only can remove non-creator from active session after destructive confirmation',()=>{
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/auth\.token&&!DEMO_MODE&&owner&&\['OPEN','FULL'\]\.includes\(detail\.status\)/);
 assert.match(screen,/participant\.username\.toLowerCase\(\)===detail\.creatorUsername\?\.toLowerCase\(\)/);
 assert.match(screen,/p\.username\.toLowerCase\(\)!==auth\.username\?\.toLowerCase\(\)/);
 assert.match(screen,/Alert\.alert\('Remover jogador da sessão\?'/);
 assert.match(screen,/style:'destructive'/);
 assert.match(screen,/removeSessionParticipant\(id,participant\.id,actorToken\)/);
 assert.match(screen,/removalInFlight\.current=true/);
 assert.match(screen,/await load\(\)/);
 assert.match(screen,/Não foi possível confirmar a remoção/);
 assert.doesNotMatch(screen,/Linking\.openURL/);
});
