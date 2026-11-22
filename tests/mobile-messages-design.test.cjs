const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const inbox=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/messages.tsx'),'utf8'));

test('modern inbox keeps real conversation sources and refresh protections',()=>{
 assert.match(inbox,/communityInbox\(auth\.token,auth\.username\)/);
 assert.match(inbox,/directInbox\(auth\.token\)/);
 assert.match(inbox,/filterInbox\(items,search,unreadOnly\)/);
 assert.match(inbox,/identity\.current!==auth\.username\+'\|'\+auth\.token/);
 assert.match(inbox,/generation\.current\+\+/);
 assert.match(inbox,/pendingDirectCall\(auth\.token\)/);
});
test('accessible unread tabs, search reset and visual hierarchy',()=>{
 assert.match(inbox,/accessibilityLabel=\{'Filtrar conversas: '\+label\}/);
 assert.match(inbox,/\['all','Todas'\]/);
 assert.match(inbox,/accessibilityLabel="Mostrar apenas conversas não lidas"/);
 assert.match(inbox,/onPress=\{\(\)=>setUnreadOnly\(current=>!current\)\}/);
 assert.match(inbox,/accessibilityLabel="Limpar pesquisa de conversas"/);
 assert.match(inbox,/item\.unreadCount>0&&styles\.unreadTile/);
 assert.match(inbox,/formatUnreadBadge\(item\.unreadCount\)/);
 assert.match(inbox,/MobileTheme\.colors/);
});
test('conversation destinations and security notices remain',()=>{
 assert.match(inbox,/pathname:'\/messages\/\[peer\]'/);
 assert.match(inbox,/pathname:'\/communities\/\[id\]\/chat'/);
 assert.match(inbox,/pathname:'\/sessions\/\[id\]\/chat'/);
 assert.match(inbox,/A failing source must not erase healthy conversations/);
 assert.match(inbox,/Os dados anteriores podem estar desatualizados/);
 assert.match(inbox,/A failing source must not erase healthy conversations/);
 assert.match(inbox,/accessibilityLabel="Abrir notificações"/);
});
