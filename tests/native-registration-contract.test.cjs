'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=(p)=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('criação de conta navega internamente e nunca abre registo web',()=>{
 const login=read('app/login.tsx'),welcome=read('app/welcome.tsx'),layout=read('app/_layout.tsx');
 assert.match(login,/router\.push\('\/register'\)/);
 assert.match(welcome,/router\.push\('\/register'\)/);
 assert.doesNotMatch(login+welcome,/registerNewUser|Criar conta na Jynlo Web/);
 for(const name of ['register','confirm-email','reset-password'])
  assert.ok(layout.includes('name="'+name+'"'));
});

test('registo nativo usa o mesmo endpoint validado do backend, sem sessão implícita',()=>{
 const api=read('src/lib/native-registration.ts'),screen=read('app/register.tsx');
 assert.match(api,/\/api\/auth\/register\/mobile/);
 assert.match(api,/method:'POST'/);
 assert.match(api,/acceptedLegalTerms:true/);
 assert.match(screen,/confirmPassword/);
 assert.match(screen,/dateOfBirth/);
 assert.match(screen,/setRegistered\(true\)/);
 assert.match(screen,/router\.replace\(\{pathname:'\/confirm-email'/);
 assert.doesNotMatch(screen,/Linking\.openURL.*registerNewUser/);
});

test('confirmação de email e recuperação de password permanecem na app',()=>{
 const api=read('src/lib/native-registration.ts');
 const confirmation=read('app/confirm-email.tsx');
 const reset=read('app/reset-password.tsx');
 assert.match(api,/\/api\/auth\/register\/confirm\?token=/);
 assert.match(api,/\/api\/auth\/register\/resend-confirmation\?username=/);
 assert.match(api,/\/api\/auth\/reset-password\/initiate/);
 assert.match(api,/\/api\/auth\/reset-password\/confirm/);
 assert.match(confirmation,/confirmNativeEmail\(token\)/);
 assert.match(confirmation,/resendRegistrationConfirmation\(username\)/);
 assert.match(reset,/initiateNativePasswordReset\(email\)/);
 assert.match(reset,/confirmNativePasswordReset\(token,password\)/);
});
