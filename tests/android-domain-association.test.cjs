'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validateAssociation}=require('../scripts/check-android-app-links.cjs');
const validFingerprint=Array(32).fill('AB').join(':');

test('rejects missing or spoofed Digital Asset Links declarations',()=>{
 assert.match(validateAssociation(null),/lista/);
 assert.match(validateAssociation([]),/pacote Android/);
 assert.match(validateAssociation([{relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:'com.outra.app',sha256_cert_fingerprints:[validFingerprint]}}]),/pacote Android/);
});
test('requires handle_all_urls and valid SHA256 certificate fingerprint',()=>{
 const entry={target:{namespace:'android_app',package_name:'com.jynlo.app',sha256_cert_fingerprints:['INVALID']}};
 assert.match(validateAssociation([{...entry,relation:[]}]),/handle_all_urls/);
 assert.match(validateAssociation([{...entry,relation:['delegate_permission/common.handle_all_urls']}]),/SHA-256/);
 assert.equal(validateAssociation([{...entry,relation:['delegate_permission/common.handle_all_urls'],target:{...entry.target,sha256_cert_fingerprints:[validFingerprint]}}]),null);
});
test('the Android release exposes an explicit domain verification command',()=>{
 const pkg=require('../package.json');
 assert.equal(pkg.scripts['check:app-links'],'node scripts/check-android-app-links.cjs');
 const src=fs.readFileSync(path.join(__dirname,'..','scripts','check-android-app-links.cjs'),'utf8');
 assert.match(src,/const domain='d24sports\\.com'/);
 assert.match(src,/const uri='https:\\/\\/'\\+domain/);
 assert.match(src,/\.well-known\/assetlinks\.json/);
 assert.match(src,/setTimeout\(10000/);
});
