'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {toggleStoryMention,storyMentionUsernames}=require('../src/lib/story-details.cjs');
test('friend suggestions add and remove valid Story mentions',()=>{
 assert.equal(toggleStoryMention('ana','Joao'),'ana,joao');
 assert.equal(toggleStoryMention('ana,joao','ANA'),'joao');
 assert.deepEqual(storyMentionUsernames('@Ana,joao,ana,bad tag'),['ana','joao']);
});
test('friend selector never silently discards existing five tags',()=>{
 const five='a1,b2,c3,d4,e5';
 assert.throws(()=>toggleStoryMention(five,'f6'),/máximo 5/);
 assert.equal(toggleStoryMention(five,'e5'),'a1,b2,c3,d4');
});
