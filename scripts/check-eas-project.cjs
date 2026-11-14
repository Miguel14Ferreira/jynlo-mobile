'use strict';
/** Validate the EAS project bound by Expo's effective app.config.js.
 * Static app.json intentionally has no projectId: it is supplied dynamically.
 * No network, credentials disclosure, EAS init, or APK build.
 */
function validateEasBinding({config,expectedProjectId,owner='tmf14s-team',slug='jynlo'}){
 const id=config?.extra?.eas?.projectId;
 const format=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(typeof id!=='string'||!format.test(id))throw Error('EAS Project ID ausente ou inválido na configuração Expo efetiva.');
 if(config.owner!==owner||config.slug!==slug)throw Error('A configuração Expo aponta para outro projeto ou outra conta.');
 if(expectedProjectId&&expectedProjectId!==id)throw Error('EAS_PROJECT_ID não corresponde ao projeto Expo configurado. Build bloqueada.');
 return {id,owner:config.owner,slug:config.slug};
}
function check(){
 const staticConfig=require('../app.json').expo;
 const effective=require('../app.config.js')({config:staticConfig});
 const expected=(process.env.EAS_PROJECT_ID||'').trim();
 const result=validateEasBinding({config:effective,expectedProjectId:expected});
 console.log('Projeto Expo confirmado: @'+result.owner+'/'+result.slug+' ('+result.id+').');
 return result;
}
if(require.main===module){
 try{check();}
 catch(e){console.error('EAS binding: '+(e instanceof Error?e.message:String(e)));process.exitCode=1;}
}
module.exports={validateEasBinding,check};
