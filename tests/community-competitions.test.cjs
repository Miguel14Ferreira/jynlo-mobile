'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {communityAllowsTournamentSport,canCreateTournamentForSport,groupCommunityTournaments}=require('../src/lib/community-competition-core.cjs');
const community={sports:['Padel','Karting','Golfe'],sport:'Padel'};
const tournaments=[
 {id:3,name:'Grande Prémio',sport:'Karting',entryType:'INDIVIDUAL',scoringMode:'RACE_POINTS',status:'IN_PROGRESS'},
 {id:4,name:'Open',sport:'Padel',entryType:'INDIVIDUAL',format:'LEAGUE',status:'DRAFT'},
 {id:5,name:'Torneio histórico',sport:'Futebol',entryType:'TEAM',status:'COMPLETED'}
];
test('organiza torneios pelos desportos associados à comunidade, incluindo secundários',()=>{
 const sections=groupCommunityTournaments(community,tournaments);
 assert.deepEqual(sections.map(s=>s.sport),['Padel','Karting','Golfe','Futebol']);
 assert.deepEqual(sections.map(s=>s.tournaments.length),[1,1,0,1]);
 assert.equal(sections[1].tournaments[0].kind,'RACE');
 assert.equal(sections[0].tournaments[0].kind,'INDIVIDUAL');
});
test('não oculta torneios antigos de modalidades entretanto removidas',()=>{
 const sections=groupCommunityTournaments(community,tournaments);
 const football=sections.find(s=>s.sport==='Futebol');
 assert.equal(football.selected,false);
 assert.equal(football.tournaments[0].id,5);
 assert.equal(football.tournaments[0].kind,'TEAM');
});
test('permite criar apenas em modalidades atualmente selecionadas e com modelo validado',()=>{
 assert.equal(communityAllowsTournamentSport(community,'Karting'),true);
 assert.equal(canCreateTournamentForSport(community,'Karting'),true);
 assert.equal(canCreateTournamentForSport(community,'Padel'),true);
 assert.equal(canCreateTournamentForSport(community,'Golfe'),false);
 assert.equal(canCreateTournamentForSport(community,'Futebol'),false);
});
test('sem scoringMode não atribui pontos de corrida só pelo nome Karting',()=>{
 const sections=groupCommunityTournaments(community,[{id:7,name:'Treino',sport:'Karting',entryType:'INDIVIDUAL',status:'DRAFT'}]);
 assert.equal(sections[1].tournaments[0].kind,'UNSUPPORTED');
});
test('mantém compatibilidade com comunidades antigas e evita modalidades inválidas',()=>{
 const old={sport:'Futsal'};
 assert.deepEqual(groupCommunityTournaments(old,[]).map(s=>s.sport),['Futsal']);
 assert.equal(canCreateTournamentForSport(old,'Futsal'),true);
 assert.equal(communityAllowsTournamentSport(old,'Futebol'),false);
 assert.equal(communityAllowsTournamentSport(old,''),false);
});
test('ecrãs não criam torneios automaticamente nem inventam classificações',()=>{
 const hub=fs.readFileSync(path.join(__dirname,'../app/communities/[id]/competitions.tsx'),'utf8');
 const create=fs.readFileSync(path.join(__dirname,'../app/tournaments/create.tsx'),'utf8');
 assert.match(hub,/tournamentsForCommunity/);
 assert.match(hub,/classificationKind|label\(tournament.kind\)/);
 assert.match(hub,/canCreateTournamentForSport/);
 assert.match(create,/communityAllowsTournamentSport/);
 assert.match(create,/selectedSports/);
 assert.doesNotMatch(hub,/method:'POST'/);
});
