import React,{useCallback,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page,SessionCard} from '../src/components/UI';
import {mySessions} from '../src/lib/parity-api';
import {useAuth} from '../src/lib/auth';
import {C} from '../src/lib/theme';
import type {MySessions,SessionSummary} from '../src/lib/types';
export default function MySessionsScreen(){
 const auth=useAuth(),router=useRouter();const [data,setData]=useState<MySessions>({created:[],joined:[],waitlisted:[]});
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');setData({created:[],joined:[],waitlisted:[]});
  try{setData(await mySessions(auth.token,auth.username))}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar as sessões.')}finally{setLoading(false)};
 },[auth.token,auth.username]);useFocusEffect(useCallback(()=>{void load()},[load]));
 const open=(s:SessionSummary)=>router.push({pathname:'/sessions/[id]',params:{id:String(s.id)}});
 const owned=new Set(data.created.map(s=>s.id));
 const sections:[string,SessionSummary[]][]=[['Criadas por mim',data.created],['Vou participar',data.joined.filter(s=>!owned.has(s.id))],['Lista de espera',data.waitlisted.filter(s=>!owned.has(s.id))]];
 return <Page><Brand subtitle="A TUA ATIVIDADE"/><DemoBanner/><Eyebrow>MINHAS SESSÕES</Eyebrow>
 <Text style={styles.heading}>Os teus próximos <Text style={{color:C.mint}}>desafios.</Text></Text>
 <Button title="Criar sessão" onPress={()=>router.push('/sessions/create')}/>
 {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push({pathname:'/login',params:{redirect:'/my-sessions'}})}/>:null}
 {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
 {!loading&&!error?sections.map(([title,items])=><View style={styles.section} key={title}>
  <Text style={styles.sectionTitle}>{title} · {items.length}</Text>
  {items.length?items.map(item=><SessionCard key={item.id} session={item} onPress={()=>open(item)}/>):<Text style={styles.empty}>Sem sessões nesta categoria.</Text>}
 </View>):null}
 <Message>Aqui já mostramos as sessões criadas, confirmadas e em espera. Abre uma sessão para cancelar a tua presença ou, caso sejas organizador, gerir convites e cancelar a sessão. Histórico de assiduidade e disputas continuam pendentes.</Message>
 </Page>
}
const styles=StyleSheet.create({heading:{color:C.white,fontWeight:'900',fontSize:28},section:{gap:13},sectionTitle:{color:C.white,fontWeight:'800',fontSize:19},empty:{color:C.muted,paddingVertical:8}});
