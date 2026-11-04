import React,{useCallback,useState} from 'react';
import {Alert,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {tournamentDetails} from '../../../../src/lib/competition-api';
import {communityDetails} from '../../../../src/lib/community-api';
import {tournamentParticipants,joinIndividualTournament,leaveIndividualTournament,confirmIndividualParticipant} from '../../../../src/lib/tournament-registration-api';
import {canSeeIndividualRoster,canConfirmParticipant,ownEnrollment,participantStatus,registrationAction} from '../../../../src/lib/tournament-registration-core.cjs';
import {validPage} from '../../../../src/lib/tournament-fixtures-core.cjs';
import {C} from '../../../../src/lib/theme';
import type {JynloTournament} from '../../../../src/lib/types';
import type {Participant} from '../../../../src/lib/tournament-registration-core.cjs';

export default function TournamentParticipantsScreen(){
 const params=useLocalSearchParams<{communityId:string;id:string}>(),cid=Number(params.communityId),tid=Number(params.id);
 const auth=useAuth(),router=useRouter();
 const [tournament,setTournament]=useState<JynloTournament|null>(null);
 const [role,setRole]=useState<string|null>(null),[items,setItems]=useState<Participant[]>([]);
 const [page,setPage]=useState(0),[more,setMore]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  if(!auth.token||!auth.username){setLoading(false);setItems([]);setTournament(null);return;}
  setLoading(true);setError('');
  try{
   const [t,community]=await Promise.all([
    tournamentDetails(cid,tid,auth.token,auth.username),communityDetails(cid,auth.token,auth.username)
   ]);
   setTournament(t);
   const currentRole='myRole' in community?community.myRole||null:null;
   setRole(currentRole);
   if(!canSeeIndividualRoster(t)){setError('Este torneio tem equipas: consulta o plantel de cada equipa.');setItems([]);return;}
   if(!currentRole){setError('Só membros da comunidade podem ver as inscrições.');setItems([]);return;}
   const result=await tournamentParticipants(cid,tid,0,auth.token,auth.username);
   setItems(result.participants);setPage(result.page);setMore(result.hasMore);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível obter os participantes.');}
  finally{setLoading(false);}
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const myEntry=ownEnrollment(items,auth.username||'');
 const action=registrationAction(tournament,items,auth.username||'',more);
 async function nextPage(){
  if(!auth.token||!auth.username||busy||!more)return;
  setBusy(true);setError('');
  try{const p=validPage(page+1),data=await tournamentParticipants(cid,tid,p,auth.token,auth.username);
   setItems(existing=>[...existing,...data.participants.filter(x=>!existing.some(a=>a.profileId===x.profileId))]);
   setPage(data.page);setMore(data.hasMore);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar mais participantes.');}
  finally{setBusy(false);}
 }
 async function mutate(which:'JOIN'|'LEAVE'|'CONFIRM',participant?:Participant){
  if(!auth.token||!auth.username||busy||!tournament)return;
  setBusy(true);setError('');setNotice('');
  try{
   if(which==='JOIN'){
    const result=await joinIndividualTournament(cid,tid,auth.token,auth.username);
    setNotice(result.status==='PENDING'?'Inscrição recebida. Aguarda confirmação do organizador.':'A inscrição foi confirmada pelo servidor.');
   }else if(which==='LEAVE'){
    await leaveIndividualTournament(cid,tid,auth.token,auth.username);
    setNotice('Cancelaste a tua inscrição no torneio.');
   }else if(participant){
    const result=await confirmIndividualParticipant(cid,tid,participant.profileId,auth.token,auth.username);
    setNotice(`Participação de ${result.displayName||result.username} confirmada pelo servidor.`);
   }
   // Re-read authoritative state. No optimistic registration or retry of writes.
   await load();
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir. Atualiza os participantes antes de tentar novamente.');}
  finally{setBusy(false);}
 }
 return <Page><DemoBanner/><Eyebrow>TORNEIOS · INSCRIÇÕES</Eyebrow>
  <Text style={styles.title}>{tournament?.name||'Participantes individuais'}</Text>
  {tournament?<View style={styles.row}><Badge text={tournament.sport||'Desporto'}/>
   <Badge text={tournament.status==='DRAFT'?'Inscrições em preparação':tournament.status==='IN_PROGRESS'?'Em curso':'Concluído'}/></View>:null}
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {!!notice?<Message>{notice}</Message>:null}
  {!loading&&tournament&&canSeeIndividualRoster(tournament)&&role?<>
   {tournament.status==='DRAFT'?<Message>A participação só fica confirmada quando um organizador a aprovar. As inscrições e cancelamentos encerram ao começar o torneio.</Message>
     :<Message>O torneio já começou ou terminou. Os participantes são apresentados apenas para consulta.</Message>}
   {myEntry?<View style={styles.myCard}>
     <Text style={styles.heading}>A minha inscrição</Text>
     <Text style={styles.member}>{myEntry.displayName||myEntry.username}</Text>
     <Text style={styles.status}>{participantStatus(myEntry.status)}</Text>
   </View>:null}
   {action==='JOIN'?<Button title={busy?'A guardar…':'Pedir inscrição no torneio'} disabled={busy} onPress={()=>{void mutate('JOIN');}}/>:null}
   {action==='LEAVE'?<Button danger title={busy?'A aguardar…':'Cancelar a minha inscrição'} disabled={busy} onPress={()=>{
    Alert.alert('Cancelar inscrição?','Vais sair deste torneio individual.',[
      {text:'Manter inscrição',style:'cancel'},
      {text:'Cancelar inscrição',style:'destructive',onPress:()=>{void mutate('LEAVE');}}
    ]);
   }}/>:null}
   {!myEntry&&more&&tournament.status==='DRAFT'?<Message>Carrega as páginas seguintes para confirmar se já estás inscrito antes de pedir uma nova inscrição.</Message>:null}
   <View style={styles.panel}>
    <Text style={styles.heading}>Participantes</Text>
    {items.length===0?<Text style={styles.muted}>Ainda não existem pedidos de inscrição neste torneio.</Text>:null}
    {items.map(p=><View key={p.profileId} style={styles.participant}>
      <View style={{flex:1,gap:5}}><Text style={styles.member}>{p.displayName||p.username}</Text>
       <Text style={styles.status}>{participantStatus(p.status)}</Text></View>
      {canConfirmParticipant(role,tournament,p)?<Button secondary disabled={busy} title="Confirmar" onPress={()=>{void mutate('CONFIRM',p);}}/>:null}
    </View>)}
   </View>
   {more?<Button secondary disabled={busy} title={busy?'A carregar…':'Carregar mais participantes'} onPress={()=>{void nextPage();}}/>:null}
   <Button secondary disabled={busy} title="Atualizar inscrições" onPress={()=>{setNotice('');void load();}}/>
  </>:null}
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({title:{fontSize:27,fontWeight:'900',color:C.white},row:{flexDirection:'row',flexWrap:'wrap',gap:8},
 panel:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:18,padding:16,gap:13},
 myCard:{backgroundColor:C.surface2,borderWidth:1,borderColor:C.mint,borderRadius:18,padding:17,gap:7},
 heading:{fontSize:19,fontWeight:'900',color:C.white},member:{fontSize:14,fontWeight:'800',color:C.white},
 status:{fontSize:12,color:C.mint,fontWeight:'700'},muted:{fontSize:12,color:C.muted,lineHeight:18},
 participant:{borderTopWidth:1,borderTopColor:C.border,paddingTop:13,flexDirection:'row',alignItems:'center',gap:8}
});
