'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const core=require('../src/lib/mfa-settings-core.cjs');

test('codes must be exactly 6 digits',()=>{
 assert.equal(core.normalizeTotp(' 123 456 '),'123456');
 assert.throws(()=>core.normalizeTotp('12345'),/6 dígitos/);assert.throws(()=>core.normalizeTotp(''),/6 dígitos/);
});
test('only real otpauth links and inline PNG QR codes are used',()=>{
 assert.ok(core.safeOtpauthUri('otpauth://totp/Jynlo%3Amiguel?secret=JBSWY3DPEHPK3PXP&issuer=Jynlo'));
 assert.equal(core.safeOtpauthUri('https://evil.example/?secret=AAAA'),null);
 assert.equal(core.safeOtpauthUri('otpauth://hotp/x?secret=AAAA'),null);
 assert.ok(core.safeQrDataUrl('data:image/png;base64,iVBORw0KGgo='));
 assert.equal(core.safeQrDataUrl('data:image/svg+xml;base64,PHN2Zz4='),null);
 assert.equal(core.safeQrDataUrl('https://x/y.png'),null);
});
test('key is shown in groups of 4 and errors are explained',()=>{
 assert.equal(core.formatSecret('JBSWY3DPEHPK3PXP'),'JBSW Y3DP EHPK 3PXP');
 assert.match(core.mfaErrorMessage(409),/já está ativa/);assert.match(core.mfaErrorMessage(429),/Demasiadas/);
});
test('app uses the same endpoints as the web and needs a code to turn it off',()=>{
 const api=read('src/lib/mfa-settings-api.ts');
 assert.match(api,/'\/api\/profile\/me\/mfa\/setup',\{token:need\(token\),method:'POST'\}/);
 assert.match(api,/'\/api\/profile\/me\/mfa\/confirm'/);
 assert.match(api,/'\/api\/profile\/me\/mfa',\{token:need\(token\),method:'DELETE',body:\{code:normalizeTotp\(code\)\}\}/);
 assert.match(read('app/(tabs)/profile.tsx'),/router\.push\('\/security-mfa'\)/);
});
