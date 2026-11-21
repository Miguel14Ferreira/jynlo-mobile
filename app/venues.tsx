import React,{useCallback,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {venues} from '../src/lib/parity-api';
import {C} from '../src/lib/theme';
import {DEMO_MODE} from '../src/lib/api';
import {useAuth} from '../src/lib/auth';
import type {VenueSummary} from '../src/lib/types';
export default function VenuesScreen(){
 const router=useRouter();const auth=useAuth();const [city,setCity]=useState('');const [term,setTerm]=useState('');
 const [list,setList]=useState<VenueSummary[]>([]);const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const search=useCallback(async()=>{setLoading(true);setError('');setList([]);
  try{const result=await venues({name:term,city});setList(result.venues);}catch(e){setError(e instanceof Error?e.message:'Não foi possível pesquisar recintos.');}finally{setLoading(false);}
 },[term,city]);
 useFocusEffect(useCallback(()=>{void search();},[search]));
 return <Page><DemoBanner/><Eyebrow>RECINTOS DESPORTIVOS</Eyebrow>
 <Text maxFontSizeMultiplier={1.3} style={styles.heading}>Encontra o teu <Text style={{color:C.mint}}>próximo campo.</Text></Text>
 <TextInput value={term} onChangeText={setTerm} placeholder="Nome do recinto" placeholderTextColor={C.muted} style={styles.input}/>
 <TextInput value={city} onChangeText={setCity} placeholder="Cidade" placeholderTextColor={C.muted} style={styles.input}/>
 <Button title="Pesquisar recintos" onPress={()=>{void search();}}/>
 {auth.token&&!DEMO_MODE?<Button title="Sugerir novo recinto" secondary onPress={()=>router.push('/venues/create')}/>:
 <Message>Inicia sessão para sugerires novos recintos.</Message>}
 {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
 {!loading&&!error&&list.length===0?<Message>Não encontrámos recintos para estes filtros.</Message>:null}
 {list.map(v=><Pressable key={v.id} style={styles.card} onPress={()=>router.push({pathname:'/venues/[id]',params:{id:String(v.id)}})}>
   <Text style={styles.name}>{v.name}</Text><Text style={styles.meta}>⌖ {v.city} {v.district?`· ${v.district}`:''}</Text>
   <Text style={styles.meta}>{v.sports||'Modalidade não indicada'}</Text><Text style={styles.link}>Ver detalhes →</Text>
 </Pressable>)}
 <Message>Os novos recintos e as correções são analisados por moderadores antes de serem publicados.</Message>
 </Page>
}
const styles=StyleSheet.create({heading:{color:C.white,fontWeight:'900',fontSize:27},input:{height:52,borderRadius:15,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,paddingHorizontal:15,color:C.white},card:{backgroundColor:C.surface,padding:18,borderRadius:18,borderWidth:1,borderColor:C.border,gap:8},name:{color:C.white,fontSize:16,fontWeight:'900'},meta:{color:C.muted,fontSize:13},link:{color:C.mint,fontWeight:'800',marginTop:5}});
