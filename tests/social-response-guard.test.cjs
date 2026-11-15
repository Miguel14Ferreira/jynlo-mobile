'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {requireSocialCollection,safeDiscoveredPeople}=require('../src/lib/social-response-guard.cjs');

test('valid feed entries survive unmodified, including session activities',()=>{
 const post={type:'POST',postId:3,authorUsername:'ana',createdAt:'2026-11-15T12:00:00Z'};
 const attendance={type:'SESSION_ATTENDED',postId:null,authorUsername:'bruno',createdAt:'2026-11-15T12:00:00Z'};
 const items=[post,attendance];
 assert.strictEqual(requireSocialCollection(items,'feed'),items);
});
test('invalid feed and story responses fail instead of silently clearing cached content',()=>{
 for(const value of [null,{},'bad',[null]])assert.throws(()=>requireSocialCollection(value,'feed'));
 assert.throws(()=>requireSocialCollection([{type:'POST',authorUsername:'ana',postId:-1,createdAt:'2026-11-15T12:00:00Z'}],'feed'));
 assert.throws(()=>requireSocialCollection([{id:2,authorUsername:'ana',mediaUrl:'x',expiresAt:'invalid'}],'story'));
 const stories=[{id:2,authorUsername:'ana',mediaUrl:'https://example.org/2.jpg',expiresAt:'2026-11-16T12:00:00Z'}];
 assert.strictEqual(requireSocialCollection(stories,'story'),stories);
});
test('discover people rejects forged identities and harmful media schemes',()=>{
 const result=safeDiscoveredPeople([
  null,{username:'../admin'},{username:'ana',nickname:{unsafe:true},photoUrl:'javascript:alert(1)'},
  {username:'ANA',nickname:'duplicate'},{username:'bruno',nickname:'  Bruno  ',photoUrl:'https://images.example.org/a.png'},
  {username:'carlos',location:{invalid:true},photoUrl:'data:image/png;base64,abc'}
 ]);
 assert.deepEqual(result.map(person=>person.username),['ana','bruno','carlos']);
 assert.equal(result[0].displayName,'ana');
 assert.equal(result[0].photoUrl,null);
 assert.equal(result[1].displayName,'Bruno');
 assert.equal(result[1].photoUrl,'https://images.example.org/a.png');
 assert.equal(result[2].city,null);
 assert.equal(result[2].photoUrl,null);
});
test('discovery rejects unexpected response shapes and limits valid results',()=>{
 for(const value of [null,{},'bad'])assert.throws(()=>safeDiscoveredPeople(value));
 assert.equal(safeDiscoveredPeople(Array.from({length:50},(_,i)=>({username:'player'+i})),12).length,12);
});
