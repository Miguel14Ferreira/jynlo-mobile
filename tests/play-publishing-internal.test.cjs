'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Google Play upload exige pedido manual ou commit controlado em develop e usa faixa interna',()=>{
 const yaml=read('.github/workflows/upload-play-internal.yml');
 assert.match(yaml,/workflow_dispatch:/);
 assert.match(yaml,/github.ref == 'refs\/heads\/develop'/);
 assert.match(yaml,/ENVIAR_JYNLO_016_TESTE_INTERNO/);
 assert.match(yaml,/default: draft/);
 assert.match(yaml,/run-id: '42023837920'/);
 assert.ok(yaml.includes('test "$(cat .github/jynlo-play-upload-016.request)" = "ENVIAR_JYNLO_016_TESTE_INTERNO"'));
 assert.match(yaml,/branches: \[develop\]/);
 assert.match(yaml,/github\.event_name == 'push'/);
 assert.match(yaml,/\.github\/jynlo-play-upload-016\.request/);
 assert.doesNotMatch(yaml,/:app:bundleRelease|:app:assembleRelease/);
});
test('API apenas recebe JSON do GitHub Secrets e nunca aceita production como destino',()=>{
 const yaml=read('.github/workflows/upload-play-internal.yml');
 const py=read('scripts/play_upload_internal.py');
 assert.match(yaml,/secrets\.JYNLO_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/);
 assert.match(py,/TRACK="internal"/);
 assert.match(py,/--apply/);
 assert.match(py,/edits\(\)\.commit/);
 assert.match(py,/file_digest/);
 assert.doesNotMatch(py,/TRACK="production"/);
 assert.doesNotMatch(yaml,/track: production/);
});
test('O script de publicação é Python válido',()=>{
 const py=path.join(__dirname,'../scripts/play_upload_internal.py');
 cp.execFileSync('python3',['-c','import ast,sys;ast.parse(open(sys.argv[1],encoding="utf-8").read())',py],{stdio:'pipe'});
});
