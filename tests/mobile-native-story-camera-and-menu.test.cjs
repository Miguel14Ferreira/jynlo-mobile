'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Story creation launches the device native camera without mounting a large CameraView',()=>{
 const src=read('src/components/StoryCameraCapture.tsx');
 assert.match(src,/ImagePicker\.launchCameraAsync\(/);
 assert.match(src,/requestCameraPermissionsAsync\(\)/);
 assert.match(src,/mediaTypes:\['images','videos'\]/);
 assert.match(src,/videoMaxDuration:30/);
 assert.doesNotMatch(src,/<CameraView|takePictureAsync|recordAsync/);
 assert.match(src,/const timer=setTimeout/);
 assert.match(src,/if\(!alive\.current\|\|result\.canceled/);
 assert.match(src,/size>0\?validateMedia\(mime,size,true\):null/);
 assert.match(src,/accessibilityLabel="Abrir galeria de fotografias e vídeos"/);
});
test('cancelled camera has accessible retry and gallery actions, never blank dark camera pane',()=>{
 const src=read('src/components/StoryCameraCapture.tsx');
 assert.match(src,/Abrir câmara do dispositivo/);
 assert.match(src,/Escolher da galeria/);
 assert.match(src,/return <View style=\{styles\.panel\}>/);
});
test('post actions menu respects Android bottom system navigation and scrolls all options',()=>{
 const src=read('app/(tabs)/index.tsx');
 const modal=src.split('<Modal visible={identityMatches&&!!postMenuItem}')[1]?.split('</Modal>')[0];
 assert.ok(modal);
 assert.match(modal,/<SafeAreaView edges=\{\['bottom'\]\} style=\{styles\.postMenuSafeArea\}>/);
 assert.match(modal,/<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator=\{false\}/);
 assert.match(modal,/accessibilityLabel="Cancelar opções da publicação"/);
 assert.match(modal,/accessibilityLabel="Fechar opções da publicação"/);
 assert.match(src,/maxHeight:Math.max\(220,Math.floor\(screenHeight\*\.72\)\)/);
});
