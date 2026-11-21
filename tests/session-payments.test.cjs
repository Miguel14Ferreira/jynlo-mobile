'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('payments panel only for paid sessions, organiser or joined players',()=>{
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/\(owner\|\|detail\.joined\)&&Number\(s\.priceAmount\)>0/);
 assert.match(screen,/<SessionPaymentsPanel sessionId=\{id\} token=\{auth\.token\}\/>/);
});
test('payments panel never moves money and offers MB WAY or in person',()=>{
 const panel=read('src/components/SessionPaymentsPanel.tsx');
 assert.match(panel,/A Jynlo não recebe nem guarda dinheiro/);
 assert.match(panel,/setPaymentMethod\(sessionId,'IN_PERSON',null,token\)/);
 assert.match(panel,/setPaymentMethod\(sessionId,'MBWAY',phone\.trim\(\),token\)/);
 assert.match(panel,/Já paguei/);
 const api=read('src/lib/session-payments-api.ts');
 assert.match(api,/\/remind/);
});
