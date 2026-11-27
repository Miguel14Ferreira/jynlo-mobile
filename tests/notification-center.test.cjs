const test=require('node:test');const assert=require('node:assert');
const {notificationKind,dayBucket,shortTime,buildSections}=require('../src/lib/notification-center.cjs');
const t=(k,p={})=>k.replace(/\{(\w+)\}/g,(_,x)=>String(p[x]));
const now=new Date(2026,10,27,20,0,0).getTime();
test('ícone por tipo',()=>{
 assert.equal(notificationKind('CHAT_MESSAGE'),'chat');
 assert.equal(notificationKind('payment_reminder'),'payment');
 assert.equal(notificationKind('ALGO_NOVO'),'other');
});
test('grupos Hoje, Ontem, Anteriores e tempos curtos',()=>{
 assert.equal(dayBucket(new Date(now-5*60000).toISOString(),now),'today');
 assert.equal(dayBucket(new Date(2026,10,26,21,40).toISOString(),now),'yesterday');
 assert.equal(dayBucket(new Date(2026,10,20).toISOString(),now),'older');
 assert.equal(shortTime(new Date(now-5*60000).toISOString(),t,'pt-PT',now),'Há 5 min');
 assert.equal(shortTime(new Date(now-2*3600000).toISOString(),t,'pt-PT',now),'Há 2 h');
 assert.match(shortTime(new Date(2026,10,26,21,40).toISOString(),t,'pt-PT',now),/^Ontem, 21:40$/);
});
test('mensagens da mesma conversa ficam numa só linha, a mais recente à frente',()=>{
 const m=(id,min,who)=>({id,type:'CHAT_MESSAGE',subject:who,relatedUsername:who,createdAt:new Date(now-min*60000).toISOString(),read:false});
 const sections=buildSections([m(1,30,'joao'),m(2,5,'joao'),m(3,10,'ana'),{id:4,type:'SESSION_REMINDER',subject:'x',createdAt:new Date(now-3600000).toISOString(),read:true}],now);
 assert.equal(sections.length,1);
 const rows=sections[0].rows;
 assert.equal(rows.length,3);
 assert.equal(rows[0].lead.id,2);
 assert.deepEqual(rows[0].items.map(x=>x.id),[2,1]);
});
