const test=require('node:test');
const assert=require('node:assert/strict');
const {makeStore,communityUrl,safeId,normalizeCommunityInput,communitySports,describeCommunitySports}=require('../src/lib/community-core.cjs');
const fields={name:'Futeboladas à Balda',sport:'Futebol',description:'Um jogo, muitas amizades',visibility:'PRIVATE'};
test('URL corresponde à rota web real e rejeita IDs inválidos',()=>{
  assert.equal(communityUrl(11),'https://jynlosports.com/menu/communities/11');
  for(const id of [0,-1,'abc',Infinity,1.4])assert.throws(()=>safeId(id));
});
test('validação de criação é estrita',()=>{
  assert.deepEqual(normalizeCommunityInput(fields).sports,['Futebol']);
  for(const v of [{name:' '},{sport:''},{visibility:'FAKE'},{description:'x'.repeat(2001)}])
    assert.throws(()=>normalizeCommunityInput({...fields,...v}));
});
test('da criação ao convite: Tiago cria e André aceita',()=>{
  const d=makeStore();const c=d.create(fields,'Tiago');
  assert.equal(d.mine('Tiago').length,1);assert.equal(d.mine('André').length,0);
  assert.equal(d.get(c.id,'André').myRole,null);
  d.invite(c.id,'André','Tiago');assert.equal(d.myInvites('André').length,1);
  assert.equal(d.myInvites('Tiago').length,0);
  const invite=d.myInvites('André')[0];
  assert.throws(()=>d.acceptInvite(invite.id,'Tiago'));
  d.acceptInvite(invite.id,'André');
  assert.equal(d.myInvites('André').length,0);
  assert.equal(d.get(c.id,'André').myRole,'MEMBER');
  assert.equal(d.get(c.id,'Tiago').memberCount,2);
});
test('convite não permite convidar desconhecidos ou membros',()=>{
  const d=makeStore(),c=d.create(fields,'Tiago');
  assert.throws(()=>d.invite(c.id,'Alguém','Tiago'));
  assert.throws(()=>d.invite(c.id,'André','André'));
  d.invite(c.id,'André','Tiago');assert.throws(()=>d.invite(c.id,'André','Tiago'));
});
test('comunidades privadas exigem pedido ou convite',()=>{
  const d=makeStore(),c=d.create(fields,'Tiago');
  assert.throws(()=>d.joinPublic(c.id,'André'));
  const r=d.requestJoin(c.id,'André');assert.equal(r.status,'PENDING');
  assert.throws(()=>d.pendingRequests(c.id,'André'));
  assert.equal(d.pendingRequests(c.id,'Tiago').length,1);
  d.acceptRequest(c.id,r.id,'Tiago');assert.equal(d.get(c.id,'André').myRole,'MEMBER');
});
test('limitador de criação 2 por dia e 5 total',()=>{
  const d=makeStore();d.create(fields,'Tiago');d.create({...fields,name:'Outro Grupo'},'Tiago');
  assert.equal(d.quota('Tiago').canCreate,false);
  assert.throws(()=>d.create({...fields,name:'Terceiro Grupo'},'Tiago'));
});
test('rejeitar convite remove apenas o convite correto',()=>{
  const d=makeStore(),c=d.create(fields,'Tiago');const i=d.invite(c.id,'André','Tiago');
  assert.throws(()=>d.rejectInvite(i.id,'Tiago'));
  d.rejectInvite(i.id,'André');assert.equal(d.myInvites('André').length,0);
});
test('utilizador fora da comunidade não recebe lista nominal de membros na demo',()=>{
  const d=makeStore(),c=d.create(fields,'Tiago');
  const view=d.get(c.id,'André');
  assert.equal(view.memberCount,1);
  assert.deepEqual(view.members,[]);
});
test('adesão pública é explícita e sem duplicar membros',()=>{
  const d=makeStore();
  const publicGroup=d.search('Bola à Quinta').communities[0];
  assert.ok(publicGroup);
  const first=d.joinPublic(publicGroup.id,'André');
  assert.equal(first.myRole,'MEMBER');
  const count=first.memberCount;
  const second=d.joinPublic(publicGroup.id,'André');
  assert.equal(second.memberCount,count);
});

test('a API preserva todas as modalidades de uma comunidade multidesporto',()=>{
 const mixed={...fields,visibility:'PUBLIC',sport:'Padel',sports:['Padel','Ténis','Voleibol']};
 const payload=normalizeCommunityInput(mixed);
 assert.equal(payload.sport,'Padel');
 assert.deepEqual(payload.sports,mixed.sports);
 const demo=makeStore(),created=demo.create(mixed,'Tiago');
 assert.deepEqual(demo.get(created.id,'Tiago').sports,mixed.sports);
 assert.ok(demo.search('','Ténis').communities.some(c=>c.id===created.id));
 assert.equal(describeCommunitySports(created),'Padel · Ténis · +1');
});
test('compatibilidade com comunidades antigas de um único desporto',()=>{
 assert.deepEqual(communitySports({sport:'Karting'}),['Karting']);
 assert.equal(describeCommunitySports({sport:'Karting'}),'Karting');
});
test('lista de modalidades rejeita repetições, entradas inválidas e inconsistências',()=>{
 const invalid=[
  {sports:[]},{sports:['Padel','pádel'],sport:'Padel'},
  {sports:['Padel','Ténis'],sport:'Futebol'},
  {sports:['Padel',null],sport:'Padel'},
  {sports:'Padel',sport:'Padel'},
  {sports:Array(129).fill('Padel'),sport:'Padel'},
  {sports:['x'.repeat(101)],sport:null}
 ];
 for(const changes of invalid)assert.throws(()=>normalizeCommunityInput({...fields,...changes}));
});
