'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/sessions/create.tsx'),'utf8');

test('community preselection is specific to the account and source community',()=>{
 assert.match(source,/const communityLoadVersion=useRef\(0\),communityLoadIdentity=useRef\(''\)/);
 assert.match(source,/communityLoadIdentity\.current!==identity/);
 assert.match(source,/preselectionApplied\.current=false/);
 assert.match(source,/setCommunityMode\('INDEPENDENT'\)/);
 assert.match(source,/setForm\(withPresetWhen\(emptySessionForm\(\)\)\)/);
 assert.match(source,/setCommunities\(\[\]\);setCommunityError\(''\);setCommunitySearch\(''\)/);
});

test('late community responses cannot overwrite the active session editor',()=>{
 assert.match(source,/const loadCommunities=useCallback\(async\(version=communityLoadVersion\.current\)=>/);
 assert.match(source,/if\(version!==communityLoadVersion\.current\)return/);
 assert.match(source,/const version=\+\+communityLoadVersion\.current/);
 assert.match(source,/return \(\)=>\{\s*communityLoadVersion\.current\+\+;venueSearchVersion\.current\+\+;/);
 assert.match(source,/if\(version===communityLoadVersion\.current\)\{/);
});

test('a community shortcut preselects a valid member community and its sport only',()=>{
 assert.match(source,/const chosen=groups\.find\(c=>c\.id===requestedCommunityId\)/);
 assert.match(source,/const sports=communitySports\(chosen\)/);
 assert.match(source,/sports\.includes\(params\.sport\)&&SPORTS\.includes\(params\.sport\)/);
 assert.match(source,/sports\.length===1/);
 assert.match(source,/communityId:chosen\.id/);
 assert.match(source,/communityRankingsEnabled:chosen\.rankingsEnabled/);
 assert.match(source,/Já não pertences a esta comunidade/);
});

test('session sport is checked against every selected community before review and submit',()=>{
 assert.match(source,/if\(selectedCommunity&&!communitySports\(selectedCommunity\)\.includes\(form\.sport\)\)/);
 assert.match(source,/sharedCommunities\.some\(c=>!communitySports\(c\)\.includes\(form\.sport\)\)/);
 assert.match(source,/A modalidade tem de pertencer a todas as comunidades selecionadas/);
 assert.match(source,/A modalidade tem de estar disponível em todas as comunidades selecionadas/);
});
test('changing community clears incompatible sport and venue selection',()=>{
 assert.match(source,/const sports=communitySports\(c\)/);
 assert.match(source,/sports\.includes\(prev\.sport\)\?prev\.sport/);
 assert.match(source,/sports\.length===1&&typeof sports\[0\]==='string'&&SPORTS\.includes\(sports\[0\]\)/);
 assert.match(source,/sport,venueId:null/);
 assert.match(source,/setVenueChosen\(null\);clearVenueSearch\(\)/);
});

test('stale confirmation alert cannot create a session for a different account or route',()=>{
 assert.match(source,/const createOperation=useRef\(0\)/);
 assert.match(source,/const identity=communityLoadIdentity\.current/);
 assert.match(source,/const version=communityLoadVersion\.current/);
 assert.match(source,/if\(locked\.current\|\|confirmedCreation\.current\|\|/);
 assert.match(source,/version!==communityLoadVersion\.current\|\|identity!==communityLoadIdentity\.current\)return/);
 assert.match(source,/const operation=\+\+createOperation\.current/);
 assert.match(source,/if\(operation!==createOperation\.current\|\|version!==communityLoadVersion\.current\|\|identity!==communityLoadIdentity\.current\)return/);
});
test('single POST lock is kept until pending creation settles after navigation',()=>{
 assert.match(source,/createOperation\.current\+\+;setBusy\(locked\.current\)/);
 assert.match(source,/setBusy\(locked\.current\);\s*const version=\+\+communityLoadVersion\.current/);
 assert.match(source,/locked\.current=true;setBusy\(true\)/);
 assert.match(source,/locked\.current=false;\s*setBusy\(false\)/);
 assert.match(source,/Verifica as tuas sessões antes de tentares novamente, para evitar duplicados/);
});
test('switching accounts invalidates stale venue search results',()=>{
 assert.match(source,/setVenueChosen\(null\);clearVenueSearch\(\)/);
 assert.match(source,/communityLoadVersion\.current\+\+;venueSearchVersion\.current\+\+/);
 assert.match(source,/if\(version!==venueSearchVersion\.current\)return/);
});

test('changing account or source community clears all previously entered session details',()=>{
 assert.match(source,/function emptySessionForm\(\):CreateSessionForm/);
 assert.match(source,/const \[form,setForm\]=useState<CreateSessionForm>\(emptySessionForm\)/);
 assert.match(source,/setForm\(withPresetWhen\(emptySessionForm\(\)\)\)/);
 assert.match(source,/setStep\(0\);setHasExistingPlayers\(false\)/);
 assert.match(source,/setSportSearch\(''\);setShowSportResults\(false\)/);
 assert.match(source,/setExtraDay\(''\);setExtraTime\(''\)/);
 assert.match(source,/setVenueQuery\(''\);setVenueCityQuery\(''\)/);
});
test('sports selector uses intersection of community sports, never unsupported sport',()=>{
 assert.match(source,/const availableSports=availableSessionSports\(/);
 assert.match(source,/availableSports\.filter\(s=>/);
 assert.match(source,/const allowed=availableSessionSports\(communities\.filter\(c=>next\.includes\(c\.id\)\),SPORTS\)/);
 assert.match(source,/const sport=allowed\.includes\(prev\.sport\)\?prev\.sport/);
 assert.match(source,/sport,venueId:null,privateGame:false/);
 assert.match(source,/Estas comunidades não têm modalidades em comum/);
});

test('manual community mode selection wins over a late shortcut response',()=>{
 assert.match(source,/const preselectionOverridden=useRef\(false\)/);
 assert.match(source,/requestedCommunityId&&!preselectionApplied\.current&&!preselectionOverridden\.current/);
 assert.match(source,/preselectionApplied\.current=false;\s*preselectionOverridden\.current=false/);
 assert.match(source,/onPress=\{\(\)=>\{preselectionOverridden\.current=true;if\(communityMode===mode\)return/);
 assert.match(source,/preselectionOverridden\.current=true;\s*if\(communityMode==='SINGLE'\)/);
});
test('preselected community cannot inherit an unsupported sport from a previous form',()=>{
 assert.match(source,/sport:chosenSport\|\|\(sports\.includes\(previous\.sport\)\?previous\.sport:''\)/);
});

test('confirmed session creation cannot be submitted twice after navigation fails',()=>{
 assert.match(source,/const confirmedCreation=useRef<\{id:number;identity:string\}\|null>\(null\)/);
 assert.match(source,/if\(step!==3\|\|locked\.current\|\|busy\|\|DEMO_MODE\|\|!auth\.token\|\|!auth\.username\|\|confirmedCreation\.current\)return/);
 assert.match(source,/if\(locked\.current\|\|confirmedCreation\.current\|\|/);
 assert.match(source,/confirmedCreation\.current=\{id:result\.id,identity\}/);
 assert.match(source,/setCreatedId\(result\.id\)/);
 assert.match(source,/title="Abrir sessão criada"/);
 assert.match(source,/confirmedCreation\.current=null;setCreatedId\(null\)/);
});
test('session create confirmation captures the actor identity before async callback',()=>{
 assert.match(source,/const actorToken=auth\.token,actorUsername=auth\.username/);
 assert.match(source,/createSessionWithPayload\(payload,actorToken,actorUsername\)/);
 assert.doesNotMatch(source,/createSessionWithPayload\(payload,auth\.token!,auth\.username!\)/);
});
