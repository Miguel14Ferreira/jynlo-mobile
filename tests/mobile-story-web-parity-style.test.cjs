const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>untranslate(fs.readFileSync(path,'utf8'));

test('mobile Story editor exposes same color background and fonts as web',()=>{
 const editor=read('app/(tabs)/index.tsx');
 for(const name of ["['white','Branco']","['black','Preto']","['yellow','Amarelo']","['mint','Verde']","['pink','Rosa']","['blue','Azul']","['none','Sem fundo']","['classic','Clássica']","['mono','Monoespaçada']"]){
  assert.ok(editor.includes(name),name);
 }
 assert.match(editor,/const \[storyAppearance,setStoryAppearance\]=useState<StoryTextAppearance>/);
 assert.match(editor,/StoryTextPlacement caption=\{storyCaption\.trim\(\)\} geometry=\{storyTextGeometry\} appearance=\{storyAppearance\}/);
 assert.match(editor,/appearance=\{\{color:story\.textColor\|\|'white',background:story\.textBackground\|\|'dark',font:story\.textFont\|\|'modern'\}\}/);
});

test('Story colors survive publication and are sent in the backend contract',()=>{
 const editor=read('app/(tabs)/index.tsx');
 const api=read('src/lib/social-feed-api.ts');
 const types=read('src/lib/types.ts');
 assert.match(editor,/publishStory\(body,media,actor,username,selectedCommunityId,geometry,details,appearance,showTime,altText,selectedTeamId\)/);
 assert.match(editor,/storyAppearance\.color===appearance\.color&&storyAppearance\.background===appearance\.background&&storyAppearance\.font===appearance\.font/);
 assert.match(api,/textColor:appearance\.color,textBackground:appearance\.background,textFont:appearance\.font/);
 assert.match(api,/textColor:appearance\?\.color\|\|'white'/);
 assert.match(types,/textColor\?:StoryTextColor\|null/);
 assert.match(types,/export interface StoryTextAppearance/);
});

test('Story sticker applies appearance in the preview and viewer, not just the editor',()=>{
 const text=read('src/components/StoryTextPlacement.tsx');
 assert.match(text,/appearance\?:StoryTextAppearance/);
 assert.match(text,/backgroundColor:background/);
 assert.match(text,/style=\{\[styles\.captionText,\{color,fontFamily\}\]\}/);
 assert.match(text,/appearance\?\.font==='classic'/);
 assert.match(text,/appearance\?\.background==='none'/);
});

test('show-time sticker is optional and persisted with Story data',()=>{
 const editor=read('app/(tabs)/index.tsx');
 const viewer=read('src/components/StoryDetailsView.tsx');
 const api=read('src/lib/social-feed-api.ts');
 assert.match(editor,/accessibilityState=\{\{checked:showStoryTime\}\}/);
 assert.match(editor,/showTime=\{showStoryTime\} createdAt=\{storyEditorOpenedAt\}/);
 assert.match(editor,/showTime=\{story\.showTime===true\} createdAt=\{story\.createdAt\}/);
 assert.match(api,/showTime:String\(showTime\)/);
 assert.match(viewer,/toLocaleString\('pt-PT'/);
});

test('Story accessibility metadata can be edited and uploaded independently of visual caption',()=>{
 const editor=read('app/(tabs)/index.tsx');
 const api=read('src/lib/social-feed-api.ts');
 assert.match(editor,/accessibilityLabel="Descrição acessível da Story"/);
 assert.match(editor,/maxLength=\{350\} multiline/);
 assert.match(editor,/accessibilityLabel=\{story\.altText\|\|story\.caption/);
 assert.match(api,/altText\.trim\(\)\.length>350/);
 assert.match(api,/\.\.\.\(altText\.trim\(\)\?\{altText:altText\.trim\(\)\}:\{\}\)/);
});
