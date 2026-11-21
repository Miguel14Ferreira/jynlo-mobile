'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {encodePoll,readPoll,isPollText}=require('../src/lib/chat-poll.cjs');
test('poll envelope matches the server format',()=>{
 const text=encodePoll(' Que dia jogamos? ',['Sábado','',' Domingo ']);
 assert.equal(text,'[JYNLO:POLL:1]Que dia jogamos?\nSábado\nDomingo');
 assert.deepEqual(readPoll(text),{question:'Que dia jogamos?',options:['Sábado','Domingo']});
 assert.equal(isPollText(text),true);
});
test('invalid polls are rejected',()=>{
 assert.equal(encodePoll('Q',['Só uma']),'');
 assert.equal(encodePoll('Q',['Sim','sim']),'');
 assert.equal(encodePoll('',['A','B']),'');
 assert.equal(encodePoll('Q',['1','2','3','4','5','6','7']),'');
 assert.equal(readPoll('[JYNLO:POLL:1]Q\nA\n\nB'),null);
 assert.equal(readPoll('olá'),null);
});
