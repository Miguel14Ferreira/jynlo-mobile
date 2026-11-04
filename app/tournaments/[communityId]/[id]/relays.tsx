import React,{useCallback,useRef,useState} from 'react';
import {Alert,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {DEMO_MODE} from '../../../../src/lib/api';
import {useAuth} from '../../../../src/lib/auth';
import {tournamentDetails} from '../../../../src/lib/competition-api';
import {communityDetails} from '../../../../src/lib/community-api';
import {performanceOverview} from '../../../../src/lib/performance-api';
import {recordRelayHeat,publishRelayFinal,decideRelayHeat} from '../../../../src/lib/relay-organizer-api';
import {canManageRelay,canRecordStage,decisionAllowed,moveRunner,decisionHistory,existingHeat,validateHeatNumber,validateElapsedSeconds,validateRunners,validateDecision} from '../../../../src/lib/relay-organizer-core.cjs';
import {C} from '../../../../src/lib/theme';
import type {JynloTournament,RelayOverview,JynloTournamentTeam,RelayHeat} from '../../../../src/lib/types';

export default function RelayManagement(){
 const p=useLocalSearchParams<{communityId:string;id:string}>();
 const cid=Number(p.communityId),tid=Number(p.id),router=useRouter(),auth=useAuth();
 const [t,setT]=useState<JynloTournament|null>(null),[role,setRole]=useState<string|null>(null),[data,setData]=useState<RelayOverview|null>(null);
 const [teamId,setTeamId]=useState<number|null>(null),[stage,setStage]=useState<'QUALIFICATION'|'FINAL'>('QUALIFICATION');
 const [heat,setHeat]=useState('1'),[seconds,setSeconds]=useState(''),[runnerOrder,setRunnerOrder]=useState<number[]>([]);
 const [reason,setReason]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),locked=useRef(false);
 const load=useCallback(async()=>{
  if(!auth.token||!auth.username){setLoading(false);setT(null);setData(null);return;}
  setLoading(true);setError('');setNotice('');setData(null);
  try{
   const [tournament,community]=await Promise.all([tournamentDetails(cid,tid,auth.token,auth.username),communityDetails(cid,auth.token,auth.username)]);
   setT(tournament);setRole('myRole' in community?community.myRole||null:null);
   const overview=await performanceOverview(cid,tournament,auth.token,auth.username);
   if(overview.kind!=='RELAY')throw Error('Esta competição não é uma estafeta.');
   setData(overview.data);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar as estafetas.');}
  finally{setLoading(false);}
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const editable=!!t&&canManageRelay(role,t)&&!DEMO_MODE;
 const activeStage=data?.finalPublished?'FINAL':stage;
 const selected=data?.teams.find(x=>x.id===teamId)||null;
 function chooseExisting(h:RelayHeat){
  const team=data?.teams.find(x=>x.id===h.teamId);
  if(!team)return;
  choose(team);setStage(h.stage==='FINAL'?'FINAL':'QUALIFICATION');
  setHeat(String(h.heatNumber));setSeconds(String(h.elapsedSeconds));
  if(Array.isArray(h.runnerProfileIds)&&h.runnerProfileIds.length===4)setRunnerOrder(h.runnerProfileIds.slice());
 }
 function choose(team:JynloTournamentTeam){
  setTeamId(team.id);setRunnerOrder(team.players.map(x=>x.profileId));
 }
 async function act(fn:()=>Promise<RelayOverview>,ok:string){
  if(locked.current)return;
  locked.current=true;setBusy(true);setError('');setNotice('');
  try{
   const updated=await fn();setData(updated);setNotice(ok);
   if(updated.finalPublished)setStage('FINAL');
   try{setT(await tournamentDetails(cid,tid,auth.token!,auth.username!));}
   catch{setNotice(ok+' Não foi possível atualizar o estado do torneio; usa Atualizar dados.');}
  }catch(e){setError((e instanceof Error?e.message:'Falha ao guardar.')+' Atualiza os dados antes de repetir.');}
  finally{locked.current=false;setBusy(false);}
 }
 function confirmRecord(){
  if(!editable||!t||!data||!selected||!auth.token||!auth.username||busy)return;
  let number:number,elapsed:number;
  try{
   if(!canRecordStage(data,activeStage,t))throw Error('Esta fase já não aceita tempos.');
   number=validateHeatNumber(heat);elapsed=validateElapsedSeconds(seconds);
   validateRunners(runnerOrder.join(','),selected);
   if(activeStage==='FINAL'&&!data.finalists.some(f=>f.teamId===selected.id))throw Error('Esta equipa não está na final.');
  }catch(e){setError(e instanceof Error?e.message:'Valores inválidos.');return;}
  const previous=existingHeat(data,activeStage,String(number),selected.id);
  Alert.alert(previous?'Substituir tempo existente?':'Registar tempo da estafeta?',
   selected.name+' · '+(activeStage==='FINAL'?'Final':'Qualificação')+' · Série '+number+' · '+elapsed+' s.'+
   (previous?' Tempo anterior: '+previous.elapsedSeconds+' s. Esta operação substitui o registo.':' Confirma a ordem dos corredores antes de guardar.'),[
   {text:'Cancelar',style:'cancel'},
   {text:'Confirmar',onPress:()=>{void act(()=>recordRelayHeat(cid,t,role,auth.token!,auth.username!,data,activeStage,String(number),selected,runnerOrder.join(','),String(elapsed)),'Tempo guardado.');}}
  ]);
 }
 function confirmPublish(){
  if(!editable||!t||!data||!auth.token||!auth.username||busy)return;
  Alert.alert('Publicar final?','Os finalistas ficam fixos e a qualificação é encerrada. Um empate no limite de acesso impede a publicação.',[
   {text:'Cancelar',style:'cancel'},
   {text:'Publicar final',onPress:()=>{void act(()=>publishRelayFinal(cid,t,role,auth.token!,auth.username!,data),'Final publicada.');}}
  ]);
 }
 function confirmDecision(row:RelayHeat,status:'VALID'|'DISQUALIFIED'){
  if(!editable||!t||!data||!auth.token||!auth.username||busy)return;
  let validated:{status:'VALID'|'DISQUALIFIED';reason:string};
  try{validated=validateDecision(status,reason);}
  catch(e){setError(e instanceof Error?e.message:'Fundamento inválido.');return;}
  Alert.alert(status==='VALID'?'Revalidar tempo?':'Desqualificar tempo?',row.teamName+' · Série '+row.heatNumber+
   '. Fundamento: '+validated.reason+'. Esta decisão fica registada no histórico de júri.',[
   {text:'Cancelar',style:'cancel'},
   {text:'Confirmar',style:status==='DISQUALIFIED'?'destructive':'default',
    onPress:()=>{void act(()=>decideRelayHeat(cid,t,role,auth.token!,auth.username!,data,row,status,validated.reason),'Decisão registada.');}}
  ]);
 }
 return <Page><DemoBanner/><Eyebrow>TORNEIOS · ORGANIZAÇÃO</Eyebrow>
  <Text style={s.title}>Gerir estafetas</Text>
  {loading?<Loader/>:null}{!loading&&auth.token?<Button secondary title="Atualizar dados" disabled={busy} onPress={()=>{void load();}}/>:null}{error?<Message tone="error">{error}</Message>:null}{notice?<Message>{notice}</Message>:null}
  {!auth.token?<Button title="Entrar" onPress={()=>router.push('/login')}/>:null}
  {t&&data?<>
   <Text style={s.heading}>{t.name}</Text>
   <View style={s.line}><Badge text={data.eventDiscipline||'Estafetas'}/><Badge text={data.finalPublished?'Final publicada':'Qualificação'}/></View>
   <Message>Os tempos, finalistas, desempates e classificações são validados pelo servidor. A app não atribui lugares automaticamente.</Message>
   {!editable?<Message>{DEMO_MODE?'Demonstração: alterações desativadas.':'A gestão exige OWNER/ADMIN e uma competição ainda não concluída.'}</Message>:null}
   <View style={s.panel}><Text style={s.heading}>Registar série</Text>
    <View style={s.line}><Button secondary={activeStage!=='QUALIFICATION'} title="Qualificação" disabled={busy||data.finalPublished}
      onPress={()=>setStage('QUALIFICATION')}/>
     <Button secondary={activeStage!=='FINAL'} title="Final" disabled={busy||!data.finalPublished}
      onPress={()=>setStage('FINAL')}/></View>
    <Text style={s.note}>Seleciona uma equipa de quatro atletas. A ordem dos corredores pode ser alterada abaixo.</Text>
    {data.teams.filter(x=>activeStage!=='FINAL'||data.finalists.some(f=>f.teamId===x.id)).map(team=>
     <Button key={team.id} secondary={selected?.id!==team.id} disabled={busy}
      title={team.name+(selected?.id===team.id?' ✓':'')} onPress={()=>choose(team)}/>)}
    {selected?<View style={s.roster}>
      {runnerOrder.map((profileId,index)=>{
       const athlete=selected.players.find(p=>p.profileId===profileId);
       return <View key={profileId} style={s.athlete}>
        <Text style={s.name}>{index+1}. {athlete?.displayName||athlete?.username||'Atleta'}</Text>
        <View style={s.line}>
         <Button secondary title="Subir" disabled={busy||index===0} onPress={()=>setRunnerOrder(current=>moveRunner(current,index,-1))}/>
         <Button secondary title="Descer" disabled={busy||index===3} onPress={()=>setRunnerOrder(current=>moveRunner(current,index,1))}/>
        </View>
       </View>;
      })}
      {runnerOrder.length!==4?<Message>A equipa deve ter quatro atletas confirmados.</Message>:null}
     </View>:null}
    <TextInput style={s.input} keyboardType="number-pad" value={heat} onChangeText={setHeat}
     placeholder="Número da série (1–20)" placeholderTextColor={C.muted} accessibilityLabel="Número da série" editable={!busy}/>
    <TextInput style={s.input} keyboardType="decimal-pad" value={seconds} onChangeText={setSeconds}
     placeholder="Tempo em segundos (ex.: 45.320)" placeholderTextColor={C.muted} accessibilityLabel="Tempo em segundos" editable={!busy}/>
    <Text style={s.note}>O tempo será enviado com os corredores na ordem apresentada.</Text>
    <Button title="Guardar tempo" disabled={!editable||busy||!selected||runnerOrder.length!==4||!canRecordStage(data,activeStage,t)} onPress={confirmRecord}/>
   </View>
   <View style={s.panel}><Text style={s.heading}>Séries já registadas</Text>
    <Text style={s.note}>Seleciona uma série para rever o tempo e a ordem dos atletas antes de a alterar.</Text>
    {data.heats.filter(h=>(h.stage||'QUALIFICATION')===activeStage).length===0?
     <Text style={s.note}>Ainda não há séries nesta fase.</Text>:
     data.heats.filter(h=>(h.stage||'QUALIFICATION')===activeStage).map(h=>
      <Button key={h.id} secondary disabled={busy||!editable}
       title={h.teamName+' · Série '+h.heatNumber+' · '+h.elapsedSeconds+' s'}
       onPress={()=>chooseExisting(h)}/>)}
   </View>
   <View style={s.panel}><Text style={s.heading}>Finalistas · {data.finalists.length}</Text>
    {data.finalPublished?data.finalists.map(f=><Text key={f.teamId} style={s.note}>{f.seed}. {f.teamName} · {f.qualifyingSeconds} s</Text>):
     <><Text style={s.note}>O backend seleciona até oito equipas pelos tempos válidos e verifica empates na última vaga.</Text>
      <Button title="Publicar final" disabled={!editable||busy||t.status!=='IN_PROGRESS'||data.qualifyingStandings.length<2} onPress={confirmPublish}/></>}
   </View>
   <View style={s.panel}><Text style={s.heading}>Decisões de júri</Text>
    <TextInput style={[s.input,{minHeight:75}]} multiline value={reason} onChangeText={setReason}
     placeholder="Fundamento obrigatório, 5–500 caracteres" placeholderTextColor={C.muted}
     accessibilityLabel="Fundamento da decisão" editable={!busy} maxLength={500}/>
    {data.heats.length===0?<Text style={s.note}>Não há séries registadas.</Text>:data.heats.map(h=>
     <View key={h.id} style={s.item}>
      <Text style={s.name}>{h.teamName} · {h.stage==='FINAL'?'Final':'Qualificação'} · Série {h.heatNumber}</Text>
      <Text style={s.note}>{h.elapsedSeconds} s · {h.decisionStatus==='DISQUALIFIED'?'Desqualificada':'Válida'}</Text>
      {editable&&decisionAllowed(data,h,t)?<Button danger={h.decisionStatus!=='DISQUALIFIED'} secondary
       title={h.decisionStatus==='DISQUALIFIED'?'Revalidar':'Desqualificar'} disabled={busy||reason.trim().length<5}
       onPress={()=>confirmDecision(h,h.decisionStatus==='DISQUALIFIED'?'VALID':'DISQUALIFIED')}/>:null}
     </View>)}
   </View>
   <View style={s.panel}><Text style={s.heading}>Histórico de júri</Text>
    {decisionHistory(data).length===0?<Text style={s.note}>Ainda não há decisões.</Text>:
     decisionHistory(data).map(d=><View key={d.id} style={s.item}>
      <Text style={s.name}>{d.status==='DISQUALIFIED'?'Desqualificação':'Revalidação'} · Prova #{d.heatId}</Text>
      <Text style={s.note}>{d.reason}</Text>
      <Text style={s.note}>Estado anterior: {d.previousStatus} · Responsável #{d.actorProfileId} · {d.decidedAt}</Text>
     </View>)}
   </View>
   <Button secondary title="Consultar resultados" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/results',params:{communityId:String(cid),id:String(tid)}})}/>
  </>:null}
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const s=StyleSheet.create({title:{fontSize:28,fontWeight:'900',color:C.white},heading:{fontSize:18,fontWeight:'900',color:C.white},
 line:{flexDirection:'row',flexWrap:'wrap',gap:8},panel:{padding:16,borderWidth:1,borderColor:C.border,borderRadius:18,backgroundColor:C.surface,gap:12},
 note:{fontSize:12,color:C.muted,lineHeight:18},name:{fontSize:14,color:C.white,fontWeight:'800'},
 input:{backgroundColor:C.surface2,borderColor:C.border,borderWidth:1,borderRadius:12,minHeight:48,padding:12,color:C.white},
 item:{borderTopColor:C.border,borderTopWidth:1,paddingTop:12,gap:8},roster:{gap:8},athlete:{borderWidth:1,borderColor:C.border,borderRadius:12,padding:10,gap:8}});
