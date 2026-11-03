import React,{useCallback,useState} from 'react';
import {Pressable,RefreshControl,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Brand,DemoBanner,Eyebrow,Message,SessionCard,Loader} from '../../src/components/UI';
import {discoverSessions} from '../../src/lib/api';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import type {SessionSummary} from '../../src/lib/types';

const CHIPS=['Todas','Futebol','Voleibol','Karting'];
export default function DiscoverScreen(){
 const router=useRouter();const auth=useAuth();
 const [sessions,setSessions]=useState<SessionSummary[]>([]);
 const [sport,setSport]=useState('Todas');const [city,setCity]=useState('');
 const [availableOnly,setAvailableOnly]=useState(true);
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const load=useCallback(async()=>{
   setLoading(true);setError('');
   try{setSessions(await discoverSessions({sport:sport==='Todas'?'':sport,city,availableOnly},auth.token,auth.username||undefined));}
   catch(e){setSessions([]);setError(e instanceof Error?e.message:'Não foi possível carregar as sessões.');}
   finally{setLoading(false);}
 },[sport,city,availableOnly,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
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
     <Pressable style={styles.shortcut} onPress={()=>router.push('/my-sessions')} accessibilityRole="button"><Text style={styles.shortcutText}>✓ As minhas</Text></Pressable>
   </View>
   <TextInput style={styles.search} value={city} onChangeText={setCity} placeholder="⌖  Procurar por cidade…" placeholderTextColor={C.muted} autoCorrect={false} accessibilityLabel="Filtrar por cidade"/>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
     {CHIPS.map(item=><Pressable key={item} onPress={()=>setSport(item)} style={[styles.chip,sport===item&&styles.selected]}>
       <Text style={[styles.chipText,sport===item&&{color:C.background}]}>{item}</Text>
     </Pressable>)}
   </ScrollView>
   <Pressable style={styles.filter} onPress={()=>setAvailableOnly(!availableOnly)}>
     <View style={[styles.square,availableOnly&&styles.squareSelected]}><Text style={{color:C.background}}>{availableOnly?'✓':''}</Text></View>
     <Text style={{color:C.white}}>Apenas sessões com vagas</Text>
   </Pressable>
   <View style={styles.section}><Text style={styles.sectionTitle}>Sessões para ti</Text><Text style={styles.total}>{sessions.length} disponíveis</Text></View>
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
 shortcuts:{flexDirection:'row',gap:8},shortcut:{flex:1,alignItems:'center',paddingVertical:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:11},shortcutText:{fontSize:11,color:C.white,fontWeight:'800'},
 filter:{flexDirection:'row',alignItems:'center',gap:11},square:{width:21,height:21,borderWidth:1,borderColor:C.mint,borderRadius:6,alignItems:'center'},squareSelected:{backgroundColor:C.mint},
 section:{marginTop:6,flexDirection:'row',justifyContent:'space-between',alignItems:'baseline'},
 sectionTitle:{color:C.white,fontWeight:'800',fontSize:21},total:{color:C.muted,fontSize:12},
});
