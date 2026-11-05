'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readSuccessfulResponse}=require('../src/lib/response-body.cjs');

test('respostas 204 e 205 são sucesso sem corpo',async()=>{
  for(const status of [204,205]){
    let called=false;
    assert.equal(await readSuccessfulResponse({status,text:async()=>{called=true;throw Error('Unexpected read');}}),undefined);
    assert.equal(called,false);
  }
});
test('200 vazio ou só espaços não transforma DELETE concluído em erro',async()=>{
  for(const value of ['',' \n  ']){
    assert.equal(await readSuccessfulResponse({status:200,text:async()=>value}),undefined);
  }
});
test('respostas JSON continuam a funcionar em chamadas normais',async()=>{
  const value=await readSuccessfulResponse({status:201,text:async()=>'{"id":42,"ok":true}'});
  assert.deepEqual(value,{id:42,ok:true});
});
test('respostas inválidas avisam para não repetir mutações',async()=>{
  await assert.rejects(()=>readSuccessfulResponse({status:200,text:async()=>'<html>proxy error</html>'}),/confirma o resultado antes de tentares novamente/);
});
