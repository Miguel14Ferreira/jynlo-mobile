'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validateEasBinding,check}=require('../scripts/check-eas-project.cjs');

const project='5628b5c4-513a-4b82-b0fb-7a50cace5cb6';
const expected={owner:'tmf14s-team',slug:'jynlo',extra:{eas:{projectId:project}}};

test('the real Expo config supplies the project identity missing from static app.json',()=>{
 const raw=require('../app.json').expo;
 assert.equal(raw.extra?.eas?.projectId,undefined);
 const dynamic=require('../app.config.js')({config:raw});
 assert.equal(dynamic.extra?.eas?.projectId,project);
 assert.equal(dynamic.owner,expected.owner);
 assert.equal(dynamic.slug,expected.slug);
 assert.deepEqual(validateEasBinding({config:dynamic}),{id:project,owner:expected.owner,slug:expected.slug});
});
test('a different Expo project, account or malformed ID blocks the build',()=>{
 assert.throws(()=>validateEasBinding({config:expected,expectedProjectId:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'}),/não corresponde/);
 assert.throws(()=>validateEasBinding({config:{...expected,owner:'other-owner'}}),/outra conta/);
 assert.throws(()=>validateEasBinding({config:{...expected,slug:'other-app'}}),/outro projeto/);
 assert.throws(()=>validateEasBinding({config:{...expected,extra:{eas:{projectId:'invalid'}}}}),/inválido/);
});
test('preview workflow checks dynamic binding without attempting a second EAS init',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'..','.github','workflows','mobile-preview-apk.yml'),'utf8');
 assert.match(workflow,/run: node scripts\/check-eas-project\.cjs/);
 assert.doesNotMatch(workflow,/eas-cli init --id/);
 assert.doesNotMatch(workflow,/require\('\.\/app\.json'\)\.expo\.extra\?\.eas\?\.projectId/);
});
test('normal preview configuration validates with no EAS token or network',()=>{
 const previous=process.env.EAS_PROJECT_ID;
 try{
  delete process.env.EAS_PROJECT_ID;
  assert.equal(check().id,project);
  process.env.EAS_PROJECT_ID='00000000-0000-4000-8000-000000000000';
  assert.throws(()=>check(),/não corresponde/);
 }finally{
  if(previous===undefined)delete process.env.EAS_PROJECT_ID;
  else process.env.EAS_PROJECT_ID=previous;
 }
});

test('local Windows preflight rejects mismatched project and incompatible Expo SDK before TypeScript',()=>{
 const script=fs.readFileSync(path.join(__dirname,'..','scripts','validate-local.ps1'),'utf8');
 const project=script.indexOf("'scripts/check-eas-project.cjs'");
 const sdk=script.indexOf("'expo','install','--check'");
 const types=script.indexOf("'run','typecheck'");
 assert.ok(project>=0&&sdk>project&&types>sdk,'Expo project and SDK checks must precede typecheck');
 assert.match(script,/\[switch\]\$BuildApk/);
 assert.match(script,/CONSTRUIR_APK/);
});
