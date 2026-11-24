import React,{useCallback,useEffect,useState} from 'react';
import {t} from '../src/lib/i18n';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {venues} from '../src/lib/parity-api';
import {C} from '../src/lib/theme';
import {DEMO_MODE} from '../src/lib/api';
import {useAuth} from '../src/lib/auth';
import type {VenueSummary} from '../src/lib/types';
import {acceptingVenues} from '../src/lib/venue-jynlo-api';
export default function VenuesScreen(){
 const router=useRouter();const auth=useAuth();const [city,setCity]=useState('');const [term,setTerm]=useState('');
 const [list,setList]=useState<VenueSummary[]>([]);const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [accepting,setAccepting]=useState<number[]>([]);
 useEffect(()=>{let alive=true;if(!DEMO_MODE)void acceptingVenues().then(ids=>{if(alive)setAccepting(ids);});return()=>{alive=false;};},[]);
 const search=useCallback(async()=>{setLoading(true);setError('');setList([]);
  try{const result=await venues({name:term,city});setList(result.venues);}catch(e){setError(e instanceof Error?e.message:t('Não foi possível pesquisar recintos.'));}finally{setLoading(false);}
 },[term,city]);
 useFocusEffect(useCallback(()=>{void search();},[search]));
 return <Page><DemoBanner/><Eyebrow>{t('RECINTOS DESPORTIVOS')}</Eyebrow>
 <Text maxFontSizeMultiplier={1.3} style={styles.heading}>{t('Encontra o teu')} <Text style={{color:C.mint}}>{t('próximo campo.')}</Text></Text>
 {accepting.length?<Pressable accessibilityRole="button" onPress={()=>router.push('/book-court' as never)} style={styles.bookBanner}>
  <Text style={styles.bookBannerText}>📅 {t('Há recintos que aceitam reservas na Jynlo. Vê os horários livres por dia, hora e zona.')}</Text>
  <Text style={styles.bookBannerLink}>{t('Ver horários livres')} ›</Text>
 </Pressable>:null}
 <TextInput value={term} onChangeText={setTerm} placeholder={t('Nome do recinto')} placeholderTextColor={C.muted} style={styles.input}/>
 <TextInput value={city} onChangeText={setCity} placeholder={t('Cidade')} placeholderTextColor={C.muted} style={styles.input}/>
 <Button title={t('Pesquisar recintos')} onPress={()=>{void search();}}/>
 {auth.token&&!DEMO_MODE?<Button title={t('Sugerir novo recinto')} secondary onPress={()=>router.push('/venues/create')}/>:
 <Message>{t('Inicia sessão para sugerires novos recintos.')}</Message>}
 {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
 {!loading&&!error&&list.length===0?<Message>{t('Não encontrámos recintos para estes filtros.')}</Message>:null}
 {list.map(v=><Pressable key={v.id} style={styles.card} onPress={()=>router.push({pathname:'/venues/[id]',params:{id:String(v.id)}})}>
   {accepting.includes(v.id)?<Text style={styles.badge}>✓ {t('Aceita reservas na Jynlo')}</Text>:null}
   <Text style={styles.name}>{v.name}</Text><Text style={styles.meta}>⌖ {v.city} {v.district?`· ${v.district}`:''}</Text>
   <Text style={styles.meta}>{v.sports||t('Modalidade não indicada')}</Text><Text style={styles.link}>{t('Ver detalhes →')}</Text>
 </Pressable>)}
 <Message>{t('Os novos recintos e as correções são analisados por moderadores antes de serem publicados.')}</Message>
 </Page>
}
const styles=StyleSheet.create({
 bookBanner:{gap:4,padding:12,marginVertical:8,borderRadius:14,borderWidth:1,borderColor:'rgba(98,230,196,0.45)',backgroundColor:'rgba(98,230,196,0.06)'},
 bookBannerText:{color:C.white,fontSize:14,lineHeight:20},
 bookBannerLink:{color:C.mint,fontWeight:'800'},heading:{color:C.white,fontWeight:'900',fontSize:27},input:{height:52,borderRadius:15,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,paddingHorizontal:15,color:C.white},card:{backgroundColor:C.surface,padding:18,borderRadius:18,borderWidth:1,borderColor:C.border,gap:8},name:{color:C.white,fontSize:16,fontWeight:'900'},meta:{color:C.muted,fontSize:13},link:{color:C.mint,fontWeight:'800',marginTop:5},badge:{alignSelf:'flex-start',color:'#063a35',backgroundColor:'#62e6c4',borderRadius:999,paddingHorizontal:10,paddingVertical:3,fontSize:12,fontWeight:'800',overflow:'hidden'}});
