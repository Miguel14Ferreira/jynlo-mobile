const {test}=require('node:test');
const assert=require('node:assert/strict');
const {assertCanStartLogin}=require('../src/lib/account-session.cjs');
test('um jogo autenticada impede entrada noutra sem logout',()=>{
  for(const username of ['Tiago','André','utilizador-real']){
    assert.throws(()=>assertCanStartLogin(username),/Termina primeiro/);
  }
});
test('depois do logout (sem identidade) é possível entrar novamente',()=>{
  assert.doesNotThrow(()=>assertCanStartLogin(null));
  assert.doesNotThrow(()=>assertCanStartLogin(''));
});
