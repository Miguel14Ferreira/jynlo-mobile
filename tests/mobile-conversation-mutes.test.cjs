'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('mobile mutes use Web server endpoint, never per-device storage',()=>{
 const api=read('src/lib/conversation-mutes-api.ts');
 assert.match(api,/\/api\/notifications\/me\/conversation-mutes/);
 assert.match(api,/method:'PUT',body:\{kind,id:key,muted\}/);
 assert.match(api,/listConversationMutes\(token:string\)/);
 assert.match(api,/isConversationMuted\(/);
 assert.doesNotMatch(api,/localStorage|SecureStore|AsyncStorage/);
});

test('inbox keeps unread indicators and message navigation while silencing only notifications',()=>{
 const screen=read('app/(tabs)/messages.tsx');
 assert.match(screen,/Silenciar conversa\?/);
 assert.match(screen,/Ativar avisos\?/);
 assert.match(screen,/setConversationMuted\(item\.kind,item\.id,!muted,token\)/);
 assert.match(screen,/listConversationMutes\(token\)/);
 assert.match(screen,/muteWrites\.current\.has\(key\)/);
 assert.match(screen,/formatUnreadBadge\(item\.unreadCount\)/);
 assert.match(screen,/router\.push\(\{pathname:'\/messages\/\[peer\]'/);
 assert.match(screen,/setMutes\(\[\]\);setMuteKnown\(false\)/);
 assert.match(screen,/muteKnown\?<Pressable/);
});

test('backend authorization remains authoritative for changing mute state',()=>{
 const api=read('src/lib/conversation-mutes-api.ts');
 assert.match(api,/if\(!token\|\|DEMO_MODE\)throw/);
 assert.match(api,/conversationKey\(kind,id\)/);
 assert.match(api,/kind==='direct'/);
 assert.match(api,/Number\.isSafeInteger/);
});
