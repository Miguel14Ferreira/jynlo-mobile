import React,{useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {Button,Message} from './UI';
import {ApiError} from '../lib/api';
import {C} from '../lib/theme';
import {eligibleGlobalRoster,existingGlobalTeamEntry,finalizeGlobalTeamEntry,inviteGlobalRoster,
 type EnrollmentType,type GlobalCompetitionEntry,type GlobalRosterCandidate}
 from '../lib/team-competition-enrollments-api';

interface Props{communityId:number;competitionId:number;type:EnrollmentType;globalTeamId:number;token:string;}
export function GlobalTeamEnrollment({communityId,competitionId,type,globalTeamId,token}:Props){
 const [entry,setEntry]=useState<GlobalCompetitionEntry|null>(null);
 const [roster,setRoster]=useState<GlobalRosterCandidate[]>([]);
 const [selected,setSelected]=useState<number[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [entryCheck,setEntryCheck]=useState<'checking'|'absent'|'present'|'failed'>('checking');
 useEffect(()=>{
  let active=true;
  setEntry(null);setRoster([]);setSelected([]);setError('');setNotice('');setEntryCheck('checking');
  void existingGlobalTeamEntry(communityId,type,competitionId,globalTeamId,token)
   .then(result=>{if(active){setEntry(result);setEntryCheck('present');}})
   .catch(e=>{if(!active)return;
     if(e instanceof ApiError&&e.status===404)setEntryCheck('absent');
     else {setEntryCheck('failed');setError('Não foi possível confirmar o estado da inscrição. Atualiza antes de finalizar.');}
   });
  return()=>{active=false;};
 },[communityId,type,competitionId,globalTeamId,token]);
 const load=async()=>{
  if(busy)return;
  setBusy(true);setError('');
  try{setRoster(await eligibleGlobalRoster(communityId,type,competitionId,globalTeamId,token));}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível obter o plantel.');}
  finally{setBusy(false);}
 };
 const finalize=async()=>{
  if(busy||entry||entryCheck!=='absent')return;setBusy(true);setError('');setNotice('');
  try{
   const next=await finalizeGlobalTeamEntry(communityId,type,competitionId,globalTeamId,token);
   setEntry(next);setEntryCheck('present');setNotice('Equipa inscrita. Seleciona jogadores para convidar.');
  }catch(e){setError((e instanceof Error?e.message:'Não foi possível finalizar.')+
    ' Confirma se a equipa já está inscrita antes de repetir.');}
  finally{setBusy(false);}
 };
 const toggle=(id:number)=>{
  setSelected(previous=>previous.includes(id)?previous.filter(x=>x!==id):[...previous,id]);
 };
 const invite=async()=>{
  if(!entry||busy||!selected.length)return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await inviteGlobalRoster(communityId,type,competitionId,globalTeamId,selected,token);
   setNotice(result.invitationsSent+' convites enviados. Cada jogador tem de aceitar.');
   setSelected([]);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível convidar os jogadores.');}
  finally{setBusy(false);}
 };
 return <View style={styles.panel}>
  {error?<Message tone="error">{error}</Message>:null}
  {notice?<Message>{notice}</Message>:null}
  {!entry?<><Button title={entryCheck==='checking'?'A verificar inscrição…':'Finalizar inscrição da equipa'} disabled={busy||entryCheck!=='absent'} onPress={()=>void finalize()}/>
   <Text style={styles.note}>{entryCheck==='failed'?'O estado da inscrição é desconhecido. Reabre este ecrã para voltar a verificar.':'Inscreve a equipa nesta prova. Os jogadores não são adicionados automaticamente.'}</Text>
  </>:<>
   <Text style={styles.heading}>{entry.name} · Equipa inscrita</Text>
   <Text style={styles.note}>Plantel global confirmado: {entry.confirmedGlobalPlayers} jogadores.</Text>
   <Button secondary title="Consultar jogadores elegíveis" disabled={busy} onPress={()=>void load()}/>
   {roster.map(person=><Pressable key={person.profileId} accessibilityRole="checkbox"
     accessibilityState={{checked:selected.includes(person.profileId),disabled:!person.communityMember}}
     disabled={!person.communityMember||busy} style={styles.row} onPress={()=>toggle(person.profileId)}>
    <Text style={styles.name}>{selected.includes(person.profileId)?'☑':'☐'} {person.username}</Text>
    {!person.communityMember?<Text style={styles.note}>Precisa de aderir à comunidade</Text>:null}
   </Pressable>)}
   {roster.length>0?<Button title={'Convidar '+selected.length+' jogadores'} disabled={busy||!selected.length}
       onPress={()=>void invite()}/>:null}
  </>}
 </View>;
}
const styles=StyleSheet.create({
 panel:{padding:13,gap:9,borderColor:C.border,borderWidth:1,borderRadius:12,backgroundColor:C.surface},
 heading:{fontSize:15,fontWeight:'800',color:C.white},
 name:{fontSize:13,fontWeight:'700',color:C.white},
 note:{fontSize:12,color:C.muted,lineHeight:19},
 row:{padding:9,gap:4,borderRadius:10,borderWidth:1,borderColor:C.border}
});
