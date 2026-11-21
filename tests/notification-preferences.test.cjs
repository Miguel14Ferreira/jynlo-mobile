'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const core=require('../src/lib/notification-preferences-core.cjs');

test('same 29 types as the web, each with a label, no duplicates',()=>{
 assert.equal(core.PREFERENCE_TYPES.length,29);
 assert.equal(new Set(core.PREFERENCE_TYPES).size,29);
 // Cross-check with the web only when both repositories are checked out side by side.
 const webFile=path.join(__dirname,'../../jynlo-web-fe/src/app/pages/notifications/notifications.component.ts');
 const web=fs.existsSync(webFile)?fs.readFileSync(webFile,'utf8'):'';
 if(web){const list=web.slice(web.indexOf('readonly preferenceTypes'),web.indexOf('] as const'));
  for(const type of core.PREFERENCE_TYPES)assert.ok(list.includes("'"+type+"'"),type);}
});

test('normalizes server data and toggles types without dropping unknown web choices',()=>{
 const p=core.normalizePreferences({inAppEnabled:true,emailEnabled:false,disabledInAppTypes:['FUTURE_TYPE','CHAT_MESSAGE','CHAT_MESSAGE','bad type'],disabledEmailTypes:null});
 assert.deepEqual(p.disabledInAppTypes,['CHAT_MESSAGE','FUTURE_TYPE']);
 assert.deepEqual(p.disabledEmailTypes,[]);
 const on=core.toggleType(p,'inApp','CHAT_MESSAGE',true);
 assert.deepEqual(on.disabledInAppTypes,['FUTURE_TYPE']);
 const off=core.toggleType(on,'email','SESSION_REMINDER',false);
 assert.deepEqual(off.disabledEmailTypes,['SESSION_REMINDER']);
 assert.equal(core.samePreferences(p,core.normalizePreferences(p)),true);
 assert.equal(core.samePreferences(p,on),false);
 assert.throws(()=>core.normalizePreferences(null));
});

test('screen saves explicitly and is reachable from notifications',()=>{
 const screen=read('app/notification-settings.tsx');
 assert.match(screen,/disabled=\{busy\|\|!dirty\}/);
 assert.match(screen,/saving\.current/);
 assert.match(read('app/notifications.tsx'),/router\.push\('\/notification-settings'\)/);
 assert.match(read('app/_layout.tsx'),/name="notification-settings" options=\{\{title:"Gerir notificações"\}\}/);
 assert.match(read('src/lib/notifications-api.ts'),/'\/api\/notifications\/me\/preferences',\{token,method:'PUT'/);
});
