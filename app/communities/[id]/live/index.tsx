import React,{useCallback,useRef,useState} from 'react';
import {AppState,PermissionsAndroid,Platform,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {C} from '../../../src/lib/theme';
import {communityLiveCapabilities,communityLiveEvents,scheduleCommunityLive,startCommunityLive,
 type CommunityLiveCapabilities,type CommunityLiveEvent} from '../../../src/lib/community-live-api';

async function hostPermissions(){
 if(Platform.OS!=='android')return;
 const result=await PermissionsAndroid.requestMultiple([
  PermissionsAndroid.PERMISSIONS.CAMERA,PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
 ]);
 if(result[PermissionsAndroid.PERMISSIONS.CAMERA]!=='granted'||
    result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]!=='granted')
  throw Error('Autoriza a câmara e o microfone para começares a transmitir.');
}
export default function CommunityLivesScreen(){
 const {id:rawId}=useLocalSearchParams<{id:string}>(),id=Number(rawId);
 const auth=useAuth(),router=useRouter();
 const [caps,setCaps]=useState<CommunityLiveCapabilities|null>(null);
 const [events,setEvents]=useState<CommunityLiveEvent[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [title,setTitle]=useState(''),[description,setDescription]=useState('');
 const [scheduledAt,setScheduledAt]=useState('');
 const generation=useRef(0),inFlight=useRef(false);
 const load=useCallback(async(silent=false)=>{
  const version=++generation.current;
  if(!auth.token||!Number.isSafeInteger(id)||id<=0){setLoading(false);setError('Inicia sessão numa comunidade válida.');return;}
  if(!silent)setLoading(true);
  const [permissions,list]=await Promise.allSettled([
   communityLiveCapabilities(auth.token,id),communityLiveEvents(auth.token,id)]);
  if(generation.current!==version)return;
  if(permissions.status==='fulfilled')setCaps(permissions.value);
  else setError('Não foi possível confirmar o acesso aos diretos desta comunidade.');
  if(list.status==='fulfilled')setEvents(list.value);
  else setError('Não foi possível carregar os diretos. Confirma a tua participação na comunidade.');
  setLoading(false);
 },[id,auth.token]);
 useFocusEffect(useCallback(()=>{
  void load();
  const interval=setInterval(()=>{
   if(AppState.currentState==='active'&&!inFlight.current)void load(true);
  },15000);
  return()=>{generation.current++;clearInterval(interval);};
 },[load]));
 const run=async(task:()=>Promise<void>)=>{
  if(inFlight.current)return;
  inFlight.current=true;setBusy(true);setError('');
  try{await task();await load(true);}
  catch(e){setError(e instanceof Error?e.message:'Operação não concluída.');}
  finally{inFlight.current=false;setBusy(false);}
 };
 const open=(event:CommunityLiveEvent)=>
  router.push({pathname:'/communities/[id]/live/[eventId]',
   params:{id:String(id),eventId:String(event.id)}});
 const schedule=(goNow:boolean)=>{
  if(!auth.token||!caps?.canManage)return;
  void run(async()=>{
   if(goNow)await hostPermissions();
   const timestamp=goNow?new Date().toISOString():new Date(scheduledAt).toISOString();
   const event=await scheduleCommunityLive(auth.token!,id,title,description,timestamp);
   if(goNow){
    const active=await startCommunityLive(auth.token!,id,event.id);
    open(active);
   }else{setTitle('');setDescription('');setScheduledAt('');}
  });
 };
 const launch=(event:CommunityLiveEvent)=>{
  if(!auth.token||!caps?.canManage||!event.canManage)return;
  void run(async()=>{
   await hostPermissions();
   const active=await startCommunityLive(auth.token!,id,event.id);
   open(active);
  });
 };
 return <Page>
  <Text style={styles.eyebrow}>JYNLO · COMUNIDADES</Text>
  <Text style={styles.heading}>Diretos da comunidade</Text>
  <Text style={styles.muted}>Transmissões de jogos, treinos e momentos da comunidade.</Text>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {caps&&!caps.enabled?<Message>Os diretos estão temporariamente indisponíveis nesta comunidade.</Message>:null}
  {caps?.enabled?<View style={styles.panel}>
   <Text style={styles.subtitle}>Transmissões</Text>
   {events.length===0?<Text style={styles.muted}>Ainda não há diretos nesta comunidade.</Text>:null}
   {events.map(event=><View key={event.id} style={styles.event}>
    <Text style={styles.eventTitle}>{event.status==='LIVE'?'● LIVE':event.status==='SCHEDULED'?'Agendado':'Terminado'} · {event.title}</Text>
    <Text style={styles.muted}>{new Date(event.scheduledAt).toLocaleString('pt-PT')}</Text>
    {event.description?<Text style={styles.muted}>{event.description}</Text>:null}
    {event.status==='LIVE'?<Button secondary title={event.canManage?'Entrar como apresentador':'Assistir'}
      disabled={busy} onPress={()=>open(event)}/>:null}
    {event.status==='SCHEDULED'&&caps.canManage&&event.canManage?<Button
      title="Iniciar direto" disabled={busy} onPress={()=>launch(event)}/>:null}
   </View>)}
   <Button secondary title="Verificar diretos" disabled={loading||busy} onPress={()=>void load()}/>
  </View>:null}
  {caps?.enabled&&caps.canManage?<View style={styles.panel}>
   <Text style={styles.subtitle}>Organizar um direto</Text>
   <Text style={styles.muted}>Só o proprietário da comunidade pode iniciar uma transmissão.</Text>
   <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={120} editable={!busy}
     placeholder="Título da transmissão" placeholderTextColor={C.muted} accessibilityLabel="Título do direto da comunidade"/>
   <TextInput style={[styles.input,styles.description]} multiline value={description} onChangeText={setDescription}
     maxLength={1000} editable={!busy} placeholder="Descrição (opcional)"
     placeholderTextColor={C.muted} accessibilityLabel="Descrição do direto"/>
   <Text style={styles.muted}>Data e hora para agendar (AAAA-MM-DD HH:mm)</Text>
   <TextInput style={styles.input} value={scheduledAt} onChangeText={setScheduledAt}
     editable={!busy} placeholder="2026-11-25 20:00" placeholderTextColor={C.muted}
     accessibilityLabel="Data e hora do direto"/>
   <Button secondary title="Agendar transmissão" disabled={busy||!title.trim()||!scheduledAt.trim()}
     onPress={()=>schedule(false)}/>
   <Button title="● Entrar em direto agora" disabled={busy||events.some(e=>e.status==='LIVE')}
     onPress={()=>schedule(true)}/>
  </View>:null}
 </Page>;
}
const styles=StyleSheet.create({
 eyebrow:{color:C.mint,fontWeight:'900',fontSize:12,letterSpacing:1.1},
 heading:{color:C.white,fontSize:26,fontWeight:'900'},
 subtitle:{color:C.white,fontSize:18,fontWeight:'900'},
 muted:{color:C.muted,fontSize:13,lineHeight:20},
 panel:{gap:11,padding:15,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 event:{gap:8,borderBottomWidth:1,borderBottomColor:C.border,paddingBottom:12},
 eventTitle:{fontWeight:'900',fontSize:15,color:C.white},
 input:{minHeight:48,color:C.white,padding:11,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.background},
 description:{minHeight:75,textAlignVertical:'top'}
});
