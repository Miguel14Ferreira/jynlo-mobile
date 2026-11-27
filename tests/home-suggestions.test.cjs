const test=require('node:test');const assert=require('node:assert/strict');
const {pickOpenGames,pickCommunitySuggestions}=require('../src/lib/home-suggestions.cjs');
const now=Date.parse('2030-01-01T10:00:00Z');
test('open games: future, with free spots, soonest first, at most three',()=>{
  const g=(id,h,max,taken)=>({id,gameDate:`2030-01-0${h}T20:00:00Z`,maxParticipants:max,participantCount:taken});
  const list=[g(1,5,10,10),g(2,4,10,3),g(3,2,4,1),g(4,3,4,2),g(5,6,8,1),{id:6,gameDate:'2029-12-31T20:00:00Z',maxParticipants:4,participantCount:0}];
  assert.deepEqual(pickOpenGames(list,[4],now).map(x=>x.id),[3,2,5]);
});
test('community suggestions: only public ones the person is not in',()=>{
  const list=[{id:1,visibility:'PUBLIC'},{id:2,visibility:'PRIVATE'},{id:3,visibility:'PUBLIC'}];
  assert.deepEqual(pickCommunitySuggestions(list,[3]).map(x=>x.id),[1]);
});
