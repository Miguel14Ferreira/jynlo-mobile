'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {normalizeInstant,reconnectDelay,parseCommunityEnvelope,mergeMessages,teamInviteUrl}=require('../src/lib/realtime-core.cjs');
test('WebSocket nunca entrega mensagens antes da autenticação AUTHENTICATED',()=>{
 const m={id:4,kind:'CHAT',communityId:9,username:'André',body:'Bora',createdAt:1793700000};
 const event={type:'COMMUNITY_CHAT_MESSAGE',message:m};
 assert.equal(parseCommunityEnvelope(event,false,9),null);
 assert.equal(parseCommunityEnvelope(event,true,10),null);
 assert.equal(parseCommunityEnvelope(event,true,9)?.username,'André');
 assert.equal(parseCommunityEnvelope('{ruim',true,9),null);
});
test('ignorar envelopes inválidos e POST / outras comunidades',()=>{
 for(const type of ['CHAT_MESSAGE','SESSION_CHAT_MESSAGE','AUTHENTICATED']){
  assert.equal(parseCommunityEnvelope({type,message:{id:12,kind:'CHAT',communityId:9,username:'x',body:'y',createdAt:20}},true,9),null);
 }
 assert.equal(parseCommunityEnvelope({type:'COMMUNITY_CHAT_MESSAGE',message:{id:'1',kind:'CHAT',communityId:9,username:'x',body:'y'}},true,9),null);
});
test('normalizar segundos/milissegundos sem fabricar datas',()=>{
 assert.equal(normalizeInstant(1793700000),normalizeInstant(1793700000000));
 assert.equal(normalizeInstant(null),'');assert.equal(normalizeInstant('bad'),'bad');
});
test('mensagens repetidas por socket e histórico ficam deduplicadas',()=>{
 const a={id:2,body:'antigo'},b={id:3,body:'novo'};
 assert.deepEqual(mergeMessages([b,a],[a,{id:3,body:'editado'}]).map(x=>x.body),['antigo','editado']);
});
test('reconexão exponencial limitada, sem repetir agressivamente AUTH',()=>{
 assert.deepEqual([0,1,2,3,8].map(reconnectDelay),[3000,6000,12000,24000,30000]);
});
test('links de equipa correspondem exatamente à web e não autorizam acesso',()=>{
 const url=new URL(teamInviteUrl('https://d24sports.com',8,30,14));
 assert.equal(url.pathname,'/menu/communities/8');
 assert.equal(url.searchParams.get('tournament'),'30');
 assert.equal(url.searchParams.get('team'),'14');
 assert.equal(url.searchParams.get('teamPage'),'14');
 assert.throws(()=>teamInviteUrl('https://example.org',8,30,14));
 assert.throws(()=>teamInviteUrl('https://d24sports.com',-1,30,14));
});
