'use strict';
/** Verify live Android HTTPS App Links association without assuming an APK is installed.
 * The SHA-256 certificate must match the exact APK signing certificate.
 * Usage: node scripts/check-android-app-links.cjs
 */
const https=require('node:https');
const {expo}=require('../app.json');
const domain='d24sports.com';
const uri='https://'+domain+'/.well-known/assetlinks.json';
const packageName=expo.android.package;

function validateAssociation(data){
 if(!Array.isArray(data))return 'O domínio não devolveu uma lista Digital Asset Links.';
 const entries=data.filter(entry=>entry?.target?.namespace==='android_app'&&entry.target.package_name===packageName);
 if(!entries.length)return 'O ficheiro não associa o pacote Android '+packageName+'.';
 const valid=entries.find(entry=>Array.isArray(entry.relation)&&
  entry.relation.includes('delegate_permission/common.handle_all_urls')&&
  Array.isArray(entry.target.sha256_cert_fingerprints)&&
  entry.target.sha256_cert_fingerprints.some(fingerprint=>
   typeof fingerprint==='string'&&/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/i.test(fingerprint)));
 if(!valid)return 'Falta a relação handle_all_urls ou uma impressão digital SHA-256 válida.';
 return null;
}
async function check(){
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
 const issue=validateAssociation(data);
 if(issue)throw Error(issue);
 console.log('Associação Android encontrada para '+packageName+'.');
 console.log('Confirma também que a impressão digital publicada corresponde ao certificado da APK.');
}
if(require.main===module)check().catch(error=>{console.error('Android App Links: '+error.message);process.exitCode=1;});
module.exports={validateAssociation};
