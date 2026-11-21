import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Button,Message} from './UI';
import {answerAvailability,closeAvailability,createAvailability,openAvailability,type AvailabilityKind} from '../lib/availability-api';
import {ANSWERS,MAX_NOTE,MAX_SLOTS,addSlot,bestSlot,createParams,dayOptions,progress,slotInstant,slotLabel,
 type AvailabilityAnswer,type AvailabilityRequest} from '../lib/availability-core.cjs';
import {C,MobileTheme} from '../lib/theme';

/** "Quem pode?" for a private group or a community the viewer belongs to. */
export function AvailabilityPanel({kind,targetId,token,communityId}:{kind:AvailabilityKind;targetId:number;token:string;communityId?:number}){
 const router=useRouter();
 const [requests,setRequests]=useState<AvailabilityRequest[]>([]);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [creating,setCreating]=useState(false);
 const [day,setDay]=useState(''),[time,setTime]=useState('');
 const [slots,setSlots]=useState<string[]>([]),[note,setNote]=useState(''),[formError,setFormError]=useState('');
 const version=useRef(0);
 const days=useMemo(()=>dayOptions(),[creating]);

 const load=useCallback(async()=>{
  const request=++version.current;
  try{const list=await openAvailability(kind,targetId,token);if(request===version.current){setRequests(list);setError('');}}
  catch(e){if(request===version.current)setError(e instanceof Error?e.message:'Não foi possível carregar os pedidos.');}
 },[kind,targetId,token]);
 useEffect(()=>{void load();return()=>{version.current++;};},[load]);

 function replace(next:AvailabilityRequest){setRequests(list=>list.map(r=>r.id===next.id?next:r));}

 async function answer(request:AvailabilityRequest,slotId:number,value:AvailabilityAnswer){
  if(busy)return;
  setBusy(true);setError('');
  try{replace(await answerAvailability(request.id,slotId,value,token));}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível guardar a resposta.');}
  finally{setBusy(false);}
 }

 function add(){
  const result=slotInstant(day,time);
  if(!result.iso){setFormError(result.error||'Opção inválida.');return;}
  const next=addSlot(slots,result.iso);
  setSlots(next.slots);setFormError(next.error);if(!next.error)setTime('');
 }

 async function submit(){
  if(busy||!slots.length)return;
  setBusy(true);setFormError('');
  try{
   const created=await createAvailability(kind,targetId,slots,note,token);
   setRequests(list=>[created,...list]);
   setCreating(false);setSlots([]);setNote('');setDay('');setTime('');
  }catch(e){setFormError(e instanceof Error?e.message:'Não foi possível criar o pedido.');}
  finally{setBusy(false);}
 }

 function askClose(request:AvailabilityRequest){
  Alert.alert('Fechar pedido?','Os membros deixam de poder responder.',[{text:'Cancelar',style:'cancel'},{text:'Fechar',style:'destructive',onPress:()=>{
   void (async()=>{setBusy(true);try{await closeAvailability(request.id,token);setRequests(list=>list.filter(r=>r.id!==request.id));}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível fechar.');}finally{setBusy(false);}})();
  }}]);
 }

 function createGame(request:AvailabilityRequest){
  const slot=bestSlot(request);
  if(!slot)return;
  router.push({pathname:'/sessions/create',params:createParams(slot,communityId?{communityId:String(communityId)}:{})});
 }

 return <View style={styles.wrap}>
  <View style={styles.head}>
   <Text style={styles.title}>Quem pode?</Text>
   {!creating?<Pressable accessibilityRole="button" onPress={()=>{setCreating(true);setFormError('');}} style={styles.newBtn} disabled={busy}>
    <Text style={styles.newText}>＋ Perguntar</Text></Pressable>:null}
  </View>
  {error?<Message tone="error">{error}</Message>:null}
  {creating?<View style={styles.card}>
   <Text style={styles.label}>Propõe até {MAX_SLOTS} datas e horas</Text>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {days.map(d=><Pressable key={d.value} accessibilityRole="button" accessibilityState={{selected:day===d.value}} onPress={()=>{setDay(d.value);setFormError('');}}
     style={[styles.chip,day===d.value&&styles.chipOn]}><Text style={[styles.chipText,day===d.value&&styles.chipTextOn]}>{d.label}</Text></Pressable>)}
   </ScrollView>
   <View style={styles.row}>
    <TextInput value={time} onChangeText={v=>{setTime(v.replace(/[^0-9:]/g,'').slice(0,5));setFormError('');}} placeholder="HH:mm" placeholderTextColor={C.muted}
     keyboardType="numbers-and-punctuation" style={[styles.input,{flex:1}]} accessibilityLabel="Hora da opção"/>
    <Pressable accessibilityRole="button" onPress={add} disabled={busy||slots.length>=MAX_SLOTS} style={[styles.newBtn,slots.length>=MAX_SLOTS&&styles.dim]}>
     <Text style={styles.newText}>Adicionar</Text></Pressable>
   </View>
   {slots.map(s=><View key={s} style={styles.slotRow}><Text style={styles.slotText}>{slotLabel(s)}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={'Retirar '+slotLabel(s)} hitSlop={10} onPress={()=>setSlots(list=>list.filter(x=>x!==s))}>
     <Text style={styles.remove}>×</Text></Pressable></View>)}
   <TextInput value={note} onChangeText={setNote} maxLength={MAX_NOTE} placeholder="Nota (opcional): ex. Padel no clube do costume" placeholderTextColor={C.muted}
    style={styles.input} accessibilityLabel="Nota do pedido"/>
   {formError?<Message tone="error">{formError}</Message>:null}
   <Button title={busy?'A enviar…':'Perguntar ao grupo'} disabled={busy||!slots.length} onPress={()=>{void submit();}}/>
   <Button secondary title="Cancelar" disabled={busy} onPress={()=>{setCreating(false);setSlots([]);setFormError('');}}/>
  </View>:null}
  {requests.map(request=>{const best=bestSlot(request);return <View key={request.id} style={styles.card}>
   <Text style={styles.meta}>{request.mine?'Perguntaste':request.creator+' pergunta'} · {progress(request)}</Text>
   {request.note?<Text style={styles.note}>{request.note}</Text>:null}
   {request.slots.map(slot=><View key={slot.id} style={styles.slot}>
    <Text style={styles.slotText}>{slotLabel(slot.startsAt)}{best?.id===slot.id?'  ★':''}</Text>
    <Text style={styles.meta} numberOfLines={2}>{slot.yes.length} {slot.yes.length===1?'pode':'podem'}{slot.yes.length?': '+slot.yes.join(', '):''}{slot.maybe.length?` · ${slot.maybe.length} talvez`:''}{slot.no?` · ${slot.no} não`:''}</Text>
    <View style={styles.row}>{ANSWERS.map(a=><Pressable key={a.value} accessibilityRole="button" accessibilityState={{selected:slot.mine===a.value,disabled:busy}}
     accessibilityLabel={a.label+', '+slotLabel(slot.startsAt)} disabled={busy} onPress={()=>{void answer(request,slot.id,a.value);}}
     style={[styles.chip,slot.mine===a.value&&styles.chipOn]}><Text style={[styles.chipText,slot.mine===a.value&&styles.chipTextOn]}>{a.label}</Text></Pressable>)}</View>
   </View>)}
   {request.mine?<View style={styles.row}>
    {best?<Pressable accessibilityRole="button" onPress={()=>createGame(request)} style={styles.newBtn}><Text style={styles.newText}>Criar jogo na melhor opção</Text></Pressable>:null}
    <Pressable accessibilityRole="button" onPress={()=>askClose(request)} disabled={busy} style={styles.ghost}><Text style={styles.ghostText}>Fechar pedido</Text></Pressable>
   </View>:null}
  </View>;})}
 </View>;
}

const styles=StyleSheet.create({
 wrap:{gap:10},
 head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 title:{color:C.white,fontSize:17,fontWeight:'900'},
 card:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:16,padding:14,gap:10},
 label:{color:C.white,fontWeight:'800'},
 meta:{color:C.muted,fontSize:12,lineHeight:17},
 note:{color:C.white,fontSize:14,lineHeight:19},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 chip:{minHeight:MobileTheme.touchTarget,justifyContent:'center',paddingHorizontal:13,borderRadius:MobileTheme.radius.pill,borderWidth:1,borderColor:C.border,backgroundColor:C.background},
 chipOn:{backgroundColor:C.mint,borderColor:C.mint},
 chipText:{color:C.white,fontWeight:'800',fontSize:13},chipTextOn:{color:C.background},
 newBtn:{minHeight:MobileTheme.touchTarget,justifyContent:'center',paddingHorizontal:14,borderRadius:MobileTheme.radius.pill,backgroundColor:C.mint},
 newText:{color:C.background,fontWeight:'900'},
 ghost:{minHeight:MobileTheme.touchTarget,justifyContent:'center',paddingHorizontal:14,borderRadius:MobileTheme.radius.pill,borderWidth:1,borderColor:C.border},
 ghostText:{color:C.white,fontWeight:'800'},
 input:{color:C.white,borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.background,paddingHorizontal:12,minHeight:MobileTheme.touchTarget},
 slot:{gap:6,borderTopWidth:1,borderTopColor:C.border,paddingTop:10},
 slotRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 slotText:{color:C.white,fontWeight:'900',fontSize:15},
 remove:{color:C.danger,fontSize:22,fontWeight:'900',paddingHorizontal:6},
 dim:{opacity:.5}
});
