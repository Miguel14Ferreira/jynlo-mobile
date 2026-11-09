'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('map and list use the same filtered discoverSessions response',()=>{
 const screen=read('app/(tabs)/explore.tsx');
 assert.ok(screen.includes("const [display,setDisplay]=useState<'map'|'list'>('list')"));
 assert.ok(screen.includes('discoverSessions({sport:sport||undefined,city:mapArea?undefined:debouncedCity,availableOnly,'));
 assert.ok(screen.includes("setDisplay('map')"));
 assert.ok(screen.includes("setDisplay('list')"));
 assert.ok(screen.includes("display==='map'?"));
 assert.ok(screen.includes('sessions.map(s=><SessionCard'));
});
test('pins only use real public coordinates, never inferred city or private-session positions',()=>{
 const screen=read('app/(tabs)/explore.tsx');
 for(const marker of [
  "session.privateGame!==true&&session.audience!=='COMMUNITY_ONLY'",
  "typeof session.latitude==='number'",
  "typeof session.longitude==='number'",
  'Number.isFinite(session.latitude)',
  'Number.isFinite(session.longitude)',
  'session.latitude>=-90&&session.latitude<=90',
  'session.longitude>=-180&&session.longitude<=180',
  'sessions.filter(validPin)',
  'mappedSessions.map(s=><Marker',
  'setSelectedPin(s.id)',
  "pathname:'/sessions/[id]'",
  'não mostramos pins aproximados nem moradas privadas'
 ])assert.ok(screen.includes(marker),marker);
 const types=read('src/lib/types.ts');
 assert.ok(types.includes('latitude?: number | null;'));
 assert.ok(types.includes('longitude?: number | null;'));
});
test('native map package is Expo SDK 58 compatible and uses OpenStreetMap tiles',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.dependencies['react-native-maps'],'1.29.11');
 const screen=read('app/(tabs)/explore.tsx');
 assert.ok(screen.includes("import MapView,{Marker,UrlTile} from 'react-native-maps'"));
 assert.ok(screen.includes('mapType="none"'));
 assert.ok(screen.includes('https://tile.openstreetmap.org/{z}/{x}/{y}.png'));
});

test('map-area search is explicit, bounded, cleared by city changes and shares sport/vacancy filters',()=>{
 const screen=read('app/(tabs)/explore.tsx');
 for(const text of [
  'onRegionChangeComplete={region=>{viewport.current=region;}}',
  'Pesquisar nesta área',
  'setMapArea({latitude:r.latitude,longitude:r.longitude,radiusKm})',
  'setMapArea(null)',
  'const updateCity=(value:string)=>{setCity(value);setMapArea(null);};',
  "sport:sport||undefined,city:mapArea?undefined:debouncedCity,availableOnly,",
  "...(mapArea?{...mapArea,sort:'distance' as const}:{})"
 ]) assert.ok(screen.includes(text),text);
 const api=read('src/lib/api.ts');
 for(const text of ["q.set('latitude'","q.set('longitude'","q.set('radiusKm'","filters.radiusKm>=5&&filters.radiusKm<=500","filters.sort==='distance'&&hasMapArea"])
  assert.ok(api.includes(text),text);
 const types=read('src/lib/types.ts');
 assert.ok(types.includes("radiusKm?: number; sort?: 'date' | 'distance'"));
});
