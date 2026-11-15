'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const configFactory=require('../app.config.js');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const base={name:'Jynlo',plugins:['expo-router'],extra:{example:true},android:{package:'com.jynlo.app'}};
const envName='JYNLO_GOOGLE_MAPS_ANDROID_API_KEY';
const previous=process.env[envName];
function withKey(key,fn){
 try{if(key==null)delete process.env[envName];else process.env[envName]=key;return fn();}
 finally{if(previous==null)delete process.env[envName];else process.env[envName]=previous;}
}
test('unconfigured Android build never marks native maps as safe',()=>withKey(null,()=>{
 const config=configFactory({config:base});
 assert.equal(config.extra.nativeGoogleMapsConfigured,false);
 assert.equal(config.plugins.some(p=>Array.isArray(p)&&p[0]==='react-native-maps'),false);
 assert.equal(config.extra.eas.projectId,'5628b5c4-513a-4b82-b0fb-7a50cace5cb6');
}));
test('key in build environment configures SDK and enables guarded native map',()=>withKey('AIza'+'a'.repeat(35),()=>{
 const config=configFactory({config:base});
 assert.equal(config.extra.nativeGoogleMapsConfigured,true);
 const plugin=config.plugins.find(p=>Array.isArray(p)&&p[0]==='react-native-maps');
 assert.equal(plugin[1].androidGoogleMapsApiKey,process.env[envName]);
 assert.equal(config.android.package,'com.jynlo.app');
}));
test('malformed key fails build configuration instead of shipping broken map',()=>withKey('bad',()=>{
 assert.throws(()=>configFactory({config:base}),/formato esperado/);
}));
test('explore screen prevents Android native MapView mount in unconfigured builds',()=>{
 const screen=source('app/(tabs)/explore.tsx');
 assert.match(screen,/nativeGoogleMapsConfigured===true/);
 assert.match(screen,/\{NATIVE_MAP_READY\?<Suspense/);
 assert.match(screen,/SessionNativeMap initialRegion=\{PORTUGAL\} sessions=\{mappedSessions\}/);
 assert.match(screen,/<OfflineSessionMap sessions=\{mappedSessions\}/);
 assert.match(screen,/Pesquisar nesta zona/);
 assert.match(screen,/OfflineSessionMap sessions=\{mappedSessions\}/);
});

test('EAS Android preview build explicitly reads the preview environment and real backend',()=>{
 const eas=JSON.parse(source('eas.json'));
 assert.equal(eas.build.preview.environment,'preview');
 assert.equal(eas.build.preview.distribution,'internal');
 assert.equal(eas.build.preview.android.buildType,'apk');
 assert.equal(eas.build.preview.env.JYNLO_REQUIRE_REAL_API,'1');
 assert.equal(eas.build.preview.env.EXPO_PUBLIC_JYNLO_API_URL,'https://desporto24-preview-api.onrender.com');
 assert.equal('JYNLO_GOOGLE_MAPS_ANDROID_API_KEY' in eas.build.preview.env,false);
});
