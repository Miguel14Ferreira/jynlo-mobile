'use strict';
/** No silent publication of an offline demo. Invoke in EAS lifecycle and CI. */
const httpUrl=(process.env.EXPO_PUBLIC_JYNLO_API_URL||'').trim();
const release=process.argv.includes('--production') || process.env.JYNLO_REQUIRE_REAL_API==='1' || process.env.EAS_BUILD_PROFILE==='production';
function checkProductionEnvironment(){
  if(!release) return {ok:true,mode:httpUrl?'api':'demo'};
  if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(httpUrl)) {
    throw new Error('BUILD BLOQUEADO: define EXPO_PUBLIC_JYNLO_API_URL=https://... para a versão de loja. Não podes publicar o modo demonstração.');
  }
  if(/localhost|127\.0\.0\.1|example\.|demo\.|\.invalid/i.test(httpUrl)) {
    throw new Error('BUILD BLOQUEADO: endpoint de demonstração/inválido.');
  }
  return {ok:true,mode:'api'};
}
if(require.main===module){
  try {const status=checkProductionEnvironment();console.log(`Jynlo release guard: OK (${status.mode}).`);}
  catch(error){console.error(error.message);process.exit(1);}
}
module.exports={checkProductionEnvironment};
