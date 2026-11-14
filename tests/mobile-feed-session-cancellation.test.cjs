'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const feed=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
const api=fs.readFileSync(path.join(__dirname,'../src/lib/api.ts'),'utf8');

const start=feed.indexOf('async function requestCancelFeedSession(');
const end=feed.indexOf('function openPostComposer()',start);
const cancel=feed.slice(start,end);
const cardStart=feed.indexOf('function SessionPostAttachment(');
const cardEnd=feed.indexOf('function PostCard(',cardStart);
const card=feed.slice(cardStart,cardEnd);

test('only the original creator sees the cancellation shortcut',()=>{
 assert.match(card,/item\.type==='SESSION_CREATED'/);
 assert.match(card,/item\.authorUsername\.toLowerCase\(\)===auth\.username\.toLowerCase\(\)/);
 assert.match(card,/\{mine\?<Pressable/);
 assert.match(card,/accessibilityLabel="Cancelar a minha sessão"/);
 assert.match(card,/onPress=\{\(\)=>void requestCancelFeedSession\(item\)\}/);
});

test('the session card retains independent share and detail navigation',()=>{
 assert.match(card,/accessibilityLabel="Consultar sessão associada à publicação"/);
 assert.match(card,/accessibilityLabel="Partilhar sessão"/);
 assert.match(card,/onPress=\{\(\)=>void shareFeedSession\(item\)\}/);
 assert.match(feed,/sharedPostLink\(item\)/);
});

test('cancellation rechecks owner and active status with the server',()=>{
 assert.match(cancel,/item\.type!=='SESSION_CREATED'/);
 assert.match(cancel,/sessionCancelInFlight\.current\)return/);
 assert.match(cancel,/const detail=await sessionDetail\(id,actor,username\)/);
 assert.match(cancel,/detail\.creatorUsername\?\.toLowerCase\(\)!==username\.toLowerCase\(\)/);
 assert.match(cancel,/detail\.status!=='OPEN'&&detail\.status!=='FULL'/);
 assert.match(cancel,/if\(feedIdentity\.current!==identity\)return/);
});

test('a destructive confirmation is required before sending POST /cancel',()=>{
 assert.match(cancel,/Alert\.alert\('Cancelar sessão'/);
 assert.match(cancel,/\{text:'Manter sessão',style:'cancel'\}/);
 assert.match(cancel,/\{text:'Sim, cancelar sessão',style:'destructive',onPress:/);
 assert.match(cancel,/void cancelSession\(id,actor,username\)\.then/);
 assert.match(api,/export async function cancelSession\(/);
 assert.match(api,/`\/api\/sessions\/\$\{id\}\/cancel`/);
});

test('successful cancellation hides only the cancelled session activity',()=>{
 assert.match(cancel,/confirmedRemovedFeedKeys\.current\.add\(key\)/);
 assert.match(cancel,/setPosts\(current=>current\.filter\(entry=>!\(entry\.type==='SESSION_CREATED'&&entry\.sessionId===id\)\)\)/);
 assert.match(cancel,/void load\(\)/);
 assert.match(cancel,/Alert\.alert\('Sessão cancelada'/);
});

test('failed or uncertain cancellation preserves content and prompts recheck',()=>{
 assert.match(cancel,/\.catch\(e=>\{/);
 assert.match(cancel,/Alert\.alert\('Cancelamento não confirmado'/);
 assert.match(cancel,/Verifica o estado da sessão antes de repetir/);
 assert.doesNotMatch(cancel,/retry\(/);
});

test('logout clears progress and old requests cannot unblock a newer account',()=>{
 assert.match(feed,/sessionCancelInFlight\.current=false;setSessionCancelBusyId\(null\)/);
 assert.match(cancel,/if\(feedIdentity\.current===identity\)\{sessionCancelInFlight\.current=false;setSessionCancelBusyId\(null\);\}/);
});

test('successful cancellation offers an optional native share sheet for external guests',()=>{
 const shareStart=feed.indexOf('async function shareCancelledFeedSession(');
 const cancelStart=feed.indexOf('async function requestCancelFeedSession(',shareStart);
 assert.ok(shareStart>0&&cancelStart>shareStart);
 const share=feed.slice(shareStart,cancelStart);
 assert.match(share,/Share\.share\(\{message\}\)/);
 assert.match(share,/O organizador cancelou esta sessão e o jogo não se vai realizar/);
 assert.match(share,/Por favor, não te desloques ao recinto/);
 assert.match(cancel,/\{text:'Partilhar aviso',onPress:\(\)=>\{void shareCancelledFeedSession\(item\);\}\}/);
 assert.match(cancel,/cancelSession\(id,actor,username\)\.then\(\(\)=>\{/);
 assert.doesNotMatch(share,/request<|cancelSession\(/);
});

test('the app never shares a guest cancellation warning on a failed POST',()=>{
 const success=cancel.indexOf('void cancelSession(id,actor,username).then(()=>{');
 const failure=cancel.indexOf('}).catch(e=>{',success);
 const sharePrompt=cancel.indexOf("'Partilhar aviso'",success);
 assert.ok(success>=0&&failure>success&&sharePrompt>success&&sharePrompt<failure);
 assert.match(cancel.slice(failure),/Cancelamento não confirmado/);
});
