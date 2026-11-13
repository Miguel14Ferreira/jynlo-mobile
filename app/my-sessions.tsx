import React,{useCallback,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page,SessionCard} from '../src/components/UI';
import {mySessions} from '../src/lib/parity-api';
import {useAuth} from '../src/lib/auth';
import {C} from '../src/lib/theme';
import type {MySessions,SessionSummary} from '../src/lib/types';
import {organizeMySessions} from '../src/lib/my-sessions-core.cjs';
export default function MySessionsScreen(){
 const auth=useAuth(),router=useRouter();const [data,setData]=useState<MySessions>({created:[],joined:[],waitlisted:[]});
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const generation=useRef(0);
 const load=useCallback(async()=>{
  const requestId=++generation.current;
  // Do not retain another account's roster while loading or after sign-out.
  setData({created:[],joined:[],waitlisted:[]});setError('');
  if(!auth.token||!auth.username){setLoading(false);return;}
  setLoading(true);
  try{
   const next=await mySessions(auth.token,auth.username);
   if(requestId===generation.current)setData(next);
  }catch(e){
   if(requestId===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar as sessões.');
  }finally{
   if(requestId===generation.current)setLoading(false);
  }
 },[auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  void load();
  return()=>{generation.current++;setData({created:[],joined:[],waitlisted:[]});};
 },[load]));
 const open=(s:SessionSummary)=>router.push({pathname:'/sessions/[id]',params:{id:String(s.id)}});
 const [showHistory,setShowHistory]=useState(false);
 const sections=organizeMySessions(data);
 const upcomingCount=sections.upcoming.reduce((sum,section)=>sum+section.items.length,0);
 const historyCount=sections.history.reduce((sum,section)=>sum+section.items.length,0);
 return <Page><Brand subtitle="A TUA ATIVIDADE"/><DemoBanner/><Eyebrow>MINHAS SESSÕES</Eyebrow>
 <Text style={styles.heading}>Os teus próximos <Text style={{color:C.mint}}>desafios.</Text></Text>
 <Button title="Criar sessão" onPress={()=>auth.token?router.push('/sessions/create'):router.push({pathname:'/login',params:{redirect:'/sessions/create'}})}/>
 {!auth.token?<><Message>Estás a explorar como visitante. Inicia sessão para consultares as sessões que criaste, confirmaste ou em que aguardas vaga.</Message>
   <Button title="Iniciar sessão" onPress={()=>router.push({pathname:'/login',params:{redirect:'/my-sessions'}})}/></>:null}
 {loading?<Loader/>:null}{error?<View style={styles.errorSection}><Message tone="error">{error}</Message><Button title="Tentar carregar novamente" secondary disabled={loading} onPress={()=>{void load();}}/></View>:null}
 {!loading&&!error&&auth.token?<View style={styles.group}>
  <Text style={styles.groupTitle}>Próximas sessões · {upcomingCount}</Text>
  {upcomingCount===0?<Text style={styles.empty}>Não tens sessões futuras. Podes criar uma nova ou procurar uma atividade.</Text>:null}
  {sections.upcoming.filter(section=>section.items.length>0).map(section=><View style={styles.section} key={section.title}>
    <Text style={styles.sectionTitle}>{section.title} · {section.items.length}</Text>
    {section.items.map(item=><SessionCard key={item.id} session={item} onPress={()=>open(item)}/>)}
  </View>)}
  <Pressable accessibilityRole="button" accessibilityLabel={showHistory?'Ocultar histórico de sessões':'Mostrar histórico de sessões'}
    accessibilityState={{expanded:showHistory}} onPress={()=>setShowHistory(v=>!v)} style={styles.historyToggle}>
    <Text style={styles.historyText}>{showHistory?'Ocultar histórico':'Ver histórico'} · {historyCount} <Text>{showHistory?'⌃':'⌄'}</Text></Text>
  </Pressable>
  {showHistory?<View style={styles.group}>
    {historyCount===0?<Text style={styles.empty}>Ainda não tens sessões anteriores ou canceladas.</Text>:null}
    {sections.history.filter(section=>section.items.length>0).map(section=><View style={styles.section} key={section.title}>
      <Text style={styles.sectionTitle}>{section.title} · {section.items.length}</Text>
      {section.items.map(item=><SessionCard key={item.id} session={item} onPress={()=>open(item)}/>)}
    </View>)}
  </View>:null}
 </View>:null}
 {auth.token?<Message>Consulta as sessões futuras e o histórico. Abre uma sessão para gerir a presença, os convites e as equipas. O histórico de assiduidade individual continua pendente.</Message>:null}
 </Page>
}
const styles=StyleSheet.create({heading:{color:C.white,fontWeight:'900',fontSize:28},group:{gap:16},groupTitle:{color:C.white,fontSize:21,fontWeight:'900'},section:{gap:13},sectionTitle:{color:C.white,fontWeight:'800',fontSize:17},empty:{color:C.muted,paddingVertical:8},errorSection:{gap:10},historyToggle:{minHeight:48,justifyContent:'center',alignItems:'center',paddingHorizontal:16,backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:14},historyText:{color:C.mint,fontWeight:'800',fontSize:14}});
