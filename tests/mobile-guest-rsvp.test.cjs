'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('signed guest invites can confirm native attendance using existing backend',()=>{
 const view=read('src/components/GuestSessionRSVP.tsx'),details=read('app/sessions/[id].tsx');
 assert.match(view,/guest-roster/);
 assert.match(view,/guest-requests'/);
 assert.match(view,/linkToken:guestToken/);
 assert.match(view,/playerId:playerId\|\|null/);
 assert.match(view,/newName:playerId\?null:name\.trim\(\)/);
 assert.match(view,/guest-requests\/cancel-self/);
 assert.match(view,/SecureStore\.setItemAsync/);
 assert.match(view,/SecureStore\.getItemAsync/);
 assert.match(view,/SecureStore\.deleteItemAsync/);
 assert.match(details,/!auth\.token&&!loading&&Number\.isSafeInteger\(id\)[\s\S]*?<GuestSessionRSVP sessionId=\{id\} guestToken=\{guestToken\}/);
});
test('a signed link does not by itself confirm attendance or expose a receipt',()=>{
 const view=read('src/components/GuestSessionRSVP.tsx');
 assert.match(view,/if\(!validSecret\(result\.receipt\)/);
 assert.match(view,/setReceipt\(result\);onConfirmed\(\)/);
 assert.match(view,/const state=await request<GuestReceipt>/);
 assert.match(view,/if\(alive&&state\.status!=='CANCELLED'/);
 assert.doesNotMatch(view,/console\.(log|warn)\(/);
});

test('guest RSVP recovers from an uncertain previous confirmation without booking twice',()=>{
 const view=read('src/components/GuestSessionRSVP.tsx');
 assert.match(view,/setStatusUnknown\(true\)/);
 assert.match(view,/setRefreshId\(n=>n\+1\)/);
 assert.match(view,/pending\.current\|\|loading\|\|statusUnknown\|\|uncertainSubmission\.current\|\|receipt/);
 assert.match(view,/!loading&&!error&&!statusUnknown/);
});
test('confirmed server cancellation clears the UI before local secure storage cleanup',()=>{
 const view=read('src/components/GuestSessionRSVP.tsx');
 const done=view.indexOf("if(result.status!=='CANCELLED')");
 const clear=view.indexOf("setReceipt(null);onConfirmed();",done);
 const storage=view.indexOf("SecureStore.deleteItemAsync(key)",done);
 assert.ok(done>=0&&clear>done&&storage>clear);
 assert.match(view,/Presença cancelada no servidor/);
});

test('guest invitation stays usable from the browser even after a native app-link',()=>{
 const details=read('app/sessions/[id].tsx');
 assert.match(details,/title="Continuar no browser"/);
 assert.match(details,/openBrowserAsync\(url\)/);
 assert.match(details,/https:\/\/d24sports\.com\/sessions\/\$\{id\}\?guest=\$\{encodeURIComponent\(guestToken\)\}/);
});

test('uncertain network response cannot create another guest RSVP on refresh',()=>{
 const view=read('src/components/GuestSessionRSVP.tsx');
 assert.match(view,/const pending=useRef\(false\),uncertainSubmission=useRef\(false\)/);
 assert.match(view,/uncertainSubmission\.current=true;setStatusUnknown\(true\)/);
 assert.match(view,/setStatusUnknown\(uncertainSubmission\.current\)/);
 assert.match(view,/!loading&&!uncertainSubmission\.current&&/);
 assert.match(view,/Não repitas a inscrição/);
});

test('browser fallback uses Android Custom Tabs instead of relaunching the native App Link',()=>{
 const details=read('app/sessions/[id].tsx');
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.dependencies['expo-web-browser'],'~58.0.8');
 assert.match(details,/import\('expo-web-browser'\)/);
 assert.match(details,/browser\.openBrowserAsync\(url\)/);
});

test('guest can correct a confirmed identity with the original private receipt',()=>{
 const view=read('src/components/GuestSessionRSVP.tsx');
 assert.match(view,/Enganei-me no nome/);
 assert.match(view,/guest-requests\/change-player/);
 assert.match(view,/receipt:receipt\.receipt,playerId:editPlayerId\|\|null,newName:editPlayerId\?null:editName\.trim\(\)/);
 assert.match(view,/updated\.status!=='APPROVED'/);
 assert.match(view,/setReceipt\(\{\.\.\.updated,receipt:receipt\.receipt\}\)/);
 assert.match(view,/receipt\.status==='APPROVED'\?<Pressable accessibilityRole="button" disabled=\{busy\} style=\{styles\.secondary\} onPress=\{cancel\}/);
});

test('registered invitation uses authenticated seat instead of anonymous guest RSVP',()=>{
 const detail=read('app/sessions/[id].tsx');
 assert.match(detail,/guest-member-presence/);
 assert.match(detail,/guest-join-account/);
 assert.match(detail,/token:auth\.token,method:'POST',body:\{token:guestToken\}/);
 assert.match(detail,/confirmedSessionJoin\(result\)/);
 assert.match(detail,/Confirmar com a minha conta Jynlo/);
 assert.match(detail,/guestToken&&!auth\.token&&!loading/);
 assert.match(detail,/presence\.status==='PARTICIPANT'/);
 assert.match(detail,/presence\.status==='WAITLISTED'/);
});
