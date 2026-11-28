import React,{useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {Button,Message} from './UI';
import {ApiError} from '../lib/api';
import {C} from '../lib/theme';
import {eligibleGlobalRoster,existingGlobalTeamEntry,finalizeGlobalTeamEntry,inviteGlobalRoster,
 type EnrollmentType,type GlobalCompetitionEntry,type GlobalRosterCandidate}
 from '../lib/team-competition-enrollments-api';

interface Props{communityId:number;competitionId:number;type:EnrollmentType;globalTeamId:number;token:string;onEnrolled?:()=>void;}
export function GlobalTeamEnrollment({communityId,competitionId,type,globalTeamId,token,onEnrolled}:Props){
 const [entry,setEntry]=useState<GlobalCompetitionEntry|null>(null);
 const [roster,setRoster]=useState<GlobalRosterCandidate[]>([]);
 const [selected,setSelected]=useState<number[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [entryCheck,setEntryCheck]=useState<'checking'|'absent'|'present'|'failed'>('checking');
 const [rosterLoaded,setRosterLoaded]=useState(false);
 const [sentIds,setSentIds]=useState<number[]>([]);
 const [refreshKey,setRefreshKey]=useState(0);
 const generation=useRef(0),operationRef=useRef(false);
 useEffect(()=>{
  let active=true;
  ++generation.current;
  setEntry(null);setRoster([]);setSelected([]);setSentIds([]);setRosterLoaded(false);setError('');setNotice('');setEntryCheck('checking');
  void existingGlobalTeamEntry(communityId,type,competitionId,globalTeamId,token)
   .then(result=>{if(active){setEntry(result);setEntryCheck('present');}})
   .catch(e=>{if(!active)return;
     if(e instanceof ApiError&&e.status===404)setEntryCheck('absent');
     else {setEntryCheck('failed');setError(t('Não foi possível confirmar o estado da inscrição. Atualiza antes de finalizar.'));}
   });
  return()=>{active=false;generation.current++;};
 },[communityId,type,competitionId,globalTeamId,token,refreshKey]);
 const load=async()=>{
  if(operationRef.current||entryCheck!=='present')return;
  const version=generation.current;
  operationRef.current=true;setBusy(true);setError('');
  try{
   const candidates=await eligibleGlobalRoster(communityId,type,competitionId,globalTeamId,token);
   if(version!==generation.current)return;
   setRoster(candidates);setRosterLoaded(true);
   setSelected(current=>current.filter(id=>candidates.some(p=>p.profileId===id&&p.communityMember)&&!sentIds.includes(id)));
  }catch(e){if(version===generation.current){setRosterLoaded(false);setSelected([]);setError(e instanceof Error?e.message:t('Não foi possível obter o plantel.'));}}
  finally{operationRef.current=false;if(version===generation.current)setBusy(false);}
 };
 const finalize=async()=>{
  if(operationRef.current||entry||entryCheck!=='absent')return;
  const version=generation.current;
  operationRef.current=true;setBusy(true);setError('');setNotice('');
  try{
   const next=await finalizeGlobalTeamEntry(communityId,type,competitionId,globalTeamId,token);
   if(version!==generation.current)return;
   setEntry(next);setEntryCheck('present');setNotice(t('Equipa inscrita. Seleciona jogadores para convidar.'));
   onEnrolled?.();
  }catch(e){if(version===generation.current){
   setEntryCheck('failed');
   setError((e instanceof Error?e.message:t('Não foi possível finalizar.'))+
    ' '+t('Estado incerto: verifica novamente a inscrição antes de repetir.'));
  }}finally{operationRef.current=false;if(version===generation.current)setBusy(false);}
 };
 const toggle=(id:number)=>{
  if(busy||sentIds.includes(id)||!roster.some(p=>p.profileId===id&&p.communityMember))return;
  setSelected(previous=>previous.includes(id)?previous.filter(x=>x!==id):previous.length<30?[...previous,id]:previous);
 };
 const invite=async()=>{
  const eligible=selected.filter(id=>!sentIds.includes(id)&&roster.some(p=>p.profileId===id&&p.communityMember));
  if(!entry||operationRef.current||!rosterLoaded||!eligible.length||eligible.length!==selected.length||eligible.length>30)return;
  const version=generation.current;
  operationRef.current=true;setBusy(true);setError('');setNotice('');
  try{
   const result=await inviteGlobalRoster(communityId,type,competitionId,globalTeamId,eligible,token);
   if(version!==generation.current)return;
   setSentIds(current=>[...new Set([...current,...eligible])]);
   setNotice(result.invitationsSent+' '+t('convites enviados. Cada jogador tem de aceitar.'));
   setSelected([]);setRosterLoaded(false);
   try{
    const refreshed=await eligibleGlobalRoster(communityId,type,competitionId,globalTeamId,token);
    if(version===generation.current){setRoster(refreshed);setRosterLoaded(true);}
   }catch{
    if(version===generation.current)setError(t('Convites enviados, mas não foi possível atualizar o plantel. Consulta novamente antes de continuar.'));
   }
  }catch(e){if(version===generation.current){
   setRosterLoaded(false);setSelected([]);
   setError((e instanceof Error?e.message:t('Não foi possível confirmar os convites.'))+
    ' '+t('Confirma o estado dos jogadores antes de repetir para evitar convites duplicados.'));
  }}finally{operationRef.current=false;if(version===generation.current)setBusy(false);}
 };
 return <View style={styles.panel}>
  {error?<Message tone="error">{error}</Message>:null}
  {notice?<Message>{notice}</Message>:null}
  {!entry?<><Button title={entryCheck==='checking'?t('A verificar inscrição…'):t('Finalizar inscrição da equipa')} disabled={busy||entryCheck!=='absent'} onPress={()=>void finalize()}/>
   <Text style={styles.note}>{entryCheck==='failed'?t('O estado da inscrição é desconhecido. Atualiza antes de tentar novamente.'):t('Inscreve a equipa nesta prova. Os jogadores não são adicionados automaticamente.')}</Text>
   {entryCheck==='failed'?<Button secondary title={t('Verificar novamente a inscrição')} disabled={busy} onPress={()=>setRefreshKey(key=>key+1)}/>:null}
  </>:<>
   <Text style={styles.heading}>{t('{a} · Equipa inscrita',{a:entry.name})}</Text>
   <Text style={styles.note}>{t('Plantel global confirmado: {a} jogadores.',{a:entry.confirmedGlobalPlayers})}</Text>
   <Button secondary title={t('Consultar jogadores elegíveis')} disabled={busy} onPress={()=>void load()}/>
   {rosterLoaded&&roster.length===0?<Text style={styles.note}>{t('Não há jogadores elegíveis neste momento.')}</Text>:null}
   {roster.map(person=><Pressable key={person.profileId} accessibilityRole="checkbox"
     accessibilityState={{checked:selected.includes(person.profileId),disabled:!rosterLoaded||!person.communityMember||sentIds.includes(person.profileId)}}
     disabled={!rosterLoaded||!person.communityMember||sentIds.includes(person.profileId)||busy} style={styles.row} onPress={()=>toggle(person.profileId)}>
    <Text style={styles.name}>{selected.includes(person.profileId)?'☑':'☐'} {person.username}</Text>
    {!person.communityMember?<Text style={styles.note}>{t('Precisa de aderir à comunidade')}</Text>:null}
    {sentIds.includes(person.profileId)?<Text style={styles.note}>{t('Convite enviado neste jogo')}</Text>:null}
   </Pressable>)}
   {rosterLoaded&&roster.length>0?<Button title={'Convidar '+selected.length+' jogadores'} disabled={busy||!selected.length||selected.length>30}
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
