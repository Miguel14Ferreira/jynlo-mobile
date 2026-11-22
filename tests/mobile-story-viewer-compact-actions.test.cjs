const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const home=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8'));
const viewer=home.slice(home.indexOf('function StoryViewer('),home.indexOf('export default function JynloFeedHome()'));

test('Story viewer keeps private reactions collapsed until requested',()=>{
 assert.match(viewer,/const \[reactionsOpen,setReactionsOpen\]=useState\(false\)/);
 assert.match(viewer,/accessibilityState=\{\{expanded:reactionsOpen\}\}/);
 assert.match(viewer,/reactionsOpen\?<View style=\{styles\.storyReactionRow\}>/);
 assert.match(viewer,/setReactionsOpen\(false\);setMediaState\('loading'\)/);
 assert.match(viewer,/accessibilityLabel=\{reactionsOpen\?'Ocultar reações à Story':'Mostrar reações à Story'\}/);
 assert.match(viewer,/\['❤️','🔥','👏','😂','😮','⚽'\]\.map\(emoji=>/);
 assert.match(viewer,/await replyToStory\(id,emoji,actor,username\)/);
});

test('private reaction tray pauses both image progress and native video playback',()=>{
 assert.match(viewer,/if\(!story\|\|story\.video\|\|mediaState!=='ready'\|\|paused\|\|replyFocused\|\|reactionsOpen/);
 assert.match(viewer,/paused=\{paused\|\|replyFocused\|\|reactionsOpen\|\|storyBusy/);
 assert.match(viewer,/if\(!reactionsOpen\)pauseProgress\(\);else setPaused\(false\)/);
 assert.match(viewer,/\[story\?\.id,story\?\.video,mediaState,paused,replyFocused,reactionsOpen/);
});

test('small phones prioritize Story media and use consistent icon actions',()=>{
 assert.match(viewer,/const \{height:viewerHeight\}=useWindowDimensions\(\)/);
 // The progress bars already say which Story this is: no counter or gesture hint line.
 assert.doesNotMatch(viewer,/Toca para avançar/);
 assert.match(viewer,/!ownStory&&viewerHeight>=720\?<Text style=\{styles\.storyReplyHint\}>/);
 assert.match(viewer,/accessibilityLabel="Partilhar Story"/);
 assert.match(viewer,/<JynloIcon name="share" color=\{WHITE\} size=\{21\}\/>/);
 assert.match(viewer,/<JynloIcon name="send" size=\{21\} color=\{INDIGO\}\/>/);
 assert.match(viewer,/disabled=\{storyBusy\|\|!replyText\.trim\(\)\}/);
 assert.match(viewer,/accessibilityLabel="Ver quem viu esta Story"/);
});
