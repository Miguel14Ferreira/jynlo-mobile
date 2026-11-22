const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>untranslate(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));

test('Story editor prioritizes captured media and caption over advanced controls',()=>{
 const home=read('app/(tabs)/index.tsx');
 const story=home.slice(home.indexOf('<Modal visible={identityMatches&&storyComposer}'),home.indexOf('</Modal>',home.indexOf('<Modal visible={identityMatches&&storyComposer}')));
 assert.match(story,/<StoryCameraCapture key=/);
 assert.match(story,/\{storyMedia\?<View style=\{styles\.storyCaptionBlock\}>/);
 assert.match(story,/accessibilityLabel="Legenda da Story"/);
 assert.ok(story.indexOf('storyCaptionBlock')<story.indexOf('storyStyleOpen?<View'));
 assert.ok(story.indexOf('storyStyleOpen?<View')<story.indexOf('storyDetailsOpen?<View'));
 assert.match(story,/accessibilityState=\{\{expanded:storyStyleOpen\}\}/);
 assert.match(story,/accessibilityState=\{\{expanded:storyDetailsOpen\}\}/);
 assert.match(story,/Estilo e texto/);
 assert.match(story,/Localização, amigos e mais opções/);
});
test('advanced Story options retain tags, locations, audience and accessibility',()=>{
 const home=read('app/(tabs)/index.tsx');
 for(const token of ['storyMentionUsernames(storyTags)','storyPublishCommunityId!==null','verifiedStoryPlace','storyAltText','storyManagedCommunities.map','storyStylePanel','storyStyleOpen','storyDetailsOpen'])
  assert.ok(home.includes(token),'missing '+token);
 assert.match(home,/!storyDetailsOpen&&\(storyPublishCommunityId!==null\|\|storyPublishTeamId!==null\|\|storyLocation\.trim\(\)\|\|storyTags\.trim\(\)\)/);
 assert.match(home,/Selecio(?:na|ne) uma localização real|Seleciona uma localização real/);
 assert.match(home,/Escolhe uma fotografia ou um vídeo para publicares a Story/);
});
test('fresh Story sessions close optional panels and preserve upload safety',()=>{
 const home=read('app/(tabs)/index.tsx');
 const start=home.slice(home.indexOf('function openStoryComposer()'),home.indexOf('function changeComposerMedia('));
 assert.match(start,/setStoryStyleOpen\(false\);setStoryDetailsOpen\(false\)/);
 assert.match(start,/storyComposerRevision\.current\+\+/);
 assert.match(start,/if\(storyInFlight\.current\)return/);
 assert.match(home,/disabled=\{!storyMedia\|\|storyPublishing\|\|!storyRetryAcknowledged\}/);
 assert.match(home,/storyCaptionRef\.current=value;setStoryCaption\(value\)/);
 assert.match(home,/storyInFlight\.current=true;setStoryPublishing\(true\)/);
});
