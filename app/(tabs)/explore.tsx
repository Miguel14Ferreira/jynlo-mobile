import React,{Suspense,lazy,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Linking,Platform,Pressable,RefreshControl,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import Constants from 'expo-constants';
import type {Region} from 'react-native-maps';
import {useFocusEffect,useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Brand,DemoBanner,Eyebrow,Message,SessionCard,Loader} from '../../src/components/UI';
import {discoverSessions} from '../../src/lib/api';
import {SPORTS} from '../../src/lib/sports';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import type {SessionSummary} from '../../src/lib/types';

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
export default function DiscoverScreen(){
 const router=useRouter();const auth=useAuth();
 const [sessions,setSessions]=useState<SessionSummary[]>([]);
 const [display,setDisplay]=useState<'map'|'list'>('list');
 const [selectedPin,setSelectedPin]=useState<number|null>(null);
 const viewport=useRef<Region>(PORTUGAL);
 const openMap=async()=>{
   // A native map currently crashes some signed Android APKs on first mount.
   // Use the system browser until the native map has passed device diagnostics.
   const pin=mappedSessions[0];
   const latitude=pin?.latitude??PORTUGAL.latitude;
   const longitude=pin?.longitude??PORTUGAL.longitude;
   const url=`https://www.openstreetmap.org/#map=10/${latitude}/${longitude}`;
   try{await Linking.openURL(url);}catch{setError('Não foi possível abrir o mapa no navegador. Consulta as sessões na lista.');}
 };
 const [mapArea,setMapArea]=useState<{latitude:number;longitude:number;radiusKm:number}|null>(null);
 const mappedSessions=useMemo(()=>sessions.filter(validPin),[sessions]);
 const currentPin=useMemo(()=>mappedSessions.find(s=>s.id===selectedPin)||null,[mappedSessions,selectedPin]);
 const [sport,setSport]=useState(''),[sportQuery,setSportQuery]=useState('');
 const [sportPickerVisible,setSportPickerVisible]=useState(false);
 const [city,setCity]=useState(''),[debouncedCity,setDebouncedCity]=useState('');
 const updateCity=(value:string)=>{setCity(value);setMapArea(null);};
 const [availableOnly,setAvailableOnly]=useState(true);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const loadVersion=useRef(0);
 useEffect(()=>{const timer=setTimeout(()=>setDebouncedCity(city.trim()),350);return()=>clearTimeout(timer);},[city]);
 const sportSuggestions=useMemo(()=>{
   const query=normalize(sportQuery);
   return (query?SPORTS.filter(name=>normalize(name).includes(query)):SPORTS).slice(0,12);
 },[sportQuery]);
 const chooseSport=(next:string)=>{setSport(next);setSportPickerVisible(false);setSportQuery('');};
 const load=useCallback(async()=>{
   const version=++loadVersion.current;
   setLoading(true);setError('');
   try{
     const next=await discoverSessions({sport:sport||undefined,city:mapArea?undefined:debouncedCity,availableOnly,
       ...(mapArea?{...mapArea,sort:'distance' as const}:{})},auth.token,auth.username||undefined);
     if(version===loadVersion.current){setSessions(next);setSelectedPin(null);}
   }catch(e){
     if(version===loadVersion.current){setSessions([]);setError(e instanceof Error?e.message:'Não foi possível carregar as sessões.');}
   }finally{if(version===loadVersion.current)setLoading(false);}
 },[sport,debouncedCity,mapArea,availableOnly,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();return()=>{loadVersion.current++;};},[load]));
 return <SafeAreaView style={styles.page} edges={['top','left','right']}>
  <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
   refreshControl={<RefreshControl refreshing={loading&&sessions.length>0} onRefresh={()=>{void load();}} tintColor={C.mint}/>}
   showsVerticalScrollIndicator={false}>
   <Brand subtitle="ENCONTRA O TEU DESPORTO"/>
   <DemoBanner/>
   <View style={styles.hero}>
     <Eyebrow>O JOGO COMEÇA AQUI</Eyebrow>
     <Text style={styles.headline}>O teu próximo jogo.{'\n'}<Text style={{color:C.mint}}>A tua próxima equipa.</Text></Text>
     <Text style={styles.sub}>Descobre sessões abertas e encontra pessoas com quem jogar.</Text>
   </View>
   <View style={styles.shortcuts}>
     <Pressable style={styles.shortcut} onPress={()=>router.push('/feed')} accessibilityRole="button"><Text style={styles.shortcutText}>📰 Feed</Text></Pressable>
     <Pressable style={styles.shortcut} onPress={()=>router.push('/venues')} accessibilityRole="button"><Text style={styles.shortcutText}>📍 Recintos</Text></Pressable>
     <Pressable style={styles.shortcut} onPress={()=>router.push('/(tabs)/communities')} accessibilityRole="button"><Text style={styles.shortcutText}>🤝 Comunidades</Text></Pressable>
     <Pressable style={styles.shortcut} onPress={()=>auth.token?router.push('/sessions/create'):router.push({pathname:'/login',params:{redirect:'/sessions/create'}})} accessibilityRole="button"><Text style={styles.shortcutText}>＋ Criar sessão</Text></Pressable>
   </View>
   <TextInput style={styles.search} value={city} onChangeText={updateCity} placeholder="⌖  Procurar por cidade…" placeholderTextColor={C.muted} autoCorrect={false} accessibilityLabel="Filtrar por cidade"/>
   <Text style={styles.filterLabel}>MODALIDADE · {SPORTS.length} DESPORTOS</Text>
   <Pressable style={styles.sportSelector} accessibilityRole="button" accessibilityState={{expanded:sportPickerVisible}}
      onPress={()=>setSportPickerVisible(previous=>!previous)}>
     <Text style={styles.sportSelectorText}>{sport||'Todas as modalidades'}</Text>
     <Text style={styles.sportChevron}>{sportPickerVisible?'⌃':'⌄'}</Text>
   </Pressable>
   {sportPickerVisible?<View style={styles.sportResults}>
     <TextInput style={styles.search} value={sportQuery} onChangeText={setSportQuery}
       placeholder="Pesquisar modalidade…" placeholderTextColor={C.muted} autoCapitalize="none"
       accessibilityLabel="Pesquisar todas as modalidades" autoCorrect={false}/>
     <Pressable accessibilityRole="button" onPress={()=>chooseSport('')} style={styles.sportResult}>
       <Text style={styles.sportResultText}>Todas as modalidades</Text>
     </Pressable>
     {sportSuggestions.map(name=><Pressable key={name} accessibilityRole="button" onPress={()=>chooseSport(name)} style={styles.sportResult}>
       <Text style={styles.sportResultText}>{name}</Text>
     </Pressable>)}
     {sportSuggestions.length===0?<Text style={styles.emptySport}>Não encontrámos essa modalidade. Experimenta outra pesquisa.</Text>:null}
     <Text style={styles.pickerHint}>Escreve o nome para encontrares qualquer modalidade do catálogo.</Text>
   </View>:null}
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
     {['',...POPULAR_SPORTS].map(item=><Pressable key={item||'Todas'} accessibilityRole="button"
       accessibilityState={{selected:sport===item}} onPress={()=>chooseSport(item)} style={[styles.chip,sport===item&&styles.selected]}>
       <Text style={[styles.chipText,sport===item&&{color:C.background}]}>{item||'Todas'}</Text>
     </Pressable>)}
   </ScrollView>
   <Pressable style={styles.filter} onPress={()=>setAvailableOnly(!availableOnly)}>
     <View style={[styles.square,availableOnly&&styles.squareSelected]}><Text style={{color:C.background}}>{availableOnly?'✓':''}</Text></View>
     <Text style={{color:C.white}}>Apenas sessões com vagas</Text>
   </Pressable>
   <View style={styles.section}><Text style={styles.sectionTitle}>Encontrar jogos</Text><Text style={styles.total}>{loading?'A pesquisar…':`${sessions.length} encontradas`}</Text></View>
   <View style={styles.switcher}>
     <Pressable accessibilityRole="button" accessibilityLabel="Ver sessões no mapa" accessibilityState={{selected:display==='map'}}
       style={[styles.switchOption,display==='map'&&styles.switchSelected]} onPress={()=>setDisplay('map')}>
       <Text style={[styles.switchLabel,display==='map'&&styles.switchLabelSelected]}>⌖ Mapa</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel="Ver sessões em lista" accessibilityState={{selected:display==='list'}}
       style={[styles.switchOption,display==='list'&&styles.switchSelected]} onPress={()=>setDisplay('list')}>
       <Text style={[styles.switchLabel,display==='list'&&styles.switchLabelSelected]}>☷ Lista</Text>
     </Pressable>
   </View>
   {loading&&sessions.length===0?<Loader/>:null}
   {error?<Message tone="error">{error}</Message>:null}
   {!loading&&!error&&sessions.length===0?<Message>Não encontrámos sessões para estes filtros. Experimenta outra cidade ou modalidade.</Message>:null}
   {display==='map'?<View style={styles.mapPanel}>
     {NATIVE_MAP_READY?<Suspense fallback={<Loader/>}>
       <SessionNativeMap initialRegion={PORTUGAL} sessions={mappedSessions}
         onRegionChange={region=>{viewport.current=region;}}
         onSelectSession={setSelectedPin}/>
     </Suspense>:<Message>O mapa integrado requer configuração da Google Maps SDK nesta versão da aplicação. Para evitar encerramentos inesperados, podes abrir o mapa no navegador.</Message>}
     {NATIVE_MAP_READY?<View style={styles.mapActions}>
       <Pressable accessibilityRole="button" accessibilityLabel="Pesquisar sessões nesta área do mapa"
         style={styles.areaSearch} onPress={()=>{
           const r=viewport.current;
           if(![r.latitude,r.longitude,r.latitudeDelta,r.longitudeDelta].every(Number.isFinite)||
             Math.abs(r.latitude)>90||Math.abs(r.longitude)>180||r.latitudeDelta<=0||r.longitudeDelta<=0)return;
           const latKm=Math.abs(r.latitudeDelta)*111.2/2;
           const lonKm=Math.abs(r.longitudeDelta)*111.2*Math.max(0,Math.cos(r.latitude*Math.PI/180))/2;
           setMapArea({latitude:r.latitude,longitude:r.longitude,
             radiusKm:Math.max(5,Math.min(500,Math.ceil(Math.hypot(latKm,lonKm))))});
         }}>
         <Text style={styles.areaSearchText}>⌕ Pesquisar nesta zona</Text>
       </Pressable>
       {mapArea?<Pressable accessibilityRole="button" style={styles.clearArea} onPress={()=>setMapArea(null)}>
         <Text style={styles.clearAreaText}>Limpar zona</Text>
       </Pressable>:null}
     </View>:null}
     {mapArea?<Text style={styles.mapNotice}>Pesquisa num raio aproximado de {mapArea.radiusKm} km</Text>:null}
     <Pressable accessibilityRole="button" accessibilityLabel="Abrir OpenStreetMap no navegador" style={styles.areaSearch} onPress={()=>{void openMap();}}>
       <Text style={styles.areaSearchText}>⌖ Abrir OpenStreetMap</Text>
     </Pressable>
     {!NATIVE_MAP_READY?mappedSessions.map(s=><SessionCard key={s.id} session={s}
       onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(s.id)}})}/>):null}
     {NATIVE_MAP_READY&&currentPin?<View style={styles.pinCard}><SessionCard session={currentPin}
       onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(currentPin.id)}})}/></View>:null}
     <Text style={styles.mapNotice}>{mappedSessions.length} sessões com coordenadas públicas · {sessions.length} resultados</Text>
     <Text style={styles.mapNotice}>© OpenStreetMap contributors</Text>
     {sessions.length>0&&mappedSessions.length===0?<Message>Estas sessões não têm coordenadas públicas. Consulta a vista Lista para ver todos os resultados.</Message>:null}
   </View>:sessions.map(s=><SessionCard key={s.id} session={s} onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(s.id)}})}/>)}
   {display==='map'&&sessions.length>mappedSessions.length?<Pressable accessibilityRole="button" onPress={()=>setDisplay('list')} style={styles.showList}><Text style={styles.showListText}>Ver todas as sessões na lista →</Text></Pressable>:null}
  </ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:C.background},content:{padding:22,paddingBottom:42,gap:17},
 hero:{marginTop:7,gap:11},headline:{fontSize:31,lineHeight:39,color:C.white,fontWeight:'900',letterSpacing:-0.6},
 sub:{color:C.muted,lineHeight:21,fontSize:14},
 search:{borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:16,height:54,paddingHorizontal:17,color:C.white,fontSize:15},
 chips:{gap:10,paddingVertical:3},chip:{paddingHorizontal:17,paddingVertical:10,borderRadius:26,backgroundColor:C.surface,borderWidth:1,borderColor:C.border},
 selected:{backgroundColor:C.mint,borderColor:C.mint},chipText:{fontSize:13,fontWeight:'800',color:C.white},
 shortcuts:{flexDirection:'row',flexWrap:'wrap',gap:8},
 shortcut:{flexGrow:1,flexBasis:'45%',alignItems:'center',paddingVertical:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:11},
 shortcutText:{fontSize:12,color:C.white,fontWeight:'800'},
 filterLabel:{fontSize:10,fontWeight:'900',letterSpacing:1.1,color:C.mint,marginTop:4},
 sportSelector:{height:52,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:14,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 sportSelectorText:{color:C.white,fontWeight:'800',fontSize:14},sportChevron:{fontSize:23,color:C.mint},
 sportResults:{borderWidth:1,borderColor:C.border,borderRadius:15,backgroundColor:C.surface,padding:10,gap:3},
 sportResult:{paddingVertical:11,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:C.border},
 sportResultText:{color:C.white,fontSize:13,fontWeight:'700'},
 emptySport:{color:C.muted,padding:12},
 pickerHint:{fontSize:11,color:C.muted,paddingVertical:8,paddingHorizontal:6},
 filter:{flexDirection:'row',alignItems:'center',gap:11},square:{width:21,height:21,borderWidth:1,borderColor:C.mint,borderRadius:6,alignItems:'center'},squareSelected:{backgroundColor:C.mint},
 section:{marginTop:6,flexDirection:'row',justifyContent:'space-between',alignItems:'baseline'},
 sectionTitle:{color:C.white,fontWeight:'800',fontSize:21},total:{color:C.muted,fontSize:12},
 switcher:{flexDirection:'row',gap:4,padding:5,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 switchOption:{flex:1,alignItems:'center',paddingVertical:12,borderRadius:12},
 switchSelected:{backgroundColor:C.mint},switchLabel:{color:C.white,fontWeight:'800',fontSize:15},switchLabelSelected:{color:C.background},
 mapActions:{flexDirection:'row',gap:9,alignItems:'center'},areaSearch:{flex:1,alignItems:'center',paddingVertical:12,borderRadius:12,backgroundColor:C.mint},areaSearchText:{fontWeight:'900',color:C.background},clearArea:{padding:12,borderRadius:12,borderColor:C.border,borderWidth:1},clearAreaText:{color:C.white,fontWeight:'800'},
 mapPanel:{gap:12},map:{height:430,borderRadius:14,overflow:'hidden'},mapNotice:{color:C.muted,fontSize:12},
 pinCard:{gap:8},showList:{padding:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:12,alignItems:'center'},
 showListText:{color:C.mint,fontWeight:'800'},
});
