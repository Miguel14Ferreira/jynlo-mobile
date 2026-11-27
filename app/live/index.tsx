import {resolveJynloMedia} from '../../src/lib/social-feed-api';
import React,{useCallback,useRef,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {AppState,Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
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
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:t('Não foi possível obter os diretos.'));}
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
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível iniciar o direto.'));}
  finally{starting.current=false;setBusy(false);}
 };
 return <Page>
  <Text style={styles.kicker}>{t('JYNLO · EM DIRETO')}</Text>
  <Text maxFontSizeMultiplier={1.3} style={styles.heading}>{t('Lives')}</Text>
  <Text style={styles.note}>{t('Assiste aos diretos da comunidade Jynlo ou inicia uma transmissão tua.')}</Text>
  {!auth.token?<Message>{t('Inicia sessão para assistir e transmitir diretos.')}</Message>:<>
   <View style={styles.panel}>
    <Text style={styles.subtitle}>{t('Iniciar um direto')}</Text>
    <TextInput value={title} onChangeText={setTitle} style={styles.input}
      editable={!busy} maxLength={120} placeholder={t('Ex.: O nosso treino de futsal')}
      placeholderTextColor={C.muted} accessibilityLabel={t('Título do direto')}/>
    <Text style={styles.note}>{t('A transmissão só começa quando tocares em «Iniciar direto». Precisas de câmara e microfone.')}</Text>
    <Button title={busy?t('A iniciar…'):t('Iniciar direto')} disabled={busy||!title.trim()} onPress={()=>void start()}/>
   </View>
   <View style={styles.panel}>
    <Text style={styles.subtitle}>{t('A decorrer agora')}</Text>
    {loading?<Loader/>:null}
    {error?<Message tone="error">{error}</Message>:null}
    {!loading&&items.length===0?<Text style={styles.note}>{t('Não há diretos ativos neste momento.')}</Text>:null}
    {items.map(item=><Pressable key={item.id} accessibilityRole="button"
      accessibilityLabel={t('Assistir ao direto {v} de {user}',{v:item.title,user:item.username})}
      onPress={()=>router.push({pathname:'/live/[id]',params:{id:String(item.id)}})}
      style={styles.liveItem}>
      <View style={styles.ring}>{resolveJynloMedia(item.avatarUrl)?<Image source={{uri:resolveJynloMedia(item.avatarUrl)!}} style={styles.avatar}/>
       :<View style={[styles.avatar,styles.avatarEmpty]}><Text style={styles.avatarLetter}>{item.username.charAt(0).toUpperCase()}</Text></View>}</View>
      <View style={{flex:1,gap:3,minWidth:0}}>
       <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>{t('AO VIVO')}</Text></View>
       <Text style={styles.liveTitle} numberOfLines={1}>{item.title}</Text>
       <Text style={styles.note} numberOfLines={1}>@{item.username} · {liveSince(item.startedAt)}{item.canManage?' · '+t('O teu direto'):''}</Text></View>
      <View style={styles.watch}><Text style={styles.watchText}>{t('Ver')} ▶</Text></View>
     </Pressable>)}
    <Button secondary title={t('Procurar novos diretos')} onPress={()=>void refresh()} disabled={loading||busy}/>
   </View>
  </>}
 </Page>;
}
function liveSince(startedAt:string){
 const ms=Date.now()-Date.parse(startedAt);
 if(!Number.isFinite(ms)||ms<60000)return t('agora mesmo');
 const min=Math.floor(ms/60000);
 return min<60?t('há {n} min',{n:min}):t('há {n} h',{n:Math.floor(min/60)});
}
const styles=StyleSheet.create({
 kicker:{color:C.mint,fontSize:12,fontWeight:'900',letterSpacing:1},
 heading:{color:C.white,fontSize:28,fontWeight:'900'},
 note:{color:C.muted,fontSize:13,lineHeight:20},
 subtitle:{color:C.white,fontWeight:'900',fontSize:17},
 panel:{backgroundColor:C.surface,borderRadius:16,borderWidth:1,borderColor:C.border,padding:15,gap:12},
 input:{minHeight:50,borderColor:C.border,borderWidth:1,borderRadius:12,backgroundColor:C.background,color:C.white,paddingHorizontal:13},
 liveItem:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:C.border,borderRadius:12},
 liveBadge:{alignSelf:'flex-start',backgroundColor:'#e11d48',borderRadius:4,paddingHorizontal:6,paddingVertical:1},
 liveBadgeText:{color:'#fff',fontWeight:'900',fontSize:10,letterSpacing:.6},
 ring:{width:50,height:50,borderRadius:25,borderWidth:2,borderColor:'#fb4b5d',alignItems:'center',justifyContent:'center'},
 avatar:{width:42,height:42,borderRadius:21},avatarEmpty:{backgroundColor:'#1d4d5c',alignItems:'center',justifyContent:'center'},
 avatarLetter:{color:'#fff',fontWeight:'900',fontSize:17},
 watch:{backgroundColor:C.mint,borderRadius:10,paddingHorizontal:12,paddingVertical:8},
 liveTitle:{color:C.white,fontWeight:'900',fontSize:14},
 watchText:{color:C.background,fontWeight:'900',fontSize:13}
});
