'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const inbox=fs.readFileSync(path.join(__dirname,'../app/notifications.tsx'),'utf8');

test('push guidance reflects native configuration and user opt-in',()=>{
 assert.match(inbox,/androidPushConfigured\(\)\?pushEnabled\?/);
 assert.match(inbox,/Este dispositivo está registado para notificações push/);
 assert.match(inbox,/Os avisos push estão ativados neste dispositivo/);
 assert.match(inbox,/Para receber avisos com a aplicação fechada, ativa as notificações/);
 assert.match(inbox,/Os avisos com a aplicação fechada exigem uma nova APK/);
 assert.doesNotMatch(inbox,/O envio push com a app fechada ainda não está disponível\./);
});
