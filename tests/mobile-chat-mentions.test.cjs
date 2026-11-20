const test=require('node:test');
const assert=require('node:assert/strict');
const {mentionTerm,insertMention,splitMentions}=require('../src/lib/chat-mentions.cjs');

test('Any Jynlo username can be mentioned, not just current group members',()=>{
 assert.equal(mentionTerm('Olá @joao_23'),'joao_23');
 assert.equal(mentionTerm('Olá @ana_3!'),null);
 assert.equal(insertMention('Olá @joa','joao_23'),'Olá @joao_23 ');
 assert.equal(insertMention('Olá @joa','bad name'),'Olá @joa');
});
test('Mentions render as safe text pieces without swallowing line breaks',()=>{
 assert.deepEqual(splitMentions('Olá @ana!\nE @joao_23'),[
  {text:'Olá ',username:null},{text:'@ana',username:'ana'},
  {text:'!\nE ',username:null},{text:'@joao_23',username:'joao_23'}
 ]);
 assert.deepEqual(splitMentions('Sem menções'),[{text:'Sem menções',username:null}]);
});
