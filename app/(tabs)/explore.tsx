import React,{Suspense,lazy,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {Linking,Platform,Pressable,RefreshControl,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import Constants from 'expo-constants';
import type {Region} from 'react-native-maps';
import {useFocusEffect,useRouter,useLocalSearchParams} from 'expo-router';
import {useRefreshOnReconnect} from '../../src/lib/network-status';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Brand,DemoBanner,Eyebrow,Message,SessionCard,Loader} from '../../src/components/UI';
import {discoverSessions} from '../../src/lib/api';
import {SPORTS} from '../../src/lib/sports';
import {useAuth} from '../../src/lib/auth';
import {C,MobileTheme} from '../../src/lib/theme';
import type {SessionSummary} from '../../src/lib/types';
import OfflineSessionMap from '../../src/components/OfflineSessionMap';
import {JynloIcon,type JynloIconName} from '../../src/components/JynloIcon';
import {filterChoices} from '../../src/lib/session-level-core.cjs';
import {sportMatches,sportName} from '../../src/lib/sport-names.cjs';
import {ExploreEmpty} from '../../src/features/explore-empty';

// Keep the native map module out of startup; load it only when the map view is opened.
const SessionNativeMap=lazy(()=>import('../../src/components/SessionNativeMap'));
const PORTUGAL:Region={latitude:39.65,longitude:-8.0,latitudeDelta:6.0,longitudeDelta:4.5};
// Never instantiate the Android native map without a Google Maps SDK key.
const NATIVE_MAP_READY=Platform.OS!=='android'||Constants.expoConfig?.extra?.nativeGoogleMapsConfigured===true;
const validPin=(session:SessionSummary)=>session.privateGame!==true&&session.audience!=='COMMUNITY_ONLY'&&
 typeof session.latitude==='number'&&typeof session.longitude==='number'&&
 Number.isFinite(session.latitude)&&Number.isFinite(session.longitude)&&
 session.latitude>=-90&&session.latitude<=90&&session.longitude>=-180&&session.longitude<=180;
const POPULAR_SPORTS=['Futebol','Padel','Basquetebol','Voleibol','Karting','Corrida'] as const;
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT').trim();
const DISCOVER:{label:string;caption:string;icon:JynloIconName;href:string}[]=[
 {label:'Comunidades',caption:'Clubes e grupos',icon:'community',href:'/communities'},
 {label:'Torneios',caption:'Ligas e competições',icon:'tournament',href:'/tournaments'},
 {label:'Recintos',caption:'Campos e pavilhões',icon:'venue',href:'/venues'},
 {label:'Equipas',caption:'A tua e convites',icon:'championship',href:'/teams'},
 {label:'Pessoas',caption:'Quem joga perto',icon:'profile',href:'/people'},
 {label:'Diretos',caption:'Jogos em direto',icon:'video',href:'/live'},
];

export default function DiscoverScreen(){
 const router=useRouter();const auth=useAuth();
 const [sessions,setSessions]=useState<SessionSummary[]>([]);
 const [discoveredCustomSports,setDiscoveredCustomSports]=useState<string[]>([]);
 const [display,setDisplay]=useState<'map'|'list'>('list');
 const [selectedPin,setSelectedPin]=useState<number|null>(null);
 const viewport=useRef<Region>(PORTUGAL);
 const openMap=async()=>{
   // A native map currently crashes some signed Android APKs on first mount.
   // Use the system browser until the native map has passed device diagnostics.
   const pin=mappedSessions[0];
   const latitude=pin?.latitude??PORTUGAL.latitude;
   const longitude=pin?.longitude??PORTUGAL.longitude;
   // Launch the official Google Maps web viewer instead of relying on OSM volunteer tile servers.
   const url=`https://www.google.com/maps/@${latitude},${longitude},10z`;
   try{await Linking.openURL(url);}catch{setError(t('Não foi possível abrir o mapa no navegador. Consulta as sessões na lista.'));}
 };
 const [mapArea,setMapArea]=useState<{latitude:number;longitude:number;radiusKm:number}|null>(null);
 const mappedSessions=useMemo(()=>sessions.filter(validPin),[sessions]);
 const currentPin=useMemo(()=>mappedSessions.find(s=>s.id===selectedPin)||null,[mappedSessions,selectedPin]);
 const [sport,setSport]=useState(''),[sportQuery,setSportQuery]=useState('');
 const [sportPickerVisible,setSportPickerVisible]=useState(false);
 const [city,setCity]=useState(''),[debouncedCity,setDebouncedCity]=useState('');
 const updateCity=(value:string)=>{setCity(value);setMapArea(null);};
 // Opened from first steps (or a link) with a sport and/or city: start with those filters.
 const linked=useLocalSearchParams<{sport?:string;city?:string}>();
 useEffect(()=>{
  const nextSport=typeof linked.sport==='string'?linked.sport.trim():'';
  const nextCity=typeof linked.city==='string'?linked.city.trim().slice(0,80):'';
  if(nextSport&&SPORTS.includes(nextSport))setSport(nextSport);
  if(nextCity){setCity(nextCity);setDebouncedCity(nextCity);setMapArea(null);}
 },[linked.sport,linked.city]);
 const [availableOnly,setAvailableOnly]=useState(true);
 const [skillLevel,setSkillLevel]=useState<''|'BEGINNER'|'INTERMEDIATE'|'ADVANCED'>('');
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const loadVersion=useRef(0);
 useEffect(()=>{const timer=setTimeout(()=>setDebouncedCity(city.trim()),350);return()=>clearTimeout(timer);},[city]);
 const sportSuggestions=useMemo(()=>{
   const query=normalize(sportQuery);
   const all=[...SPORTS,...discoveredCustomSports];
   return (query?all.filter(name=>sportMatches(name,query)):all).slice(0,12);
 },[sportQuery,discoveredCustomSports]);
 const typedCustomSport=sportQuery.trim().replace(/\s+/g,' ');
 const canSearchCustomSport=typedCustomSport.length>=2&&typedCustomSport.length<=60
   &&/^[\p{L}\p{M}][\p{L}\p{M}\p{N} .&'’()/-]*$/u.test(typedCustomSport)
   &&!sportSuggestions.some(name=>normalize(name)===normalize(typedCustomSport));
 const chooseSport=(next:string)=>{setSport(next);setSportPickerVisible(false);setSportQuery('');};
 const load=useCallback(async()=>{
   const version=++loadVersion.current;
   setLoading(true);setError('');
   try{
     const next=await discoverSessions({sport:sport||undefined,city:mapArea?undefined:debouncedCity,availableOnly,
       ...(skillLevel?{skillLevel}:{}),
       ...(mapArea?{...mapArea,sort:'distance' as const}:{})},auth.token,auth.username||undefined);
     if(version===loadVersion.current){
       setSessions(next);setSelectedPin(null);
       const custom=next.map(session=>session.sport).filter(name=>name&&!SPORTS.includes(name));
       if(custom.length)setDiscoveredCustomSports(previous=>[...new Set([...previous,...custom])].slice(-40));
     }
   }catch(e){
     if(version===loadVersion.current){setSessions([]);setError(e instanceof Error?e.message:t('Não foi possível carregar as sessões.'));}
   }finally{if(version===loadVersion.current)setLoading(false);}
 },[sport,debouncedCity,mapArea,availableOnly,skillLevel,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();return()=>{loadVersion.current++;};},[load]));
 useRefreshOnReconnect(useCallback(()=>{void load();},[load]));
 return <SafeAreaView style={styles.page} edges={['top','left','right']}>
  <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
   refreshControl={<RefreshControl refreshing={loading&&sessions.length>0} onRefresh={()=>{void load();}} tintColor={C.mint}/>}
   showsVerticalScrollIndicator={false}>
   <Brand subtitle={t('ENCONTRA O TEU DESPORTO')}/>
   <DemoBanner/>
   <View style={styles.hero}>
     <Eyebrow>{t('O JOGO COMEÇA AQUI')}</Eyebrow>
     <Text maxFontSizeMultiplier={1.3} style={styles.headline}>{t('O teu próximo jogo.')}{'\n'}<Text style={{color:C.mint}}>{t('A tua próxima equipa.')}</Text></Text>
     <Text style={styles.sub}>{t('Descobre sessões abertas e encontra pessoas com quem jogar.')}</Text>
   </View>
   <Pressable accessibilityRole="search" accessibilityLabel={t('Pesquisar pessoas, comunidades, equipas, recintos e jogos')}
     onPress={()=>router.push('/search' as never)} style={styles.searchEntry}>
     <JynloIcon name="search" size={20} color={C.muted}/>
     <Text style={styles.searchEntryText} numberOfLines={1}>{t('Pesquisar pessoas, comunidades, recintos…')}</Text>
   </Pressable>
   {/* Communities and tournaments have no tab of their own: keep them one tap away. */}
   <View style={styles.discover} accessibilityLabel={t('Descobrir mais na Jynlo')}>
     {DISCOVER.map(item=><Pressable key={item.label} accessibilityRole="button" accessibilityLabel={t(item.label)+': '+t(item.caption)}
       onPress={()=>router.push(item.href as never)} style={styles.discoverTile}>
       <View style={styles.discoverHead}><JynloIcon name={item.icon} size={20} color={C.mint}/>
        <Text style={styles.discoverLabel} numberOfLines={2}>{t(item.label)}</Text></View>
       <Text style={styles.discoverCaption} numberOfLines={2}>{t(item.caption)}</Text>
     </Pressable>)}
   </View>
   <TextInput style={styles.search} value={city} onChangeText={updateCity} placeholder={t('Procurar por cidade…')} placeholderTextColor={C.muted} autoCorrect={false} accessibilityLabel={t('Filtrar por cidade')}/>
   {/* Full catalogue first (always visible), then the popular sports. */}
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:sportPickerVisible}}
       accessibilityLabel={t('Todos os desportos, {count} no total',{count:SPORTS.length})}
       onPress={()=>setSportPickerVisible(previous=>!previous)} style={[styles.chip,sportPickerVisible&&styles.selected]}>
       <Text style={[styles.chipText,sportPickerVisible&&{color:C.background}]}>{t('Desportos')} {sportPickerVisible?'⌃':'⌄'}</Text>
     </Pressable>
     {['',...POPULAR_SPORTS,...(sport&&!(POPULAR_SPORTS as readonly string[]).includes(sport)?[sport]:[])].map(item=><Pressable key={item||'Todas'} accessibilityRole="button"
       accessibilityState={{selected:sport===item}} onPress={()=>{setSportPickerVisible(false);chooseSport(item);}} style={[styles.chip,sport===item&&styles.selected]}>
       <Text style={[styles.chipText,sport===item&&{color:C.background}]}>{item?sportName(item):t('Todas')}</Text>
     </Pressable>)}
   </ScrollView>
   {sportPickerVisible?<View style={styles.sportResults}>
     <TextInput style={styles.search} value={sportQuery} onChangeText={setSportQuery}
       placeholder={t('Pesquisar modalidade…')} placeholderTextColor={C.muted} autoCapitalize="none"
       accessibilityLabel={t('Pesquisar todas as modalidades')} autoCorrect={false}/>
     <Pressable accessibilityRole="button" onPress={()=>chooseSport('')} style={styles.sportResult}>
       <Text style={styles.sportResultText}>{t('Todas as modalidades')}</Text>
     </Pressable>
     {sportSuggestions.map(name=><Pressable key={name} accessibilityRole="button" onPress={()=>chooseSport(name)} style={styles.sportResult}>
       <Text style={styles.sportResultText}>{sportName(name)}</Text>
     </Pressable>)}
     {canSearchCustomSport?<Pressable accessibilityRole="button"
       accessibilityLabel={t('Pesquisar sessões de {sport}',{sport:typedCustomSport})}
       onPress={()=>chooseSport(typedCustomSport)} style={styles.sportResult}>
       <Text style={styles.sportResultText}>{t('Pesquisar sessões de “{sport}”',{sport:typedCustomSport})}</Text>
     </Pressable>:null}
     {sportSuggestions.length===0&&!canSearchCustomSport?
       <Text style={styles.emptySport}>{t('Não encontrámos essa modalidade. Verifica o nome.')}</Text>:null}
     <Text style={styles.pickerHint}>{t('Pesquisa uma modalidade oficial ou uma sugerida pela comunidade.')}</Text>
   </View>:null}
   <Pressable accessibilityRole="checkbox" accessibilityState={{checked:availableOnly}} style={styles.filter} onPress={()=>setAvailableOnly(!availableOnly)}>
     <View style={[styles.square,availableOnly&&styles.squareSelected]}><Text style={{color:C.background}}>{availableOnly?'✓':''}</Text></View>
     <Text style={{color:C.white}}>{t('Apenas sessões com vagas')}</Text>
   </Pressable>
   <View style={styles.levelFilter} accessibilityLabel={t('Filtrar por nível')}>
     <Text style={styles.levelFilterLabel}>{t('🎯 Nível')}</Text>
     {filterChoices().map(choice=><Pressable key={choice.value||'any'} accessibilityRole="button"
       accessibilityState={{selected:skillLevel===choice.value}} onPress={()=>setSkillLevel(choice.value)}
       style={[styles.levelChip,skillLevel===choice.value&&styles.selected]}>
       <Text style={[styles.levelChipText,skillLevel===choice.value&&{color:C.background}]}>{t(choice.label)}</Text>
     </Pressable>)}
   </View>
   {(city.trim()||sport||!availableOnly||mapArea||skillLevel)?<Pressable accessibilityRole="button" accessibilityLabel={t('Limpar filtros de pesquisa')} style={styles.resetFilters} onPress={()=>{setCity('');setDebouncedCity('');setSport('');setSportQuery('');setSportPickerVisible(false);setAvailableOnly(true);setSkillLevel('');setMapArea(null);setDisplay('list');}}>
     <Text style={styles.resetFiltersText}>{t('Limpar filtros')}</Text><Text style={styles.resetFiltersIcon}>×</Text>
   </Pressable>:null}
   <View style={styles.section}><Text style={styles.sectionTitle}>{t('Encontrar jogos')}</Text><Text style={styles.total}>{loading?t('A pesquisar…'):(sessions.length===1?t('1 jogo encontrado'):t('{n} jogos encontrados',{n:sessions.length}))}</Text></View>
   <View style={styles.switcher}>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Ver sessões no mapa')} accessibilityState={{selected:display==='map'}}
       style={[styles.switchOption,display==='map'&&styles.switchSelected]} onPress={()=>setDisplay('map')}>
       <View style={{flexDirection:'row',alignItems:'center',gap:5}}><JynloIcon name="location" size={17} color={display==='map'?C.mint:C.muted}/><Text style={[styles.switchLabel,display==='map'&&styles.switchLabelSelected]}>{t('Mapa')}</Text></View>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Ver sessões em lista')} accessibilityState={{selected:display==='list'}}
       style={[styles.switchOption,display==='list'&&styles.switchSelected]} onPress={()=>setDisplay('list')}>
       <Text style={[styles.switchLabel,display==='list'&&styles.switchLabelSelected]}>{t('☷ Lista')}</Text>
     </Pressable>
   </View>
   {loading&&sessions.length===0?<Loader/>:null}
   {error?<View style={styles.retryPanel}>
     <Message tone="error">{error}</Message>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Repetir pesquisa de sessões')} style={styles.retryAction}
       disabled={loading} onPress={()=>{void load();}}>
       <JynloIcon name="search" size={18} color={C.background}/><Text style={styles.retryActionText}>{t('Tentar novamente')}</Text>
     </Pressable>
   </View>:null}
   {!loading&&!error&&sessions.length===0?<ExploreEmpty sport={sport} city={debouncedCity} loggedIn={Boolean(auth.token)} onReset={()=>{setCity('');setDebouncedCity('');setSport('');setSportQuery('');setSportPickerVisible(false);setAvailableOnly(true);setMapArea(null);setDisplay('list');}}/>:null}
   {display==='map'?<View style={styles.mapPanel}>
     {NATIVE_MAP_READY?<Suspense fallback={<Loader/>}>
       <SessionNativeMap initialRegion={PORTUGAL} sessions={mappedSessions}
         onRegionChange={region=>{viewport.current=region;}}
         onSelectSession={setSelectedPin}/>
     </Suspense>:<>
       <OfflineSessionMap sessions={mappedSessions} selectedId={selectedPin} onSelect={setSelectedPin}/>
       <Message>{t('Esta APK não tem o mapa Google configurado. Mostramos um esquema geográfico simplificado e seguro; o mapa com ruas requer uma APK com a chave da SDK Android.')}</Message>
     </>}
     {NATIVE_MAP_READY?<View style={styles.mapActions}>
       <Pressable accessibilityRole="button" accessibilityLabel={t('Pesquisar sessões nesta área do mapa')}
         style={styles.areaSearch} onPress={()=>{
           const r=viewport.current;
           if(![r.latitude,r.longitude,r.latitudeDelta,r.longitudeDelta].every(Number.isFinite)||
             Math.abs(r.latitude)>90||Math.abs(r.longitude)>180||r.latitudeDelta<=0||r.longitudeDelta<=0)return;
           const latKm=Math.abs(r.latitudeDelta)*111.2/2;
           const lonKm=Math.abs(r.longitudeDelta)*111.2*Math.max(0,Math.cos(r.latitude*Math.PI/180))/2;
           setMapArea({latitude:r.latitude,longitude:r.longitude,
             radiusKm:Math.max(5,Math.min(500,Math.ceil(Math.hypot(latKm,lonKm))))});
         }}>
         <View style={{flexDirection:'row',alignItems:'center',gap:6}}><JynloIcon name="search" size={17} color={C.background}/><Text style={styles.areaSearchText}>{t('Pesquisar nesta zona')}</Text></View>
       </Pressable>
       {mapArea?<Pressable accessibilityRole="button" style={styles.clearArea} onPress={()=>setMapArea(null)}>
         <Text style={styles.clearAreaText}>{t('Limpar zona')}</Text>
       </Pressable>:null}
     </View>:null}
     {mapArea?<Text style={styles.mapNotice}>{t('Pesquisa num raio aproximado de {km} km',{km:mapArea.radiusKm})}</Text>:null}
     <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir mapa no navegador')} style={styles.areaSearch} onPress={()=>{void openMap();}}>
       <View style={{flexDirection:'row',alignItems:'center',gap:6}}><JynloIcon name="location" size={17} color={C.background}/><Text style={styles.areaSearchText}>{t('Abrir Google Maps')}</Text></View>
     </Pressable>
     {!NATIVE_MAP_READY&&mappedSessions.length>0&&!currentPin?<Text style={styles.mapNotice}>{t('Toca num pino para consultar a sessão correspondente.')}</Text>:null}
     {currentPin?<View style={styles.pinCard}><SessionCard session={currentPin}
       onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(currentPin.id)}})}/></View>:null}
     <Text style={styles.mapNotice}>{t('{mapped} sessões com coordenadas públicas · {total} resultados',{mapped:mappedSessions.length,total:sessions.length})}</Text>
     {NATIVE_MAP_READY?<Text style={styles.mapNotice}>{t('Mapa Google · coordenadas fornecidas pelos organizadores')}</Text>:null}
     {sessions.length>0&&mappedSessions.length===0?<Message>{t('Estas sessões não têm coordenadas públicas. Consulta a vista Lista para ver todos os resultados.')}</Message>:null}
   </View>:sessions.map(s=><SessionCard key={s.id} session={s} onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(s.id)}})}/>)}
   {display==='map'&&sessions.length>mappedSessions.length?<Pressable accessibilityRole="button" onPress={()=>setDisplay('list')} style={styles.showList}><Text style={styles.showListText}>{t('Ver todas as sessões na lista →')}</Text></Pressable>:null}
  </ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 searchEntry:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:C.border,borderRadius:14,backgroundColor:C.surface,paddingHorizontal:14,minHeight:50},
 searchEntryText:{color:C.muted,fontSize:14,flex:1},
 discover:{flexDirection:'row',flexWrap:'wrap',gap:8},
 discoverTile:{flexBasis:'46%',flexGrow:1,minHeight:62,paddingHorizontal:12,paddingVertical:10,gap:3,justifyContent:'center',borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 discoverHead:{flexDirection:'row',alignItems:'center',gap:8},
 discoverLabel:{flexShrink:1,color:C.white,fontWeight:'900',fontSize:15},discoverCaption:{color:C.muted,fontSize:12},
 levelFilter:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
 levelFilterLabel:{color:C.white,fontWeight:'800',fontSize:14,marginRight:2},
 levelChip:{minHeight:38,paddingHorizontal:13,justifyContent:'center',borderRadius:19,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 levelChipText:{color:C.white,fontWeight:'800',fontSize:13},
 retryPanel:{gap:10},
 retryAction:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,minHeight:48,paddingHorizontal:16,borderRadius:12,backgroundColor:C.mint},
 retryActionText:{color:C.background,fontSize:14,fontWeight:'800'},
 page:{flex:1,backgroundColor:MobileTheme.colors.background},content:{paddingHorizontal:MobileTheme.spacing.lg,paddingTop:MobileTheme.spacing.lg,paddingBottom:42,gap:MobileTheme.spacing.lg},
 hero:{marginTop:4,gap:8},headline:{fontSize:28,lineHeight:35,color:C.white,fontWeight:'900',letterSpacing:-0.6},
 sub:{color:C.muted,lineHeight:21,fontSize:14},
 search:{borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:16,minHeight:54,paddingHorizontal:17,color:C.white,fontSize:15},
 chips:{gap:10,paddingVertical:3},chip:{minHeight:44,justifyContent:'center',paddingHorizontal:17,paddingVertical:10,borderRadius:26,backgroundColor:C.surface,borderWidth:1,borderColor:C.border},
 selected:{backgroundColor:C.mint,borderColor:C.mint},chipText:{fontSize:13,fontWeight:'800',color:C.white},
 destinationRow:{flexDirection:'row',alignItems:'stretch',gap:8},
 destinationShortcut:{flex:1,minWidth:0,minHeight:76,paddingVertical:10,paddingHorizontal:5,gap:7,alignItems:'center',justifyContent:'center',borderRadius:13,backgroundColor:MobileTheme.colors.surface,borderWidth:1,borderColor:MobileTheme.colors.border},
 destinationText:{color:MobileTheme.colors.text,fontSize:12,fontWeight:'800',textAlign:'center'},
 shortcuts:{gap:9},createShortcut:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:MobileTheme.colors.accent,borderRadius:MobileTheme.radius.lg,paddingHorizontal:16,minHeight:74},createShortcutSymbol:{fontSize:30,color:MobileTheme.colors.background,fontWeight:'700'},createShortcutTitle:{fontSize:16,fontWeight:'900',color:MobileTheme.colors.background},createShortcutSub:{fontSize:13,color:MobileTheme.colors.background,opacity:1,lineHeight:19},createShortcutArrow:{fontSize:29,color:MobileTheme.colors.background},venueShortcut:{minHeight:MobileTheme.touchTarget,flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:15,borderRadius:MobileTheme.radius.md,backgroundColor:MobileTheme.colors.surface,borderWidth:1,borderColor:MobileTheme.colors.border},venueShortcutText:{color:MobileTheme.colors.text,fontSize:13,fontWeight:'800'},venueShortcutArrow:{color:MobileTheme.colors.accent,fontSize:19},
 filterLabel:{fontSize:12,fontWeight:'900',letterSpacing:1.1,color:C.mint,marginTop:4},
 sportSelector:{height:52,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:14,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 sportSelectorText:{color:C.white,fontWeight:'800',fontSize:14},sportChevron:{fontSize:23,color:C.mint},
 sportResults:{borderWidth:1,borderColor:C.border,borderRadius:15,backgroundColor:C.surface,padding:10,gap:3},
 sportResult:{paddingVertical:11,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:C.border},
 sportResultText:{color:C.white,fontSize:13,fontWeight:'700'},
 emptySport:{color:C.muted,padding:12},
 pickerHint:{fontSize:13,color:C.muted,paddingVertical:8,paddingHorizontal:6},
 filter:{flexDirection:'row',alignItems:'center',gap:11},square:{width:21,height:21,borderWidth:1,borderColor:C.mint,borderRadius:6,alignItems:'center'},squareSelected:{backgroundColor:C.mint},
 resetFilters:{flexDirection:'row',alignSelf:'flex-start',gap:7,alignItems:'center',minHeight:MobileTheme.touchTarget,paddingHorizontal:13,borderWidth:1,borderColor:MobileTheme.colors.border,borderRadius:MobileTheme.radius.pill},resetFiltersText:{fontWeight:'800',fontSize:12,color:MobileTheme.colors.accent},resetFiltersIcon:{fontSize:18,color:MobileTheme.colors.accent},emptyPanel:{gap:12,padding:19,borderWidth:1,borderColor:MobileTheme.colors.border,borderRadius:MobileTheme.radius.lg,backgroundColor:MobileTheme.colors.surface},emptyTitle:{fontSize:17,fontWeight:'900',color:MobileTheme.colors.text},emptyDetail:{fontSize:13,lineHeight:20,color:MobileTheme.colors.muted},emptyReset:{alignSelf:'flex-start',backgroundColor:MobileTheme.colors.accent,borderRadius:MobileTheme.radius.md,minHeight:MobileTheme.touchTarget,justifyContent:'center',paddingHorizontal:15},emptyResetText:{color:MobileTheme.colors.background,fontWeight:'900',fontSize:12},section:{marginTop:6,flexDirection:'row',justifyContent:'space-between',alignItems:'baseline'},
 sectionTitle:{color:C.white,fontWeight:'800',fontSize:21},total:{color:C.muted,fontSize:12},
 switcher:{flexDirection:'row',gap:4,padding:5,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 switchOption:{flex:1,alignItems:'center',paddingVertical:12,borderRadius:12},
 switchSelected:{backgroundColor:C.mint},switchLabel:{color:C.white,fontWeight:'800',fontSize:15},switchLabelSelected:{color:C.background},
 mapActions:{flexDirection:'row',gap:9,alignItems:'center'},areaSearch:{flex:1,alignItems:'center',paddingVertical:12,borderRadius:12,backgroundColor:C.mint},areaSearchText:{fontWeight:'900',color:C.background},clearArea:{padding:12,borderRadius:12,borderColor:C.border,borderWidth:1},clearAreaText:{color:C.white,fontWeight:'800'},
 mapPanel:{gap:12},map:{height:430,borderRadius:14,overflow:'hidden'},mapNotice:{color:C.muted,fontSize:12},
 pinCard:{gap:8},showList:{padding:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:12,alignItems:'center'},
 showListText:{color:C.mint,fontWeight:'800'},
});
