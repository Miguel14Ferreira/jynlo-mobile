import React,{useCallback,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {myTournaments} from '../../src/lib/competition-api';
import {classificationKind,label} from '../../src/lib/competition-core.cjs';
import {C} from '../../src/lib/theme';
import type {JynloTournament} from '../../src/lib/types';
type Entry={communityId:number;communityName:string;tournament:JynloTournament};
export default function TournamentsScreen(){
 const auth=useAuth(),router=useRouter();const [items,setItems]=useState<Entry[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{
   if(!auth.token||!auth.username){setItems([]);setLoading(false);return;}
   setLoading(true);setError('');
   try{setItems(await myTournaments(auth.token,auth.username));}
   catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar os torneios.');}
   finally{setLoading(false);}
 },[auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 return <Page><Brand subtitle="A COMPETIÇÃO ACONTECE AQUI"/><DemoBanner/>
  <Eyebrow>ALÉM DA PRIMEIRA SESSÃO</Eyebrow><Text style={styles.title}>Torneios</Text>
  <Text style={styles.sub}>As competições das comunidades de que fazes parte, com classificação específica de cada modalidade.</Text>
  {!auth.token?<Button title="Entrar para ver torneios" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {!loading&&items.length===0?<Message>Ainda não existem torneios nas tuas comunidades. Junta-te a uma comunidade para os descobrires.</Message>:null}
  {items.map(x=><Pressable key={`${x.communityId}-${x.tournament.id}`}
    onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(x.communityId),id:String(x.tournament.id)}})}
    style={styles.card}>
    <View style={styles.row}><Text style={styles.sport}>{x.tournament.sport==='Karting'?'🏎️':'🏆'}</Text><View style={{flex:1}}><Text style={styles.name}>{x.tournament.name}</Text><Text style={styles.sub}>{x.communityName}</Text></View><Text style={styles.arrow}>›</Text></View>
    <Text style={styles.classification}>{label(classificationKind(x.tournament))}</Text>
    <Text style={styles.sub}>{x.tournament.status==='DRAFT'?'Em preparação':x.tournament.status==='IN_PROGRESS'?'A decorrer':'Concluído'} · {x.tournament.sport}</Text>
  </Pressable>)}
  <Message>Consulta de torneios nesta fase. A criação, calendário e gestão de resultados serão integrados depois de validarmos todos os formatos desportivos.</Message>
 </Page>;
}
const styles=StyleSheet.create({title:{fontSize:32,fontWeight:'900',color:C.white},sub:{fontSize:13,lineHeight:20,color:C.muted},card:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:19,padding:17,gap:12},
 row:{flexDirection:'row',alignItems:'center',gap:12},sport:{fontSize:27},name:{fontSize:17,fontWeight:'900',color:C.white},arrow:{fontSize:30,color:C.mint},classification:{color:C.mint,fontWeight:'800',fontSize:12}});
