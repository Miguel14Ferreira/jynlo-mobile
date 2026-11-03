'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {STATUSES,availableSports,sportIcon,filterTournaments}=require('../src/lib/tournament-discovery-core.cjs');
const rows=[
 {communityId:5,communityName:'Amigos do Desporto',tournament:{id:2,name:'Taça Karting',sport:'Karting',status:'IN_PROGRESS'}},
 {communityId:3,communityName:'Pistas de Lisboa',tournament:{id:3,name:'Grande Prémio',sport:'Karting',status:'DRAFT'}},
 {communityId:2,communityName:'Natação & Companhia',tournament:{id:8,name:'Prova 50 m',sport:'Natação',status:'COMPLETED'}},
 {communityId:4,communityName:'Amigos do Desporto',tournament:{id:1,name:'Liga de Futebol',sport:'Futebol',status:'IN_PROGRESS'}},
];
test('pesquisa ignora acentos e procura em nome, modalidade e comunidade',()=>{
 assert.equal(filterTournaments(rows,{query:'natacao'}).length,1);
 assert.equal(filterTournaments(rows,{query:'pistas de lisboa'})[0].tournament.id,3);
 assert.equal(filterTournaments(rows,{query:'  GRANDE premio '})[0].tournament.id,3);
 assert.equal(filterTournaments(rows,{query:'inexistente'}).length,0);
});
test('filtros de estado e desporto combinam-se sem modificar os originais',()=>{
 assert.deepEqual(filterTournaments(rows,{status:'IN_PROGRESS',sport:'Karting'}).map(x=>x.tournament.id),[2]);
 assert.deepEqual(filterTournaments(rows).map(x=>x.tournament.id),[1,2,3,8]);
 assert.equal(filterTournaments(rows,{sport:'nATAÇÃO'})[0].tournament.id,8);
 assert.equal(rows[0].tournament.id,2);
});
test('modalidades dinâmicas e ícones não se limitam ao futebol',()=>{
 assert.deepEqual(availableSports(rows),['Futebol','Karting','Natação']);
 assert.equal(sportIcon('Karting'),'🏎️');
 assert.equal(sportIcon('Natação'),'🏊');
 assert.equal(sportIcon('Desporto novo'),'🏆');
 assert.equal(STATUSES.length,4);
});
test('estado vazio e registos inválidos não geram tabelas fantasmas',()=>{
 assert.deepEqual(filterTournaments([]),[]);
 assert.deepEqual(availableSports([]),[]);
 assert.deepEqual(filterTournaments([{},null]),[]);
});
