'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
const viewer=source.split('function StoryViewer(')[1]?.split('export default function JynloFeedHome()')[0];

test('inactive mobile app pauses story photo timer and native video, and prevents tapping ahead',()=>{
 assert.ok(viewer);
 assert.match(source,/import \{[^}]*AppState[^}]*\} from 'react-native'/);
 assert.match(viewer,/AppState\.addEventListener\('change',state=>\{/);
 assert.match(viewer,/setAppActive\(state==='active'\)/);
 assert.match(viewer,/if\(!story\|\|story\.video\|\|paused\|\|replyFocused\|\|storyBusy\|\|!appActive\)return/);
 assert.match(viewer,/story paused=\{paused\|\|replyFocused\|\|storyBusy\|\|!appActive\}/);
 assert.match(viewer,/if\(!activeGroup\|\|submittingStory\.current\|\|replyFocused\|\|!appActive\)return/);
});
test('viewer retains photo progress while sharing, replying or returning from background',()=>{
 assert.match(viewer,/progress\.stopAnimation\(value=>\{remaining\.current=Math\.max\(0,1-value\);\}\)/);
 assert.match(viewer,/const pauseProgress=\(\)=>\{/);
 assert.match(viewer,/const animation=Animated\.timing\(progress,\{toValue:1,duration:Math\.max\(50,6000\*remaining\.current\)/);
 assert.match(viewer,/submittingStory\.current=true;setStoryBusy\(true\);pauseProgress\(\)/);
 assert.match(viewer,/onFocus=\{\(\)=>\{progress\.stopAnimation/);
});
test('account switch immediately prevents old viewer and old groups rendering',()=>{
 assert.match(source,/const currentFeedIdentity=auth\.token&&auth\.username/);
 assert.match(source,/const identityMatches=feedIdentity\.current===currentFeedIdentity/);
 assert.match(source,/const visibleStoryViewer=identityMatches\?storyViewer:null/);
 assert.match(source,/const visibleStoryGroups=identityMatches\?storyGroups:\[\]/);
 assert.match(source,/<StoryViewer group=\{visibleStoryViewer\} groups=\{visibleStoryGroups\}/);
 assert.match(viewer,/if\(!group\|\|!activeGroup\|\|!story\)return null/);
});
