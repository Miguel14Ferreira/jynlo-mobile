'use strict';
/** Verify live Android HTTPS App Links association without assuming an APK is installed.
 * The SHA-256 certificate must match the exact APK signing certificate.
 * Usage: JYNLO_ANDROID_SIGNING_SHA256=AA:... npm run check:app-links
 * Use the SHA-256 certificate of the actual installed APK, not the upload key.
 */
const https=require('node:https');
const {expo}=require('../app.json');
const domain='d24sports.com';
const uri='https://'+domain+'/.well-known/assetlinks.json';
const packageName=expo.android.package;

function validateAssociation(data,signingFingerprint=null){
 if(!Array.isArray(data))return 'O domínio não devolveu uma lista Digital Asset Links.';
 const entries=data.filter(entry=>entry?.target?.namespace==='android_app'&&entry.target.package_name===packageName);
 if(!entries.length)return 'O ficheiro não associa o pacote Android '+packageName+'.';
 const valid=entries.find(entry=>Array.isArray(entry.relation)&&
  entry.relation.includes('delegate_permission/common.handle_all_urls')&&
  Array.isArray(entry.target.sha256_cert_fingerprints)&&
  entry.target.sha256_cert_fingerprints.some(fingerprint=>
   typeof fingerprint==='string'&&/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/i.test(fingerprint)));
 if(!valid)return 'Falta a relação handle_all_urls ou uma impressão digital SHA-256 válida.';
 if(signingFingerprint){
  if(!/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/i.test(signingFingerprint))
   return 'A impressão digital esperada não é SHA-256 válida.';
  const expected=signingFingerprint.toUpperCase();
  if(!entries.some(entry=>entry.relation?.includes('delegate_permission/common.handle_all_urls')&&
     entry.target.sha256_cert_fingerprints?.some(f=>typeof f==='string'&&f.toUpperCase()===expected)))
   return 'A assinatura SHA-256 da APK não corresponde às impressões digitais publicadas no domínio.';
 }
 return null;
}
async function check(){
 const expected=(process.env.JYNLO_ANDROID_SIGNING_SHA256||'').trim();
 if(!expected)throw Error('Falta JYNLO_ANDROID_SIGNING_SHA256: usa a impressão digital da APK instalada para uma verificação real.');
 const content=await new Promise((resolve,reject)=>{
  const req=https.get(uri,{headers:{accept:'application/json'}},res=>{
   if(res.statusCode!==200){
    res.resume();reject(Error('HTTP '+res.statusCode+' em '+uri));return;
   }
   let body='';
   res.setEncoding('utf8');
   res.on('data',chunk=>{body+=chunk;if(body.length>512*1024)req.destroy(Error('Ficheiro excessivamente grande.'));});
   res.on('end',()=>resolve(body));
   res.on('error',reject);
  });
  req.setTimeout(10000,()=>req.destroy(Error('O domínio não respondeu em 10 segundos.')));
  req.on('error',reject);
 });
 let data;
 try{data=JSON.parse(content);}catch{throw Error('O domínio devolveu JSON inválido.');}
 const issue=validateAssociation(data,expected);
 if(issue)throw Error(issue);
 console.log('Associação Android e assinatura da APK confirmadas para '+packageName+'.');
}
if(require.main===module)check().catch(error=>{console.error('Android App Links: '+error.message);process.exitCode=1;});
module.exports={validateAssociation};
