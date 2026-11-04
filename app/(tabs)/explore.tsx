import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,RefreshControl,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Brand,DemoBanner,Eyebrow,Message,SessionCard,Loader} from '../../src/components/UI';
import {discoverSessions} from '../../src/lib/api';
import {SPORTS} from '../../src/lib/sports';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import type {SessionSummary} from '../../src/lib/types';

const POPULAR_SPORTS=['Futebol','Padel','Basquetebol','Voleibol','Karting','Corrida'] as const;
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT').trim();
export default function DiscoverScreen(){
 const router=useRouter();const auth=useAuth();
 const [sessions,setSessions]=useState<SessionSummary[]>([]);
 const [sport,setSport]=useState(''),[sportQuery,setSportQuery]=useState('');
 const [sportPickerVisible,setSportPickerVisible]=useState(false);
 const [city,setCity]=useState(''),[debouncedCity,setDebouncedCity]=useState('');
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
     const next=await discoverSessions({sport:sport||undefined,city:debouncedCity,availableOnly},auth.token,auth.username||undefined);
     if(version===loadVersion.current)setSessions(next);
   }catch(e){
     if(version===loadVersion.current){setSessions([]);setError(e instanceof Error?e.message:'Não foi possível carregar as sessões.');}
   }finally{if(version===loadVersion.current)setLoading(false);}
 },[sport,debouncedCity,availableOnly,auth.token,auth.username]);
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
     <Pressable style={styles.shortcut} onPress={()=>router.push('/(tabs)/tournaments')} accessibilityRole="button"><Text style={styles.shortcutText}>🏆 Torneios</Text></Pressable>
     <Pressable style={styles.shortcut} onPress={()=>auth.token?router.push('/sessions/create'):router.push({pathname:'/login',params:{redirect:'/sessions/create'}})} accessibilityRole="button"><Text style={styles.shortcutText}>＋ Criar sessão</Text></Pressable>
   </View>
   <TextInput style={styles.search} value={city} onChangeText={setCity} placeholder="⌖  Procurar por cidade…" placeholderTextColor={C.muted} autoCorrect={false} accessibilityLabel="Filtrar por cidade"/>
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
   <View style={styles.section}><Text style={styles.sectionTitle}>Sessões para ti</Text><Text style={styles.total}>{loading?'A pesquisar…':`${sessions.length} encontradas`}</Text></View>
   {loading&&sessions.length===0?<Loader/>:null}
   {error?<Message tone="error">{error}</Message>:null}
   {!loading&&!error&&sessions.length===0?<Message>Não encontrámos sessões para estes filtros. Experimenta outra cidade ou modalidade.</Message>:null}
   {sessions.map(s=><SessionCard key={s.id} session={s} onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(s.id)}})}/>)}
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
});
