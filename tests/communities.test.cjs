const test=require('node:test');
const assert=require('node:assert/strict');
const {makeStore,communityUrl,safeId,normalizeCommunityInput}=require('../src/lib/community-core.cjs');
const fields={name:'Futeboladas à Balda',sport:'Futebol',description:'Um jogo, muitas amizades',visibility:'PRIVATE'};
test('URL corresponde à rota web real e rejeita IDs inválidos',()=>{
  assert.equal(communityUrl(11),'https://d24sports.com/menu/communities/11');
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
