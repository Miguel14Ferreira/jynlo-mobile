'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {buildFeedback}=require('../src/lib/feedback-core.cjs');
test('feedback body matches the ideas endpoint and tags the platform',()=>{
 const r=buildFeedback({name:' Rui ',email:'rui@exemplo.pt',message:'O botão de partilhar não abre.',kind:'PROBLEM',platform:'iPhone'});
 assert.deepEqual(r.body,{name:'Rui',email:'rui@exemplo.pt',city:null,gender:null,subject:'App iPhone · Problema',problem:'O botão de partilhar não abre.'});
});
test('feedback validates name, email and message length',()=>{
 assert.equal(buildFeedback({name:'R',email:'a@b.pt',message:'x'.repeat(20)}).error,'Indica o teu nome.');
 assert.match(buildFeedback({name:'Rui',email:'nope',message:'x'.repeat(20)}).error,/email válido/);
 assert.match(buildFeedback({name:'Rui',email:'a@b.pt',message:'curto'}).error,/10 caracteres/);
 assert.equal(buildFeedback({name:'Rui',email:'a@b.pt',message:'x'.repeat(20),kind:'??'}).body.subject,'App Sugestão');
});
