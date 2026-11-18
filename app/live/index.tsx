import React,{useCallback,useRef,useState} from 'react';
import {AppState,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import {ensureLiveCapturePermissions} from '../../src/lib/live-capture-permissions';
import {observePersonalLives} from '../../src/lib/personal-live-realtime';
import {activePersonalLives,startPersonalLive,type PersonalLiveEvent} from '../../src/lib/personal-live-api';

export default function LivesScreen(){
 const auth=useAuth(),router=useRouter();
 const [items,setItems]=useState<PersonalLiveEvent[]>([]);
 const [title,setTitle]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const generation=useRef(0),starting=useRef(false);
 const refresh=useCallback(async(silent=false)=>{
  const version=++generation.current;
  if(!auth.token){setLoading(false);setItems([]);return;}
  if(!silent)setLoading(true);
  try{
   const list=await activePersonalLives(auth.token);
   if(version===generation.current)setItems(list.filter(item=>item.status==='LIVE'));
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível obter os diretos.');}
  finally{if(version===generation.current&&!silent)setLoading(false);}
 },[auth.token]);
 useFocusEffect(useCallback(()=>{
  void refresh();
  const stop=auth.token?observePersonalLives({token:auth.token,onInvalidated:()=>{if(AppState.currentState==='active'&&!starting.current)void refresh(true);}}):()=>{};
  // Low-frequency fallback while offline, rather than hammering the backend.
  const timer=setInterval(()=>{if(AppState.currentState==='active'&&!starting.current)void refresh(true);},30000);
  return()=>{generation.current++;clearInterval(timer);stop();};
 },[refresh]));
 const start=async()=>{
  if(!auth.token||starting.current||!title.trim())return;
  starting.current=true;setBusy(true);setError('');
  try{
   // Ask before creating a server LIVE event: a denied permission must never
   // leave behind a broadcast that viewers cannot actually watch.
   await ensureLiveCapturePermissions();
   const created=await startPersonalLive(auth.token,title);
   router.push({pathname:'/live/[id]',params:{id:String(created.id)}});
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível iniciar o direto.');}
  finally{starting.current=false;setBusy(false);}
 };
 return <Page>
  <Text style={styles.kicker}>JYNLO · EM DIRETO</Text>
  <Text style={styles.heading}>Lives</Text>
  <Text style={styles.note}>Assiste aos diretos da comunidade Jynlo ou inicia uma transmissão tua.</Text>
  {!auth.token?<Message>Inicia sessão para assistir e transmitir diretos.</Message>:<>
   <View style={styles.panel}>
    <Text style={styles.subtitle}>Iniciar um direto</Text>
    <TextInput value={title} onChangeText={setTitle} style={styles.input}
      editable={!busy} maxLength={120} placeholder="Ex.: O nosso treino de futsal"
      placeholderTextColor={C.muted} accessibilityLabel="Título do direto"/>
    <Text style={styles.note}>A transmissão só começa quando tocares em «Iniciar direto». Precisas de câmara e microfone.</Text>
    <Button title={busy?'A iniciar…':'Iniciar direto'} disabled={busy||!title.trim()} onPress={()=>void start()}/>
   </View>
   <View style={styles.panel}>
    <Text style={styles.subtitle}>A decorrer agora</Text>
    {loading?<Loader/>:null}
    {error?<Message tone="error">{error}</Message>:null}
    {!loading&&items.length===0?<Text style={styles.note}>Não há diretos ativos neste momento.</Text>:null}
    {items.map(item=><Pressable key={item.id} accessibilityRole="button"
      accessibilityLabel={'Assistir ao direto '+item.title+' de '+item.username}
      onPress={()=>router.push({pathname:'/live/[id]',params:{id:String(item.id)}})}
      style={styles.liveItem}>
      <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>● LIVE</Text></View>
      <View style={{flex:1,gap:5}}><Text style={styles.liveTitle} numberOfLines={2}>{item.title}</Text>
       <Text style={styles.note}>@{item.username}{item.canManage?' · O teu direto':''}</Text></View>
      <Text style={styles.watchText}>Ver ›</Text>
     </Pressable>)}
    <Button secondary title="Procurar novos diretos" onPress={()=>void refresh()} disabled={loading||busy}/>
   </View>
  </>}
 </Page>;
}
const styles=StyleSheet.create({
 kicker:{color:C.mint,fontSize:12,fontWeight:'900',letterSpacing:1},
 heading:{color:C.white,fontSize:28,fontWeight:'900'},
 note:{color:C.muted,fontSize:13,lineHeight:20},
 subtitle:{color:C.white,fontWeight:'900',fontSize:17},
 panel:{backgroundColor:C.surface,borderRadius:16,borderWidth:1,borderColor:C.border,padding:15,gap:12},
 input:{minHeight:50,borderColor:C.border,borderWidth:1,borderRadius:12,backgroundColor:C.background,color:C.white,paddingHorizontal:13},
 liveItem:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:C.border,borderRadius:12},
 liveBadge:{backgroundColor:'#603038',borderRadius:9,paddingHorizontal:7,paddingVertical:6},
 liveBadgeText:{color:'#ffc1c4',fontWeight:'900',fontSize:11},
 liveTitle:{color:C.white,fontWeight:'900',fontSize:14},
 watchText:{color:C.mint,fontWeight:'900'}
});
