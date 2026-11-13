'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const explore=read('app/(tabs)/explore.tsx');
const native=read('src/components/SessionNativeMap.tsx');

test('Explore no longer evaluates react-native-maps while loading tab routes',()=>{
 assert.doesNotMatch(explore,/^import (?!type).*from 'react-native-maps';/m);
 assert.match(explore,/const SessionNativeMap=lazy\(\(\)=>import\('\.\.\/\.\.\/src\/components\/SessionNativeMap'\)\)/);
 assert.match(explore,/\{NATIVE_MAP_READY\?<Suspense fallback=\{<Loader\/>\}>/);
 assert.match(explore,/<SessionNativeMap initialRegion=\{PORTUGAL\} sessions=\{mappedSessions\}/);
 assert.match(explore,/onRegionChange=\{region=>\{viewport\.current=region;\}\}/);
 assert.match(explore,/onSelectSession=\{setSelectedPin\}/);
});

test('native map implementation remains available only behind the lazy boundary',()=>{
 assert.match(native,/import MapView,\{Marker,PROVIDER_GOOGLE\} from 'react-native-maps'/);
 assert.doesNotMatch(native,/UrlTile|tile\.openstreetmap\.org/);
 assert.match(native,/sessions\.map\(s=><Marker/);
 assert.match(native,/onPress=\{\(\)=>onSelectSession\(s\.id\)\}/);
 assert.match(native,/onRegionChangeComplete=\{onRegionChange\}/);
 assert.match(explore,/const NATIVE_MAP_READY=Platform\.OS!=='android'\|\|Constants\.expoConfig\?\.extra\?\.nativeGoogleMapsConfigured===true/);
});

test('Android without Google Maps SDK remains usable through external map link',()=>{
 assert.match(explore,/https:\/\/www\.google\.com\/maps\/@/);
 assert.match(explore,/<OfflineSessionMap sessions=\{mappedSessions\}/);
 assert.match(explore,/Esta APK não tem o mapa Google configurado/);
 assert.doesNotMatch(explore,/!NATIVE_MAP_READY\?mappedSessions\.map/);
 assert.match(explore,/NATIVE_MAP_READY\?<Suspense/);
});
