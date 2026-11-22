import React,{useCallback,useRef,useState} from 'react';
import {t as tr} from '../../../../src/lib/i18n';
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
   if(overview.kind!=='RELAY')throw Error(tr('Esta competição não é uma estafeta.'));
   setData(overview.data);
  }catch(e){setError(e instanceof Error?e.message:tr('Não foi possível carregar as estafetas.'));}
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
   catch{setNotice(ok+' '+tr('Não foi possível atualizar o estado do torneio; usa Atualizar dados.'));}
  }catch(e){setError((e instanceof Error?e.message:tr('Falha ao guardar.'))+' '+tr('Atualiza os dados antes de repetir.'));}
  finally{locked.current=false;setBusy(false);}
 }
 function confirmRecord(){
  if(!editable||!t||!data||!selected||!auth.token||!auth.username||busy)return;
  let number:number,elapsed:number;
  try{
   if(!canRecordStage(data,activeStage,t))throw Error(tr('Esta fase já não aceita tempos.'));
   number=validateHeatNumber(heat);elapsed=validateElapsedSeconds(seconds);
   validateRunners(runnerOrder.join(','),selected);
   if(activeStage==='FINAL'&&!data.finalists.some(f=>f.teamId===selected.id))throw Error(tr('Esta equipa não está na final.'));
  }catch(e){setError(e instanceof Error?e.message:tr('Valores inválidos.'));return;}
  const previous=existingHeat(data,activeStage,String(number),selected.id);
  Alert.alert(previous?tr('Substituir tempo existente?'):tr('Registar tempo da estafeta?'),
   selected.name+' · '+(activeStage==='FINAL'?tr('Final'):tr('Qualificação'))+' · '+tr('Série {v}',{v:number})+' · '+elapsed+' s.'+
   (previous?' '+tr('Tempo anterior: {v} s. Esta operação substitui o registo.',{v:previous.elapsedSeconds}):' '+tr('Confirma a ordem dos corredores antes de guardar.')),[
   {text:tr('Cancelar'),style:'cancel'},
   {text:tr('Confirmar'),onPress:()=>{void act(()=>recordRelayHeat(cid,t,role,auth.token!,auth.username!,data,activeStage,String(number),selected,runnerOrder.join(','),String(elapsed)),tr('Tempo guardado.'));}}
  ]);
 }
 function confirmPublish(){
  if(!editable||!t||!data||!auth.token||!auth.username||busy)return;
  Alert.alert(tr('Publicar final?'),tr('Os finalistas ficam fixos e a qualificação é encerrada. Um empate no limite de acesso impede a publicação.'),[
   {text:tr('Cancelar'),style:'cancel'},
   {text:tr('Publicar final'),onPress:()=>{void act(()=>publishRelayFinal(cid,t,role,auth.token!,auth.username!,data),tr('Final publicada.'));}}
  ]);
 }
 function confirmDecision(row:RelayHeat,status:'VALID'|'DISQUALIFIED'){
  if(!editable||!t||!data||!auth.token||!auth.username||busy)return;
  let validated:{status:'VALID'|'DISQUALIFIED';reason:string};
  try{validated=validateDecision(status,reason);}
  catch(e){setError(e instanceof Error?e.message:tr('Fundamento inválido.'));return;}
  Alert.alert(status==='VALID'?tr('Revalidar tempo?'):tr('Desqualificar tempo?'),row.teamName+' · '+tr('Série {v}',{v:row.heatNumber})+
   '. '+tr('Fundamento: {v}',{v:validated.reason})+'. '+tr('Esta decisão fica registada no histórico de júri.'),[
   {text:tr('Cancelar'),style:'cancel'},
   {text:tr('Confirmar'),style:status==='DISQUALIFIED'?'destructive':'default',
    onPress:()=>{void act(()=>decideRelayHeat(cid,t,role,auth.token!,auth.username!,data,row,status,validated.reason),tr('Decisão registada.'));}}
  ]);
 }
 return <Page><DemoBanner/><Eyebrow>{tr('TORNEIOS · ORGANIZAÇÃO')}</Eyebrow>
  <Text style={s.title}>{tr('Gerir estafetas')}</Text>
  {loading?<Loader/>:null}{!loading&&auth.token?<Button secondary title={tr('Atualizar dados')} disabled={busy} onPress={()=>{void load();}}/>:null}{error?<Message tone="error">{error}</Message>:null}{notice?<Message>{notice}</Message>:null}
  {!auth.token?<Button title={tr('Entrar')} onPress={()=>router.push('/login')}/>:null}
  {t&&data?<>
   <Text style={s.heading}>{t.name}</Text>
   <View style={s.line}><Badge text={data.eventDiscipline||tr('Estafetas')}/><Badge text={data.finalPublished?tr('Final publicada'):tr('Qualificação')}/></View>
   <Message>{tr('Os tempos, finalistas, desempates e classificações são validados pelo servidor. A app não atribui lugares automaticamente.')}</Message>
   {!editable?<Message>{DEMO_MODE?tr('Demonstração: alterações desativadas.'):tr('A gestão exige OWNER/ADMIN e uma competição ainda não concluída.')}</Message>:null}
   <View style={s.panel}><Text style={s.heading}>{tr('Registar série')}</Text>
    <View style={s.line}><Button secondary={activeStage!=='QUALIFICATION'} title={tr('Qualificação')} disabled={busy||data.finalPublished}
      onPress={()=>setStage('QUALIFICATION')}/>
     <Button secondary={activeStage!=='FINAL'} title={tr('Final')} disabled={busy||!data.finalPublished}
      onPress={()=>setStage('FINAL')}/></View>
    <Text style={s.note}>{tr('Seleciona uma equipa de quatro atletas. A ordem dos corredores pode ser alterada abaixo.')}</Text>
    {data.teams.filter(x=>activeStage!=='FINAL'||data.finalists.some(f=>f.teamId===x.id)).map(team=>
     <Button key={team.id} secondary={selected?.id!==team.id} disabled={busy}
      title={team.name+(selected?.id===team.id?' ✓':'')} onPress={()=>choose(team)}/>)}
    {selected?<View style={s.roster}>
      {runnerOrder.map((profileId,index)=>{
       const athlete=selected.players.find(p=>p.profileId===profileId);
       return <View key={profileId} style={s.athlete}>
        <Text style={s.name}>{index+1}. {athlete?.displayName||athlete?.username||tr('Atleta')}</Text>
        <View style={s.line}>
         <Button secondary title={tr('Subir')} disabled={busy||index===0} onPress={()=>setRunnerOrder(current=>moveRunner(current,index,-1))}/>
         <Button secondary title={tr('Descer')} disabled={busy||index===3} onPress={()=>setRunnerOrder(current=>moveRunner(current,index,1))}/>
        </View>
       </View>;
      })}
      {runnerOrder.length!==4?<Message>{tr('A equipa deve ter quatro atletas confirmados.')}</Message>:null}
     </View>:null}
    <TextInput style={s.input} keyboardType="number-pad" value={heat} onChangeText={setHeat}
     placeholder={tr('Número da série (1–20)')} placeholderTextColor={C.muted} accessibilityLabel={tr('Número da série')} editable={!busy}/>
    <TextInput style={s.input} keyboardType="decimal-pad" value={seconds} onChangeText={setSeconds}
     placeholder={tr('Tempo em segundos (ex.: 45.320)')} placeholderTextColor={C.muted} accessibilityLabel={tr('Tempo em segundos')} editable={!busy}/>
    <Text style={s.note}>{tr('O tempo será enviado com os corredores na ordem apresentada.')}</Text>
    <Button title={tr('Guardar tempo')} disabled={!editable||busy||!selected||runnerOrder.length!==4||!canRecordStage(data,activeStage,t)} onPress={confirmRecord}/>
   </View>
   <View style={s.panel}><Text style={s.heading}>{tr('Séries já registadas')}</Text>
    <Text style={s.note}>{tr('Seleciona uma série para rever o tempo e a ordem dos atletas antes de a alterar.')}</Text>
    {data.heats.filter(h=>(h.stage||'QUALIFICATION')===activeStage).length===0?
     <Text style={s.note}>{tr('Ainda não há séries nesta fase.')}</Text>:
     data.heats.filter(h=>(h.stage||'QUALIFICATION')===activeStage).map(h=>
      <Button key={h.id} secondary disabled={busy||!editable}
       title={h.teamName+' · '+tr('Série {v}',{v:h.heatNumber})+' · '+h.elapsedSeconds+' s'}
       onPress={()=>chooseExisting(h)}/>)}
   </View>
   <View style={s.panel}><Text style={s.heading}>{tr('Finalistas · {a}',{a:data.finalists.length})}</Text>
    {data.finalPublished?data.finalists.map(f=><Text key={f.teamId} style={s.note}>{f.seed}. {f.teamName} · {f.qualifyingSeconds} s</Text>):
     <><Text style={s.note}>{tr('Passam à final até oito equipas, pelos melhores tempos válidos. Empates na última vaga são verificados.')}</Text>
      <Button title={tr('Publicar final')} disabled={!editable||busy||t.status!=='IN_PROGRESS'||data.qualifyingStandings.length<2} onPress={confirmPublish}/></>}
   </View>
   <View style={s.panel}><Text style={s.heading}>{tr('Decisões de júri')}</Text>
    <TextInput style={[s.input,{minHeight:75}]} multiline value={reason} onChangeText={setReason}
     placeholder={tr('Fundamento obrigatório, 5–500 caracteres')} placeholderTextColor={C.muted}
     accessibilityLabel={tr('Fundamento da decisão')} editable={!busy} maxLength={500}/>
    {data.heats.length===0?<Text style={s.note}>{tr('Não há séries registadas.')}</Text>:data.heats.map(h=>
     <View key={h.id} style={s.item}>
      <Text style={s.name}>{tr('{a} · {b} · Série {c}',{a:h.teamName,b:h.stage==='FINAL'?tr('Final'):tr('Qualificação'),c:h.heatNumber})}</Text>
      <Text style={s.note}>{h.elapsedSeconds} s · {h.decisionStatus==='DISQUALIFIED'?tr('Desqualificada'):tr('Válida')}</Text>
      {editable&&decisionAllowed(data,h,t)?<Button danger={h.decisionStatus!=='DISQUALIFIED'} secondary
       title={h.decisionStatus==='DISQUALIFIED'?tr('Revalidar'):tr('Desqualificar')} disabled={busy||reason.trim().length<5}
       onPress={()=>confirmDecision(h,h.decisionStatus==='DISQUALIFIED'?'VALID':'DISQUALIFIED')}/>:null}
     </View>)}
   </View>
   <View style={s.panel}><Text style={s.heading}>{tr('Histórico de júri')}</Text>
    {decisionHistory(data).length===0?<Text style={s.note}>{tr('Ainda não há decisões.')}</Text>:
     decisionHistory(data).map(d=><View key={d.id} style={s.item}>
      <Text style={s.name}>{tr('{a} · Prova #{b}',{a:d.status==='DISQUALIFIED'?tr('Desqualificação'):tr('Revalidação'),b:d.heatId})}</Text>
      <Text style={s.note}>{d.reason}</Text>
      <Text style={s.note}>{tr('Estado anterior: {a} · Responsável #{b} · {c}',{a:d.previousStatus,b:d.actorProfileId,c:d.decidedAt})}</Text>
     </View>)}
   </View>
   <Button secondary title={tr('Consultar resultados')} onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/results',params:{communityId:String(cid),id:String(tid)}})}/>
  </>:null}
  <Button secondary title={tr('Voltar ao torneio')} onPress={()=>router.back()}/>
 </Page>;
}
const s=StyleSheet.create({title:{fontSize:28,fontWeight:'900',color:C.white},heading:{fontSize:18,fontWeight:'900',color:C.white},
 line:{flexDirection:'row',flexWrap:'wrap',gap:8},panel:{padding:16,borderWidth:1,borderColor:C.border,borderRadius:18,backgroundColor:C.surface,gap:12},
 note:{fontSize:12,color:C.muted,lineHeight:18},name:{fontSize:14,color:C.white,fontWeight:'800'},
 input:{backgroundColor:C.surface2,borderColor:C.border,borderWidth:1,borderRadius:12,minHeight:48,padding:12,color:C.white},
 item:{borderTopColor:C.border,borderTopWidth:1,paddingTop:12,gap:8},roster:{gap:8},athlete:{borderWidth:1,borderColor:C.border,borderRadius:12,padding:10,gap:8}});
