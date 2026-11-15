'use strict';
/** Sidecar provenance for shareable Codemagic APKs.
 * Generated only after Gradle successfully emits an APK. No credentials,
 * device IDs, private build environment or Android signing keys are logged.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const API='https://desporto24-preview-api.onrender.com';
const SHA=/^[0-9a-f]{40}$/i;
const SAFE_FILE=/^[a-zA-Z0-9_.-]+\.apk$/;

function artifactMetadata(input,config,apkBytes,verifiedBinary){
 if(input.CM_BRANCH!=='develop')throw Error('A APK Jynlo só pode ser criada da develop.');
 if(input.CM_PULL_REQUEST==='true')throw Error('Não distribuir builds de pull requests.');
 if(!SHA.test(input.CM_COMMIT||''))throw Error('Commit Git inválido ou indisponível.');
 if((input.EXPO_PUBLIC_JYNLO_API_URL||'')!==API)
  throw Error('A APK de testes deve usar exclusivamente o backend preview.');
 if(config.android?.package!=='com.jynlo.app')
  throw Error('A APK não corresponde à identidade Android oficial Jynlo.');
 if(!Number.isInteger(config.android?.versionCode)||config.android.versionCode<=0||
    typeof config.version!=='string'||!/^\d+\.\d+\.\d+$/.test(config.version))
  throw Error('Versão Android inválida.');
 const name=input.JYNLO_APK_FILENAME||'app-release.apk';
 if(!SAFE_FILE.test(name))throw Error('Nome de APK inválido.');
 const withPush=Boolean(input.GOOGLE_SERVICES_JSON);
 if(input.JYNLO_REQUIRE_NATIVE_PUSH==='1'&&!withPush)
  throw Error('A build anunciada com push não inclui configuração Firebase.');
 if(!Buffer.isBuffer(apkBytes)||apkBytes.length<1024)
  throw Error('APK ausente ou demasiado pequena para distribuir.');
 // The report must originate from aapt and apksigner on this exact APK.
 // A matching package in app.json is not sufficient release provenance.
 const checksum=crypto.createHash('sha256').update(apkBytes).digest('hex');
 if(!verifiedBinary||verifiedBinary.verified!==true||
    verifiedBinary.package!==config.android.package||
    verifiedBinary.version!==config.version||
    verifiedBinary.versionCode!==config.android.versionCode||
    verifiedBinary.file!==name||
    verifiedBinary.apkSha256!==checksum||
    !/^[a-f0-9]{64}$/i.test(verifiedBinary.signerCertificateSha256||'')||
    !['debug','custom'].includes(verifiedBinary.signingType))
  throw Error('APK sem verificação binária válida ou com checksum/assinatura divergente.');
 return {
  artifact:'Jynlo Android QA',
  version:config.version,
  versionCode:config.android.versionCode,
  package:config.android.package,
  branch:input.CM_BRANCH,
  commit:input.CM_COMMIT.toLowerCase(),
  buildId:typeof input.CM_BUILD_ID==='string'?input.CM_BUILD_ID:'',
  workflow:typeof input.CM_WORKFLOW_NAME==='string'?input.CM_WORKFLOW_NAME:'',
  backend:API,
  pushConfigured:withPush,
  signing:verifiedBinary.signingType==='debug'?'Android debug-key (QA; assinatura diferente pode exigir desinstalação)':'Assinatura personalizada (verificar compatibilidade ao atualizar)',
  signerCertificateSha256:verifiedBinary.signerCertificateSha256.toLowerCase(),
  androidBuildTools:verifiedBinary.androidBuildTools||null,
  binaryVerified:true,
  sha256:checksum,
  file:name
 };
}

function qaTestInstructions(metadata){
 const push=metadata.pushConfigured
  ?'Push Android: configuração Firebase incorporada; confirmar receção real de uma notificação no dispositivo.'
  :'Push Android: NÃO DISPONÍVEL nesta APK. Usar apenas as notificações dentro da Jynlo.';
 return [
  'JYNLO — PLANO DE TESTES DA APK ANDROID',
  '',
  'Versão: '+metadata.version+' (build '+metadata.versionCode+')',
  'Commit: '+metadata.commit,
  'Branch: '+metadata.branch,
  'Pacote: '+metadata.package,
  'Backend de testes: '+metadata.backend,
  'APK: '+metadata.file,
  'SHA-256: '+metadata.sha256,
  'Certificado de assinatura (SHA-256): '+metadata.signerCertificateSha256,
  'Assinatura: '+metadata.signing,
  push,
  '',
  'INSTALAÇÃO',
  '1. Confirmar que a APK foi descarregada do artefacto desta build Codemagic.',
  '2. Instalar a APK e confirmar que abre sem fechar imediatamente.',
  '3. Se o Android apresentar conflito de assinatura com uma APK anterior,',
  '   poderá ser necessário desinstalar a versão antiga antes desta instalação.',
  '   IMPORTANTE: desinstalar pode eliminar dados guardados apenas no dispositivo.',
  '4. Confirmar que o login funciona e que os dados pertencem à conta correta.',
  '',
  'TESTES PRIORITÁRIOS (usar duas contas ou dois dispositivos quando indicado)',
  '[ ] Iniciar sessão, terminar sessão e voltar a iniciar com outra conta.',
  '[ ] Abrir Explorar em vista mapa e lista sem crash.',
  '[ ] Criar publicação com foto e sem texto; confirmar que aparece no feed.',
  '[ ] Criar publicação com varias fotos ou video e consultar o resultado.',
  '[ ] Criar Story pela camara, selecionar galeria e visualizar apos publicar.',
  '[ ] Gostar, comentar e editar uma publicacao; confirmar contagens apos atualizar.',
  '[ ] Enviar mensagens e anexos num chat direto e num chat de sessao.',
  '[ ] Criar sessao, partilhar link e inscrever um segundo jogador.',
  '[ ] Cancelar sessao pelo feed: confirmar que nao volta a aparecer no feed.',
  '[ ] Confirmar que o jogador inscrito recebe aviso dentro da Jynlo.',
  '[ ] Reabrir detalhe de sessao cancelada e partilhar aviso com convidados externos.',
  '[ ] Verificar equipas, torneios e campeonatos nas comunidades.',
  '[ ] '+(metadata.pushConfigured
    ?'Com notificacoes autorizadas, confirmar o push de cancelamento com app fechada.'
    :'Nao testar push nesta APK (falta configuracao Firebase).'),
  '',
  'RELATAR PROBLEMAS',
  'Anotar modelo do telemovel, versao Android, passos para reproduzir,',
  'captura de ecra e o commit indicado no cabecalho. Nao enviar passwords nem tokens.',
  'Este documento descreve o que deve ser TESTADO, nao funcionalidades aprovadas.',
  ''
 ].join('\n');
}

function writeManifest(environment=process.env,io=fs){
 const root=environment.CM_BUILD_DIR||path.resolve(__dirname,'..');
 const application=JSON.parse(io.readFileSync(path.join(root,'app.json'),'utf8')).expo;
 const apkDir=path.join(root,'android','app','build','outputs','apk','release');
 const found=io.readdirSync(apkDir).filter(name=>SAFE_FILE.test(name));
 if(found.length!==1)throw Error('Esperada exatamente uma APK release para distribuição.');
 const file=found[0];
 const bytes=io.readFileSync(path.join(apkDir,file));
 const out=path.join(root,'build-metadata');
 const audit=JSON.parse(io.readFileSync(path.join(out,'jynlo-android-binary-verification.json'),'utf8'));
 const metadata=artifactMetadata({...environment,JYNLO_APK_FILENAME:file},application,bytes,audit);
 io.mkdirSync(out,{recursive:true});
 io.writeFileSync(path.join(out,'jynlo-android-qa.json'),JSON.stringify(metadata,null,2)+'\n');
 io.writeFileSync(path.join(out,'LEIA-ME-JYNLO-ANDROID-QA.txt'),qaTestInstructions(metadata));
 return metadata;
}
if(require.main===module){
 try{
  const metadata=writeManifest();
  console.log('Jynlo Android QA: APK validada; versão '+metadata.version+
   ' ('+metadata.versionCode+'), commit '+metadata.commit.slice(0,12)+
   ', push '+(metadata.pushConfigured?'configurado':'indisponível')+
   '. Manifesto de distribuição gerado.');
 }catch(error){
  console.error(error instanceof Error?error.message:'Erro na auditoria da APK.');
  process.exitCode=1;
 }
}
module.exports={artifactMetadata,writeManifest,qaTestInstructions};
