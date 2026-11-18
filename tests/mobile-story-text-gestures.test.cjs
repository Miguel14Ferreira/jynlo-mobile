'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Story text is draggable, pinch-zoomable and rotatable in native preview',()=>{
 const sticker=read('src/components/StoryTextPlacement.tsx');
 assert.match(sticker,/onStartShouldSetResponder/);
 assert.match(sticker,/onResponderMove=\{move\}/);
 assert.match(sticker,/now\.angle-initial\.angle/);
 assert.match(sticker,/now\.distance\/Math\.max\(1,initial\.distance\)/);
 assert.match(sticker,/100\*\(now\.centerX-initial\.centerX\)/);
 assert.match(sticker,/100\*\(now\.centerY-initial\.centerY\)/);
});
test('Story draft remembers geometry and published preview uses server geometry',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/setStoryTextGeometry/);
 assert.match(home,/StoryTextPlacement caption=\{storyCaption\.trim\(\)\}/);
 assert.match(home,/StoryTextPlacement caption=\{story\.caption\.trim\(\)\}/);
 assert.match(home,/publishStory\(body,media,actor,username,selectedCommunityId,geometry,details,appearance,showTime,altText\)/);
 assert.match(home,/const selectedCommunityId=storyPublishCommunityId/);
 assert.match(home,/!storyManagedCommunities\.some\(group=>group\.id===selectedCommunityId\)/);
 assert.match(home,/currentGeometry\.rotation===geometry\.rotation/);
});
test('Story upload uses backend-supported textX/Y, rotation and zoom',()=>{
 const api=read('src/lib/social-feed-api.ts');
 const types=read('src/lib/types.ts');
 assert.match(api,/textX:String\(geometry\.x\),textY:String\(geometry\.y\)/);
 assert.match(api,/textRotation:String\(geometry\.rotation\),textZoom:String\(geometry\.zoom\)/);
 assert.match(api,/geometry\.zoom<\.5\|\|geometry\.zoom>3/);
 assert.match(types,/export interface StoryTextGeometry/);
});
