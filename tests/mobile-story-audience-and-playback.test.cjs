'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const home=read('app/(tabs)/index.tsx');
const viewer=home.split('function StoryViewer(')[1]?.split('export default function JynloFeedHome()')[0]||'';

test('a Story never counts a mere feed impression or the author viewing own Story',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/export async function recordStoryView/);
 assert.match(api,/method:'POST',body:\{\}/);
 assert.match(viewer,/if\(!ownStory&&token&&username&&!viewedStoryIds\.current\.has\(story\.id\)\)/);
 assert.match(viewer,/onLoad=\{mediaReady\}/);
 assert.match(viewer,/onReady=\{mediaReady\}/);
 const feedOnly=api.split('export async function storyFeed(')[1]?.split('export async function ')[0]||'';
 assert.doesNotMatch(feedOnly,/recordStoryView\(/);
});

test('media viewer handles loading and a real failed image/video instead of blank black screen',()=>{
 const player=read('src/components/FeedVideo.tsx');
 assert.match(viewer,/mediaState==='loading'&&uri/);
 assert.match(viewer,/onError=\{\(\)=>setMediaState\('error'\)\}/);
 assert.match(viewer,/onPlaybackError=\{\(\)=>setMediaState\('error'\)\}/);
 assert.match(viewer,/Não foi possível mostrar esta Story/);
 assert.match(viewer,/accessibilityLabel="Voltar a carregar Story"/);
 assert.match(viewer,/storyById\(story\.id,token,username\)/);
 assert.match(viewer,/pointerEvents=\{mediaState==='error'\|\|!uri\|\|audienceOpen\?'none':'box-none'\}/);
 assert.match(player,/player\.addListener\('statusChange'/);
 assert.match(player,/videoFailed\?<View/);
 assert.match(player,/contentFit="contain"/);
 assert.match(viewer,/mediaState!=='ready'/);
 assert.match(viewer,/setTimeout\(\(\)=>setMediaState\(current=>current==='loading'\?'error':current\),12000\)/);
});

test('the author alone sees the real unique view count and user list',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/export async function storyAudience/);
 assert.match(api,/\/api\/stories\/\$\{storyId\}\/audience/);
 assert.match(api,/Number\.isSafeInteger\(result\?\.viewCount\)/);
 assert.match(viewer,/ownStory\?<Pressable accessibilityRole="button" accessibilityLabel="Ver quem viu esta Story"/);
 assert.match(viewer,/await storyAudience\(id,actor\)/);
 assert.match(viewer,/audience\?audience\.viewCount\+' visualizações':'Ver visualizações'/);
 assert.match(viewer,/storyAudiencePanel/);
 assert.match(viewer,/audience\?\.viewers\.map\(viewer=>/);
 assert.match(viewer,/router\.push\(\{pathname:'\/social\/\[username\]'/);
 assert.doesNotMatch(viewer,/setAudience\(\{viewCount:0/);
 assert.match(viewer,/activeStoryIdRef\.current=story\?\.id\?\?null/);
 assert.match(viewer,/audienceRequest\.current\+\+/);
 assert.match(viewer,/const stillCurrent=\(\)=>activeAccount\.current===actor&&activeStoryIdRef\.current===id&&/);
 assert.match(viewer,/audienceRequest\.current===requestId/);
});

test('reactions are private replies, never fabricated public emoji counts',()=>{
 assert.match(viewer,/\['❤️','🔥','👏','😂','😮','⚽'\]\.map\(emoji=>/);
 assert.match(viewer,/await replyToStory\(id,emoji,actor,username\)/);
 assert.match(viewer,/!ownStory\?<View style=\{styles\.storyReactions\}>/);
 assert.match(viewer,/if\(ownStory\|\|!token\|\|!username\|\|storyBusy\|\|submittingStory\.current\)return/);
});
