import React,{useCallback,useRef,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,Loader,Message,Page} from '../../../src/components/UI';
import {sessionDetail,DEMO_MODE} from '../../../src/lib/api';
import {updateSessionDetails} from '../../../src/lib/session-details-edit-api';
import {editSessionPayload} from '../../../src/lib/session-details-edit-core.cjs';
import {SPORTS} from '../../../src/lib/sports';
import {isOrganizer} from '../../../src/lib/session-state.cjs';
import {useAuth} from '../../../src/lib/auth';
import {C} from '../../../src/lib/theme';
import type {SessionDetail} from '../../../src/lib/types';

type Draft={sport:string;date:string;hour:string;city:string;address:string;
 maxParticipants:string;minParticipants:string;priceAmount:string;meetingPointInstructions:string};
const fromSession=(s:SessionDetail):Draft=>{
 const date=new Date(s.gameDate);
 const localDate=Number.isFinite(date.getTime())
  ?[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'):'';
 const hour=Number.isFinite(date.getTime())
  ?String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0'):'';
 return {sport:s.sport||'',date:localDate,hour,city:s.city||'',address:s.address||'',
  maxParticipants:String(s.maxParticipants??''),minParticipants:String(s.minParticipants??2),
  priceAmount:String(s.priceAmount??0),meetingPointInstructions:s.meetingPointInstructions||''};
};
export default function EditSession(){
 const params=useLocalSearchParams<{id:string}>(),id=Number(params.id);
 const router=useRouter(),auth=useAuth();
 const [session,setSession]=useState<SessionDetail|null>(null);
 const [draft,setDraft]=useState<Draft|null>(null);
 const [sportQuery,setSportQuery]=useState('');
 const [sportPicker,setSportPicker]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),saving=useRef(false);
 const load=useCallback(async()=>{
  const version=++generation.current;setLoading(true);setError('');setSession(null);setDraft(null);
  if(!auth.token||!Number.isSafeInteger(id)||id<=0){
   setError('Inicia sessão para editar uma sessão válida.');setLoading(false);return;
  }
  try{
   const result=await sessionDetail(id,auth.token,auth.username||undefined);
   if(version!==generation.current)return;
   if(!isOrganizer(result,auth.username))throw Error('Só o organizador pode editar esta sessão.');
   if(!['OPEN','FULL'].includes(result.status))throw Error('Esta sessão já não está disponível para edição.');
   setSession(result);setDraft(fromSession(result));
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível abrir a edição.');}
  finally{if(version===generation.current)setLoading(false);}
 },[id,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();return()=>{generation.current++;};},[load]));
 const set=(key:keyof Draft,value:string)=>setDraft(prev=>prev?{...prev,[key]:value}:prev);
 const matches=SPORTS.filter(name=>name.toLocaleLowerCase('pt-PT').includes(sportQuery.toLocaleLowerCase('pt-PT'))).slice(0,15);
 function confirm(){
  if(!draft||!session||!auth.token||busy||saving.current||DEMO_MODE)return;
  let payload:ReturnType<typeof editSessionPayload>;
  try{payload=editSessionPayload(draft,SPORTS);}catch(e){setError(e instanceof Error?e.message:'Confirma os campos.');return;}
  const version=generation.current,token=auth.token,sessionId=id;
  Alert.alert('Guardar alterações?', 'Os participantes podem ser afetados por mudanças na data, no local ou na capacidade. Confirma antes de guardar.',[
   {text:'Voltar',style:'cancel'},
   {text:'Guardar',onPress:()=>{
    if(saving.current||version!==generation.current)return;
    saving.current=true;setBusy(true);setError('');
    void updateSessionDetails(sessionId,token,payload).then(()=>{
     if(version===generation.current)router.replace({pathname:'/sessions/[id]',params:{id:String(sessionId)}});
    }).catch(e=>{
     if(version===generation.current)setError((e instanceof Error?e.message:'Não foi possível guardar.')+' Confirma o estado da sessão antes de tentar novamente.');
    }).finally(()=>{saving.current=false;if(version===generation.current)setBusy(false);});
   }}
  ]);
 }
 const field=(label:string,key:keyof Draft,options?:{keyboardType?:'number-pad'|'decimal-pad';placeholder?:string})=>
  <View style={styles.field} key={key}>
   <Text style={styles.label}>{label}</Text>
   <TextInput style={styles.input} value={draft?.[key]||''} onChangeText={value=>set(key,value)}
    editable={!busy} autoCorrect={false} placeholder={options?.placeholder}
    placeholderTextColor={C.muted} keyboardType={options?.keyboardType||'default'}/>
  </View>;
 return <Page>
  <Text style={styles.title}>Editar sessão</Text>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {!loading&&session&&draft?<View style={styles.form}>
   <Badge text="Organizador"/>
   <Text style={styles.help}>As alterações são guardadas no servidor e aplicam-se à sessão existente. A API decide se o estado atual permite modificá-la.</Text>
   <Text style={styles.label}>Modalidade</Text>
   <Pressable style={styles.picker} disabled={busy} onPress={()=>setSportPicker(!sportPicker)}>
    <Text style={styles.pickerText}>{draft.sport}  ▾</Text>
   </Pressable>
   {sportPicker?<View style={styles.field}>
    <TextInput style={styles.input} placeholder="Pesquisar modalidade" placeholderTextColor={C.muted}
      value={sportQuery} onChangeText={setSportQuery}/>
    <ScrollView nestedScrollEnabled style={{maxHeight:230}} keyboardShouldPersistTaps="handled">
     {matches.map(name=><Pressable key={name} style={styles.option} onPress={()=>{set('sport',name);setSportPicker(false);setSportQuery('');}}>
      <Text style={styles.pickerText}>{name}</Text>
     </Pressable>)}
    </ScrollView>
   </View>:null}
   {field('Data (AAAA-MM-DD)','date',{placeholder:'2026-11-20'})}
   {field('Hora (HH:mm)','hour',{placeholder:'19:30'})}
   {field('Cidade','city')}
   {field('Morada','address')}
   {field('Máximo de jogadores','maxParticipants',{keyboardType:'number-pad'})}
   {field('Mínimo de jogadores','minParticipants',{keyboardType:'number-pad'})}
   {field('Preço por jogador (€)','priceAmount',{keyboardType:'decimal-pad'})}
   {field('Ponto de encontro (opcional)','meetingPointInstructions')}
   <Button title={busy?'A guardar…':'Guardar alterações'} disabled={busy} onPress={confirm}/>
   <Button secondary title="Cancelar" disabled={busy} onPress={()=>router.back()}/>
  </View>:null}
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontWeight:'900',fontSize:26},
 form:{gap:15},field:{gap:7},label:{color:C.muted,fontWeight:'800',fontSize:12},
 input:{minHeight:51,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:12,color:C.white,paddingHorizontal:13,fontSize:15},
 picker:{minHeight:50,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:12,padding:14},
 pickerText:{color:C.white,fontSize:14,fontWeight:'700'},option:{padding:12,borderBottomWidth:1,borderBottomColor:C.border},
 help:{color:C.muted,fontSize:12,lineHeight:19}
});
