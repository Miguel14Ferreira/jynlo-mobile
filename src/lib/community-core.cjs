'use strict';
/** Pure validation and demo-state rules; also tested with Node without installing Expo. */
const CANONICAL_WEB_ORIGIN = 'https://d24sports.com';
function safeId(id) {
  const n = Number(id);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Identificador de comunidade inválido.');
  return n;
}
function communityUrl(id) { return CANONICAL_WEB_ORIGIN + '/menu/communities/' + safeId(id); }
function normalizeCommunityInput(input) {
  const name = (input?.name || '').trim();
  if (name.length < 3 || name.length > 100) throw new Error('O nome deve ter entre 3 e 100 caracteres.');
  const description = (input?.description || '').trim();
  if (description.length > 2000) throw new Error('A descrição é demasiado longa.');
  const sport = (input?.sport || '').trim();
  if (!sport || sport.length > 80) throw new Error('Escolhe uma modalidade válida.');
  if (!['PUBLIC','PRIVATE'].includes(input?.visibility)) throw new Error('Visibilidade inválida.');
  return {name,description:description||null,sport,sports:[sport],visibility:input.visibility};
}
function makeStore(){
  let nextCommunity=931000, nextInvite=980000, nextRequest=990000;
  const demoMembers=(names,owner)=>names.map((username,i)=>({
    profileId:i+1, username, fullName:username, profilePicUrl:null,
    role:username===owner?'OWNER':'MEMBER'
  }));
  const groups=[{
    id:930001,name:'Bola à Quinta',description:'Jogos informais, boa disposição e novas amizades.',
    sport:'Futebol',sports:['Futebol'],photoUrl:null,visibility:'PUBLIC',rankingsEnabled:false,
    individualTournamentsEnabled:false,teamTournamentsEnabled:false,
    ownerUsername:'Organizador',memberCount:4,createdAt:new Date().toISOString(),
    members:demoMembers(['Organizador','jogador01','jogador02','jogador03'],'Organizador')
  }];
  groups.push({
    id:930002,name:'Pilotos de Lisboa',description:'Corridas informais e tempos por volta. Exemplo de classificação de karting.',
    sport:'Karting',sports:['Karting'],photoUrl:null,visibility:'PUBLIC',rankingsEnabled:true,
    individualTournamentsEnabled:true,teamTournamentsEnabled:false,
    ownerUsername:'Organizador',memberCount:3,createdAt:new Date().toISOString(),
    members:demoMembers(['Organizador','piloto01','piloto02'],'Organizador')
  });
  const invites=[], requests=[];
  const inviteCandidates=['Tiago','André'];
  function exists(id){const group=groups.find(g=>g.id===safeId(id));if(!group)throw Error('Comunidade não encontrada.');return group;}
  function get(id,user){const g=exists(id);const role=g.members.find(m=>m.username===user)?.role||null;return {...g, members:role?g.members.map(m=>({...m})):[],myRole:role,memberCount:g.members.length};}
  function needUser(user){if(!user)throw Error('Inicia sessão antes de continuar.');return user;}
  function needOwner(g,user){if(g.ownerUsername!==needUser(user))throw Error('Só o organizador pode realizar esta ação na demonstração.');}
  function mine(user){needUser(user);return groups.filter(g=>g.members.some(m=>m.username===user)).map(g=>get(g.id,user));}
  function search(name='',sport='',page=0){return{communities:groups.filter(g=>g.visibility==='PUBLIC')
     .filter(g=>g.name.toLocaleLowerCase('pt-PT').includes(name.toLocaleLowerCase('pt-PT')) &&
       (g.sport||'').toLocaleLowerCase('pt-PT').includes(sport.toLocaleLowerCase('pt-PT')))
     .map(({id,name,description,sport,sports,photoUrl,visibility})=>({id,name,description,sport,sports,photoUrl,visibility})),page,hasMore:false};}
  function quota(user){needUser(user);const owned=groups.filter(g=>g.ownerUsername===user).length;const today=new Date().toDateString();const createdToday=groups.filter(g=>g.ownerUsername===user&&new Date(g.createdAt).toDateString()===today).length;
    return {owned,limit:5,canCreate:owned<5&&createdToday<2};}
  function create(input,user){needUser(user);if(!quota(user).canCreate)throw Error('Limite de criação de comunidades atingido.');
    const body=normalizeCommunityInput(input);const id=++nextCommunity;
    const group={...body,id,photoUrl:null,rankingsEnabled:false,individualTournamentsEnabled:false,teamTournamentsEnabled:false,
      ownerUsername:user,createdAt:new Date().toISOString(),memberCount:1,members:demoMembers([user],user)};
    groups.push(group);return get(id,user);}
  function joinPublic(id,user){needUser(user);const g=exists(id);if(g.visibility!=='PUBLIC')throw Error('Esta comunidade exige um pedido ou convite.');
    if(!g.members.some(m=>m.username===user))g.members.push({profileId:100+g.members.length,username:user,fullName:user,profilePicUrl:null,role:'MEMBER'});
    return get(id,user);}
  function requestJoin(id,user){needUser(user);const g=exists(id);if(g.visibility!=='PRIVATE')throw Error('Comunidade pública: utiliza a adesão direta.');
    if(g.members.some(m=>m.username===user))throw Error('Já és membro desta comunidade.');
    const old=requests.find(x=>x.communityId===g.id&&x.requesterUsername===user&&x.status==='PENDING');if(old)return {...old};
    const item={id:++nextRequest,communityId:g.id,communityName:g.name,requesterUsername:user,status:'PENDING',createdAt:new Date().toISOString()};requests.push(item);return {...item};}
  function myPendingRequest(id,user){needUser(user);exists(id);return requests.find(x=>x.communityId===id&&x.requesterUsername===user&&x.status==='PENDING')||null;}
  function pendingRequests(id,user){const g=exists(id);needOwner(g,user);return requests.filter(r=>r.communityId===g.id&&r.status==='PENDING').map(x=>({...x}));}
  function acceptRequest(id,requestId,user){const g=exists(id);needOwner(g,user);const r=requests.find(x=>x.id===requestId&&x.communityId===g.id&&x.status==='PENDING');if(!r)throw Error('Pedido não encontrado.');
    r.status='ACCEPTED';return joinPrivateAfterApproval(g.id,r.requesterUsername);}
  function joinPrivateAfterApproval(id,user){const g=exists(id);if(!g.members.some(m=>m.username===user))g.members.push({profileId:100+g.members.length,username:user,fullName:user,profilePicUrl:null,role:'MEMBER'});return get(id,user);}
  function invite(id,toUser,byUser){const g=exists(id);needOwner(g,byUser);const normalized=inviteCandidates.find(c=>c.toLocaleLowerCase('pt-PT')===toUser.trim().toLocaleLowerCase('pt-PT'));
    if(!normalized)throw Error('Na demo, só podes convidar o Tiago ou o André.');
    if(g.members.some(m=>m.username===normalized))throw Error('Esta pessoa já é membro da comunidade.');
    if(invites.some(x=>x.communityId===g.id&&x.toUsername===normalized))throw Error('Já existe um convite pendente.');
    const item={id:++nextInvite,communityId:g.id,communityName:g.name,invitedByUsername:byUser,toUsername:normalized,createdAt:new Date().toISOString()};invites.push(item);return {...item};}
  function myInvites(user){needUser(user);return invites.filter(i=>i.toUsername===user).map(({toUsername,...i})=>({...i}));}
  function acceptInvite(inviteId,user){needUser(user);const index=invites.findIndex(i=>i.id===safeId(inviteId)&&i.toUsername===user);
    if(index<0)throw Error('Convite inexistente ou não autorizado.');const [i]=invites.splice(index,1);return joinPrivateAfterApproval(i.communityId,user);}
  function rejectInvite(inviteId,user){needUser(user);const index=invites.findIndex(i=>i.id===safeId(inviteId)&&i.toUsername===user);
    if(index<0)throw Error('Convite inexistente ou não autorizado.');invites.splice(index,1);}
  return {get,mine,search,quota,create,joinPublic,requestJoin,myPendingRequest,pendingRequests,acceptRequest,invite,myInvites,acceptInvite,rejectInvite};
}
module.exports={safeId,communityUrl,normalizeCommunityInput,makeStore};
