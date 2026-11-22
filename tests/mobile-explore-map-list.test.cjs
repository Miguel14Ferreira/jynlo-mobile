const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const screen=read('app/(tabs)/explore.tsx');
const native=read('src/components/SessionNativeMap.tsx');

test('map and list share actual filtered server sessions',()=>{
 assert.match(screen,/const \[display,setDisplay\]=useState<'map'\|'list'>\('list'\)/);
 assert.match(screen,/discoverSessions\(/);
 assert.match(screen,/setDisplay\('map'\)/);
 assert.match(screen,/setDisplay\('list'\)/);
 assert.match(screen,/<SessionNativeMap initialRegion=\{PORTUGAL\} sessions=\{mappedSessions\}/);
 assert.match(screen,/sessions\.map\(s=><SessionCard/);
});

test('public maps never infer private or approximate location',()=>{
 for(const expected of [
  "session.privateGame!==true&&session.audience!=='COMMUNITY_ONLY'",
  "typeof session.latitude==='number'",
  "typeof session.longitude==='number'",
  "Number.isFinite(session.latitude)",
  "sessions.filter(validPin)"
 ])assert.ok(screen.includes(expected),expected);
 assert.match(native,/sessions\.map\(s=><Marker/);
 assert.match(native,/onPress=\{\(\)=>onSelectSession\(s\.id\)\}/);
 assert.match(screen,/pathname:'\/sessions\/\[id\]'/);
});

test('Android map uses native Google tiles, never blocked OSM tile server',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.dependencies['react-native-maps'],'1.29.11');
 assert.match(native,/import MapView,\{Marker,PROVIDER_GOOGLE\} from 'react-native-maps'/);
 assert.match(native,/mapType="standard"/);
 assert.doesNotMatch(native,/UrlTile|tile\.openstreetmap\.org/);
 assert.match(screen,/nativeGoogleMapsConfigured===true/);
});

test('map-area filters remain explicit and geographically bounded',()=>{
 assert.match(screen,/onRegionChange=\{region=>\{viewport\.current=region;\}\}/);
 assert.match(screen,/radiusKm:Math\.max\(5,Math\.min\(500/);
 assert.match(screen,/setMapArea\(null\)/);
 const api=read('src/lib/api.ts');
 for(const expected of ["q.set('latitude'","q.set('longitude'","q.set('radiusKm'","filters.radiusKm>=5&&filters.radiusKm<=500"])
  assert.ok(api.includes(expected),expected);
});
