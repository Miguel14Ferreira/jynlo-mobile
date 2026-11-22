const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('post-game score retrieval is authenticated, typed, and read-only',()=>{
 const api=read('src/lib/session-competition-api.ts');
 assert.match(api,/export type SessionOfficialResult=\{/);
 assert.match(api,/scoreA:number\|null;scoreB:number\|null/);
 assert.match(api,/export async function sessionOfficialResult\(sessionId:number,token:string\|null\)/);
 assert.match(api,/if\(!token\|\|DEMO_MODE\)/);
 assert.match(api,/request<SessionOfficialResult>\('\/api\/sessions\/'\+sessionId\+'\/official-result',\{token\}\)/);
});
test('only authenticated joined players or organizers see the official scoreboard',()=>{
 const page=read('app/sessions/[id].tsx');
 assert.match(page,/import \{SessionOfficialResultCard\} from '\.\.\/\.\.\/src\/components\/SessionOfficialResultCard'/);
 assert.match(page,/detail&&auth.token&&\(owner\|\|detail.joined\)&&s.status!=='CANCELLED'/);
 assert.match(page,/Date.parse\(s.gameDate\)<=Date.now\(\)/);
 assert.match(page,/<SessionOfficialResultCard sessionId=\{id\} token=\{auth.token\} game=\{detail\}\/>/);
});
test('scorecard distinguishes a saved old winner-only round from a real final score',()=>{
 const ui=read('src/components/SessionOfficialResultCard.tsx');
 assert.match(ui,/sessionOfficialResult\(sessionId,token\)/);
 assert.match(ui,/result.scoreA\?\?'—'/);
 assert.match(ui,/result.scoreB\?\?'—'/);
 assert.match(ui,/Jornada registada; o marcador oficial não foi indicado/);
 assert.match(ui,/Marcador confirmado na jornada da comunidade/);
 assert.match(ui,/e instanceof ApiError&&e.status===404/);
 assert.match(ui,/O resultado ainda não foi registado na classificação/);
});
test('stale account responses cannot show another user private scores',()=>{
 const ui=read('src/components/SessionOfficialResultCard.tsx');
 assert.match(ui,/const identity=sessionId\+'\|'\+\(token\|\|''\)/);
 assert.match(ui,/if\(version!==requestVersion.current\)return/);
 assert.match(ui,/result&&loadedFor===identity/);
 assert.match(ui,/return\(\)=>\{requestVersion.current\+\+;setResult\(null\);setLoadedFor\(''\);\}/);
 assert.match(ui,/if\(response.sessionId!==sessionId\|\|!Number.isSafeInteger\(response.roundId\)\|\|response.roundId<=0\)/);
});

test('authorized final score includes only actual recorded scorer contributions, not inferred player totals',()=>{
 const api=read('src/lib/session-competition-api.ts');
 const card=read('src/components/SessionOfficialResultCard.tsx');
 assert.match(api,/contributions:Array<\{username:string;team:'A'\|'B'\|string\|null;goals:number;assists:number\}>/);
 assert.match(card,/Array.isArray\(result.contributions\)&&result.contributions.length>0/);
 assert.match(card,/MARCADORES E ASSISTÊNCIAS/);
 assert.match(card,/Number.isInteger\(player.goals\)&&Number.isInteger\(player.assists\)/);
 assert.match(card,/\(player.goals>0\|\|player.assists>0\)/);
 assert.match(card,/player.goals>0\?player.goals\+' golos'/);
 assert.match(card,/player.assists>0\?player.assists\+' assistências'/);
 assert.doesNotMatch(card,/result.contributions\.map\(player=>\{.*player.goals\|\|0/);
});
