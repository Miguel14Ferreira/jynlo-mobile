import React,{useCallback,useRef,useState} from 'react';
import {Alert,Pressable,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {ApiError,DEMO_MODE} from '../../../../src/lib/api';
import {useAuth} from '../../../../src/lib/auth';
import {communityDetails} from '../../../../src/lib/community-api';
import {KINDS,KIND_LABELS,KIND_SHORT,buildResults,draftRows,formatEventValue} from '../../../../src/lib/event-ranking-core.cjs';
import type {EventRankingDraftRow,EventRankingKind} from '../../../../src/lib/event-ranking-core.cjs';
import {completeEventRanking,deleteEventRankingEvent,eventRankingOverview,saveEventRankingEvent,setEventRankingKind,setEventRankingPoints} from '../../../../src/lib/event-ranking-api';
import type {EventRankingEvent,EventRankingOverview} from '../../../../src/lib/event-ranking-api';
import {C} from '../../../../src/lib/theme';

const today=()=>new Date().toISOString().slice(0,10);
const plural=(n:number,one:string,many:string)=>n+' '+(n===1?one:many);
const INPUT_HINT:Record<EventRankingKind,string>={
 TIME:'Escreve o tempo de cada atleta (ex.: 62,4 ou 1:02,40). Deixa vazio quem não participou.',
 SCORE:'Escreve a pontuação ou marca de cada atleta. Deixa vazio quem não participou.',
 POSITION:'Escreve o lugar de chegada (1, 2, 3…). Deixa vazio quem não participou.'
};
const PLACEHOLDER:Record<EventRankingKind,string>={TIME:'1:02,40',SCORE:'ex.: 87,5',POSITION:'lugar'};
function failure(e:unknown):string{
 if(e instanceof ApiError&&(e.status===400||e.status===409))
  return 'O servidor recusou a alteração. Confirma os valores (pontos por ordem decrescente, um resultado por atleta) e se o campeonato ainda está aberto.';
 return e instanceof Error?e.message:'Não foi possível guardar.';
}

/** "Classificação por provas": table and events for everyone; recording events for admins. */
export default function EventRankingScreen(){
 const params=useLocalSearchParams<{communityId:string;id:string;name?:string}>();
 const tournamentName=typeof params.name==='string'&&params.name.trim()?params.name.trim().slice(0,120):'Classificação por provas';
 const cid=Number(params.communityId),tid=Number(params.id),router=useRouter(),auth=useAuth();
 const [data,setData]=useState<EventRankingOverview|null>(null),[role,setRole]=useState<string|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [formOpen,setFormOpen]=useState(false),[editingId,setEditingId]=useState<number|null>(null);
 const [eventName,setEventName]=useState(''),[eventDate,setEventDate]=useState(''),[rows,setRows]=useState<EventRankingDraftRow[]>([]);
 const [pointsOpen,setPointsOpen]=useState(false),[pointsDraft,setPointsDraft]=useState('');
 const [expanded,setExpanded]=useState<number|null>(null);
 const generation=useRef(0),locked=useRef(false);
 const load=useCallback(async(version=generation.current)=>{
  if(!auth.token||!auth.username){setData(null);setLoading(false);return;}
  if(!Number.isSafeInteger(cid)||cid<=0||!Number.isSafeInteger(tid)||tid<=0){setError('Torneio inválido.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const [overview,community]=await Promise.all([
    eventRankingOverview(cid,tid,auth.token,auth.username),communityDetails(cid,auth.token,auth.username)
   ]);
   if(version!==generation.current)return;
   setData(overview);setRole('myRole' in community?community.myRole||null:null);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar as provas.');}
  finally{if(version===generation.current)setLoading(false);}
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  setData(null);setFormOpen(false);setPointsOpen(false);setNotice('');setError('');
  void load(version);
  return ()=>{generation.current++;};
 },[load]));

 const kind:EventRankingKind=data?.valueKind??'POSITION';
 const completed=data?.status==='COMPLETED';
 const manager=!!data?.canManage&&(role==='OWNER'||role==='ADMIN')&&!DEMO_MODE;
 const value=(v:number|null)=>formatEventValue(v,kind);

 async function run(action:()=>Promise<EventRankingOverview>,success:string,after?:()=>void){
  if(locked.current||!auth.token||!auth.username)return;
  const version=generation.current;
  locked.current=true;setBusy(true);setError('');setNotice('');
  try{
   const result=await action();
   if(version!==generation.current)return;
   setData(result);after?.();setNotice(success);
  }catch(e){if(version===generation.current)setError(failure(e));}
  finally{locked.current=false;setBusy(false);}
 }
 function openNew(){
  if(!data)return;
  setEditingId(null);setEventName('Prova '+(data.events.length+1));setEventDate(today());
  setRows(draftRows(data.participants,null,kind));setFormOpen(true);setNotice('');setError('');
 }
 function openEdit(event:EventRankingEvent){
  if(!data)return;
  setEditingId(event.id);setEventName(event.name);setEventDate(event.heldOn??'');
  setRows(draftRows(data.participants,event,kind));setFormOpen(true);setNotice('');setError('');
 }
 function saveEvent(){
  if(!auth.token||!auth.username)return;
  let results;
  try{results=buildResults(rows,kind);}catch(e){setError(e instanceof Error?e.message:'Confirma os valores.');return;}
  const date=eventDate.trim();
  if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)){setError('A data deve estar no formato AAAA-MM-DD.');return;}
  const token=auth.token,username=auth.username;
  void run(()=>saveEventRankingEvent(cid,tid,editingId,{name:eventName.trim(),heldOn:date||null,results},token,username),
   'Prova guardada e classificação atualizada.',()=>setFormOpen(false));
 }
 function confirmDelete(event:EventRankingEvent){
  if(!auth.token||!auth.username)return;
  const token=auth.token,username=auth.username;
  Alert.alert('Apagar prova?','Os pontos de "'+event.name+'" deixam de contar.',[
   {text:'Manter',style:'cancel'},
   {text:'Apagar',style:'destructive',onPress:()=>{void run(()=>deleteEventRankingEvent(cid,tid,event.id,token,username),'Prova apagada.');}}
  ]);
 }
 function confirmComplete(){
  if(!auth.token||!auth.username)return;
  const token=auth.token,username=auth.username;
  Alert.alert('Terminar campeonato?','Depois de terminado já não podes registar nem alterar provas.',[
   {text:'Continuar aberto',style:'cancel'},
   {text:'Terminar',style:'destructive',onPress:()=>{void run(()=>completeEventRanking(cid,tid,token,username),'Campeonato terminado. Parabéns ao campeão! 🏆');}}
  ]);
 }
 const setRow=(index:number,patch:Partial<EventRankingDraftRow>)=>setRows(current=>current.map((r,i)=>i===index?{...r,...patch}:r));

 return <Page><DemoBanner/><Eyebrow>🏅 CLASSIFICAÇÃO POR PROVAS</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{tournamentName}</Text>
  {!auth.token?<Button title="Entrar" onPress={()=>router.push('/login')}/>:null}
  {loading&&!data?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {notice?<Message>{notice}</Message>:null}
  {data?<>
   <View style={styles.panel}>
    <View style={styles.row}><Badge text={completed?'Concluído':data.status==='IN_PROGRESS'?'A decorrer':'Em preparação'}/>
     <Badge text={plural(data.events.length,'prova','provas')}/></View>
    <Text style={styles.meta}>Cada prova ordena os atletas por {KIND_SHORT[kind]}. Os lugares dão pontos e a soma decide a classificação.</Text>
    <Text style={styles.meta}>Pontos por lugar: <Text style={styles.strong}>{data.pointsByPlace.join(' · ')}</Text></Text>
    {manager&&!completed&&!pointsOpen?<Button secondary disabled={busy} title="Alterar pontos por lugar" onPress={()=>{setPointsDraft(data.pointsByPlace.join(', '));setPointsOpen(true);}}/>:null}
    {pointsOpen?<View style={styles.form}>
     <TextInput style={styles.input} value={pointsDraft} onChangeText={setPointsDraft} editable={!busy}
      placeholder="25, 18, 15, 12, 10" placeholderTextColor={C.muted} accessibilityLabel="Pontos por lugar"/>
     <View style={styles.row}>
      <Button disabled={busy} title="Guardar pontos" onPress={()=>{if(!auth.token||!auth.username)return;const tk=auth.token,u=auth.username;
       void run(()=>setEventRankingPoints(cid,tid,pointsDraft,tk,u),'Pontos atualizados.',()=>setPointsOpen(false));}}/>
      <Button secondary title="Cancelar" onPress={()=>setPointsOpen(false)}/>
     </View>
    </View>:null}
   </View>

   {manager&&!completed&&data.events.length===0?<View style={styles.panel}>
    <Text style={styles.heading}>Como se decide cada prova?</Text>
    {KINDS.map(k=><Pressable key={k} accessibilityRole="radio" accessibilityState={{checked:kind===k,disabled:busy}} disabled={busy}
      style={[styles.choice,kind===k&&styles.choiceActive]}
      onPress={()=>{if(!auth.token||!auth.username||kind===k)return;const tk=auth.token,u=auth.username;
       void run(()=>setEventRankingKind(cid,tid,k,tk,u),'Forma de classificar atualizada.');}}>
      <Text style={[styles.choiceText,kind===k&&styles.choiceTextActive]}>{KIND_LABELS[k]}</Text>
     </Pressable>)}
    <Text style={styles.meta}>Podes mudar até registares a primeira prova.</Text>
   </View>:null}

   <View style={styles.panel}>
    <View style={styles.between}><Text style={styles.heading}>Classificação</Text>
     <Text style={styles.count}>{plural(data.participants.length,'atleta','atletas')}</Text></View>
    {data.table.length===0?<Text style={styles.meta}>{data.participants.length?'Ainda não há provas registadas.':'Ainda não há atletas confirmados. Os atletas inscrevem-se em "Participantes e inscrições" e um administrador confirma.'}</Text>:null}
    {data.table.map(row=><View key={row.participantId} style={styles.standing}>
     <View style={[styles.positionBox,row.position===1&&styles.leaderBox]}><Text maxFontSizeMultiplier={1.3} style={styles.position}>{row.position}</Text></View>
     <View style={styles.identity}><Text numberOfLines={2} style={styles.name}>{row.name}</Text>
      {kind!=='POSITION'&&row.best!=null?<Text style={styles.best}>{kind==='TIME'?'Melhor tempo':'Melhor marca'}: {value(row.best)}</Text>:null}
      <Text style={styles.meta}>{plural(row.events,'prova','provas')} · {plural(row.wins,'vitória','vitórias')} · {plural(row.podiums,'pódio','pódios')}</Text></View>
     <View style={styles.pointsBox}><Text style={styles.points}>{row.points}</Text><Text style={styles.pointsLabel}>pts</Text></View>
    </View>)}
   </View>

   {manager&&!completed&&!formOpen&&data.participants.length?<Button disabled={busy} title="+ Registar prova" onPress={openNew}/>:null}

   {formOpen?<View style={styles.panel}>
    <Text style={styles.heading}>{editingId?'Editar prova':'Nova prova'}</Text>
    <Text style={styles.label}>NOME DA PROVA</Text>
    <TextInput style={styles.input} value={eventName} onChangeText={setEventName} maxLength={80} editable={!busy} accessibilityLabel="Nome da prova"/>
    <Text style={styles.label}>DATA (AAAA-MM-DD)</Text>
    <TextInput style={styles.input} value={eventDate} onChangeText={setEventDate} editable={!busy} placeholder={today()}
     placeholderTextColor={C.muted} accessibilityLabel="Data da prova"/>
    <Text style={styles.meta}>{INPUT_HINT[kind]}</Text>
    {rows.map((row,index)=><View key={row.participantId} style={styles.entry}>
     <Text numberOfLines={1} style={[styles.name,styles.entryName]}>{row.name}</Text>
     <TextInput style={[styles.input,styles.entryInput,row.dnf&&styles.disabledInput]} value={row.raw} editable={!busy&&!row.dnf}
      onChangeText={raw=>setRow(index,{raw})} keyboardType={kind==='TIME'?'numbers-and-punctuation':'decimal-pad'}
      placeholder={PLACEHOLDER[kind]} placeholderTextColor={C.muted} accessibilityLabel={'Resultado de '+row.name}/>
     <View style={styles.dnf}><Switch value={row.dnf} disabled={busy} onValueChange={dnf=>setRow(index,{dnf})}
      accessibilityLabel={'Desistência de '+row.name}/><Text style={styles.dnfText}>Desistiu</Text></View>
    </View>)}
    <View style={styles.row}>
     <Button disabled={busy||!eventName.trim()} title={busy?'A guardar…':'Guardar prova'} onPress={saveEvent}/>
     <Button secondary title="Cancelar" onPress={()=>setFormOpen(false)}/>
    </View>
   </View>:null}

   {data.events.length?<View style={styles.panel}>
    <Text style={styles.heading}>Provas</Text>
    {data.events.map(event=><View key={event.id} style={styles.event}>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:expanded===event.id}}
      onPress={()=>setExpanded(expanded===event.id?null:event.id)} style={styles.eventHead}>
      <View style={styles.between}><Text style={[styles.name,{flex:1}]}>{event.name}</Text>
       <Text style={styles.chevron}>{expanded===event.id?'▾':'▸'}</Text></View>
      <Text style={styles.meta}>{event.heldOn?event.heldOn.split('-').reverse().join('/'):''}{event.results[0]?.place===1?' · 🥇 '+event.results[0].name:''}</Text>
     </Pressable>
     {expanded===event.id?<View style={{gap:6}}>
      {event.results.map(r=><View key={r.participantId} style={styles.result}>
       <Text style={styles.resultPlace}>{r.didNotFinish?'—':r.place+'.º'}</Text>
       <Text numberOfLines={1} style={[styles.meta,{flex:1}]}>{r.name}</Text>
       <Text style={styles.meta}>{r.didNotFinish?'Desistiu':kind==='POSITION'?'':value(r.value)}</Text>
       <Text style={styles.resultPoints}>{r.points} pts</Text>
      </View>)}
      {manager&&!completed?<View style={styles.row}>
       <Button secondary disabled={busy} title="Editar" onPress={()=>openEdit(event)}/>
       <Button danger disabled={busy} title="Apagar" onPress={()=>confirmDelete(event)}/>
      </View>:null}
     </View>:null}
    </View>)}
   </View>:null}

   {manager&&!completed&&data.events.length&&!formOpen?<Button secondary disabled={busy} title="Terminar campeonato" onPress={confirmComplete}/>:null}
   <Button secondary title="Participantes e inscrições" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/participants',params:{communityId:String(cid),id:String(tid)}})}/>
   <Button secondary disabled={busy||loading} title="Atualizar" onPress={()=>{setNotice('');void load();}}/>
  </>:null}
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:27,fontWeight:'900',color:C.white},
 panel:{backgroundColor:'#082B3A',borderColor:'#3DC4B04D',borderWidth:1,borderRadius:18,padding:16,gap:12},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 between:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'},
 heading:{color:C.white,fontSize:19,fontWeight:'900'},count:{color:'#99DDCE',fontSize:12,fontWeight:'800'},
 meta:{fontSize:12,color:'#ACCAD2',lineHeight:17},
 best:{fontSize:12,color:'#DDF4EF',fontWeight:'700'},strong:{color:C.white,fontWeight:'800'},
 label:{fontSize:11,color:'#98E6D6',fontWeight:'800',letterSpacing:1},
 form:{gap:10},
 input:{minHeight:44,borderWidth:1,borderColor:'#3DC4B066',borderRadius:12,paddingHorizontal:12,color:C.white,backgroundColor:'#0A3340',fontSize:15},
 disabledInput:{opacity:0.45},
 choice:{borderWidth:1,borderColor:C.border,borderRadius:14,padding:13,backgroundColor:C.surface},
 choiceActive:{borderColor:C.mint,backgroundColor:'#124B48'},
 choiceText:{color:C.muted,fontWeight:'800',fontSize:14},choiceTextActive:{color:C.white},
 standing:{flexDirection:'row',alignItems:'center',borderTopColor:'#3BAEAB34',borderTopWidth:1,paddingVertical:12,gap:11},
 positionBox:{width:34,height:34,borderRadius:11,backgroundColor:'#135E59',alignItems:'center',justifyContent:'center'},
 leaderBox:{backgroundColor:'#8A6A1F'},
 position:{color:'#A0FFE3',fontWeight:'900',fontSize:15},
 identity:{flex:1,minWidth:0,gap:4},name:{color:C.white,fontWeight:'800',fontSize:14,lineHeight:19},
 pointsBox:{minWidth:50,alignItems:'center',gap:3},points:{color:'#7FF5D6',fontWeight:'900',fontSize:18},
 pointsLabel:{color:'#B5D2DA',fontSize:10,fontWeight:'800'},
 entry:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:'#3BAEAB34',paddingTop:10},
 entryName:{flexBasis:'100%'},entryInput:{flex:1,minWidth:120},
 dnf:{flexDirection:'row',alignItems:'center',gap:4},dnfText:{color:C.muted,fontSize:12,fontWeight:'700'},
 event:{borderTopWidth:1,borderTopColor:'#3BAEAB34',paddingTop:10,gap:8},
 eventHead:{gap:3,paddingVertical:4},
 chevron:{color:C.mint,fontSize:18,fontWeight:'900'},
 result:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:4},
 resultPlace:{width:34,color:'#A0FFE3',fontWeight:'900'},
 resultPoints:{minWidth:52,textAlign:'right',color:'#7FF5D6',fontWeight:'900'}
});
