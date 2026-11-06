'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {availableSessionSports}=require('../src/lib/session-community-sports.cjs');

const catalog=['Futebol','Padel','Voleibol','Karting'];
const one={id:1,sport:'Futebol',sports:['Futebol','Padel','Voleibol']};
const two={id:2,sport:'Padel',sports:['Padel','Voleibol','Karting']};
const legacy={id:3,sport:'Padel'};

test('independent session keeps all sports available',()=>{
 assert.deepEqual(availableSessionSports([],catalog),catalog);
});
test('one community restricts to its configured sports',()=>{
 assert.deepEqual(availableSessionSports([one],catalog),['Futebol','Padel','Voleibol']);
});
test('multiple communities can share only their common sports',()=>{
 assert.deepEqual(availableSessionSports([one,two],catalog),['Padel','Voleibol']);
 assert.deepEqual(availableSessionSports([one,two,legacy],catalog),['Padel']);
});
test('communities without a shared sport cannot publish a shared session',()=>{
 assert.deepEqual(availableSessionSports([one,{id:4,sport:'Karting'}],catalog),[]);
});
test('legacy community sport and canonical catalog are both respected',()=>{
 assert.deepEqual(availableSessionSports([legacy],catalog),['Padel']);
 assert.deepEqual(availableSessionSports([one],['Futebol']),['Futebol']);
});
test('helper does not mutate catalog or community sports',()=>{
 const before=one.sports.slice();
 availableSessionSports([one,two],catalog);
 assert.deepEqual(catalog,['Futebol','Padel','Voleibol','Karting']);
 assert.deepEqual(one.sports,before);
});
