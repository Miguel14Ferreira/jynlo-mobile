'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const home=read('app/(tabs)/index.tsx');
const {uncertainPostOutcome}=require('../src/lib/post-publish-uncertainty.cjs');

test('Story uncertain upload result requires author acknowledgment before a second POST',()=>{
 assert.match(home,/const \[storyRetryAcknowledged,setStoryRetryAcknowledged\]=useState\(true\)/);
 assert.match(home,/if\(!requireLogin\(\)\|\|storyInFlight\.current\|\|!storyRetryAcknowledged\|\|!storyMedia\)return/);
 assert.match(home,/setStoryRetryAcknowledged\(!uncertainPostOutcome\(message\)\)/);
 assert.match(home,/accessibilityState=\{\{disabled:!storyMedia\|\|storyPublishing\|\|!storyRetryAcknowledged,busy:storyPublishing\}\}/);
 assert.match(home,/disabled=\{!storyMedia\|\|storyPublishing\|\|!storyRetryAcknowledged\}/);
 assert.match(home,/!storyRetryAcknowledged\?<Pressable accessibilityRole="button"/);
 assert.match(home,/Já confirmei as minhas Stories · Permitir novo envio/);
});
test('Story composer reopens with a clean retry guard and discarding resets it',()=>{
 const opening=home.slice(home.indexOf('function openStoryComposer()'),home.indexOf('function changeComposerMedia('));
 assert.match(opening,/setStoryPublishError\(''\);setStoryRetryAcknowledged\(true\)/);
 assert.match(opening,/setStoryComposer\(false\);setStoryMedia\(null\);setStoryCaption\(''\)/);
 assert.match(opening,/setStoryPublishCommunityId\(null\);setStoryPublishTeamId\(null\);setStoryStyleOpen\(false\);setStoryDetailsOpen\(false\);setStoryRetryAcknowledged\(true\)/);
});
test('uncertain network or receipt failures block re-sending, but local validation failures do not',()=>{
 for(const message of [
  'Não foi possível obter confirmação do servidor. Verifica a ligação móvel ou Wi-Fi',
  'O envio demorou demasiado tempo. Confirma no perfil se foi publicado antes de repetires.',
  'O servidor respondeu, mas a ligação interrompeu-se antes de confirmar o resultado.'
 ])assert.equal(uncertainPostOutcome(message),true,message);
 for(const message of [
  'A legenda do Story pode ter até 180 caracteres.',
  'Não foi possível ler o ficheiro selecionado. Escolhe-o novamente na galeria.'
 ])assert.equal(uncertainPostOutcome(message),false,message);
});
