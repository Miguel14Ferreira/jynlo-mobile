'use strict';
const fs=require('node:fs');
const path=require('node:path');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'../app.json'),'utf8')).expo;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checkPushReadiness(environment=process.env){
 const projectId=environment.EXPO_PUBLIC_JYNLO_EAS_PROJECT_ID ||
   config.extra?.eas?.projectId || '';
 const dependencies=JSON.parse(fs.readFileSync(path.join(__dirname,'../package.json'),'utf8')).dependencies;
 const issues=[];
 if(!uuid.test(projectId))issues.push('Falta o EAS projectId. Define EXPO_PUBLIC_JYNLO_EAS_PROJECT_ID com o identificador real da app.');
 if(!dependencies['expo-notifications'])issues.push('Falta expo-notifications.');
 if(!config.plugins.some(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-notifications'))
  issues.push('Falta o plugin expo-notifications no app.json.');
 return {ready:issues.length===0,issues,projectIdConfigured:uuid.test(projectId)};
}
if(require.main===module){
 const result=checkPushReadiness();
 if(result.ready){
  console.log('Preparação local de push: OK. FCM/APNs, EAS credentials e envio Android real ainda exigem validação externa.');
 }else{
  for(const issue of result.issues)console.error('PUSH PENDENTE: '+issue);
  process.exitCode=1;
 }
}
module.exports={checkPushReadiness};
