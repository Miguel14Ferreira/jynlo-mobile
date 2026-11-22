import React,{useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {StyleSheet,Text,View} from 'react-native';
import {Button,Message} from './UI';
import {C} from '../lib/theme';
import {GlobalTeamEnrollment} from './GlobalTeamEnrollment';
import {configureTeamApplications,decideTeamApplication,teamCompetitionApplicationSettings,
 teamCompetitionApplications,type TeamCompetitionApplication,type TeamCompetitionKind}
 from '../lib/team-competition-applications-api';

interface Props {communityId:number;competitionId:number;type:TeamCompetitionKind;token:string;onEnrolled?:()=>void;}
export function TeamCompetitionApplications({communityId,competitionId,type,token,onEnrolled}:Props){
 const [open,setOpen]=useState(false),[loaded,setLoaded]=useState(false);
 const [applications,setApplications]=useState<TeamCompetitionApplication[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [applicationsVerified,setApplicationsVerified]=useState(false);
 const [refreshKey,setRefreshKey]=useState(0);
 const generation=useRef(0),operationRef=useRef(false);
 useEffect(()=>{
  const version=++generation.current;
  setLoaded(false);setApplicationsVerified(false);setApplications([]);
  setError('');setNotice('');
  void Promise.allSettled([
   teamCompetitionApplicationSettings(communityId,type,competitionId,token),
   teamCompetitionApplications(communityId,type,competitionId,token)
  ]).then(([settings,rows])=>{
   if(version!==generation.current)return;
   const errors:string[]=[];
   if(settings.status==='fulfilled'){setOpen(settings.value.applicationsOpen);setLoaded(true);}
   else errors.push(t('a configuração de candidaturas'));
   if(rows.status==='fulfilled'){setApplications(rows.value);setApplicationsVerified(true);}
   else errors.push(t('os pedidos recebidos'));
   if(errors.length)setError(t('Não foi possível verificar {v}',{v:errors.join(' e ')})+t('. Atualiza antes de tomar decisões.'));
  });
  return()=>{generation.current++;};
 },[communityId,competitionId,type,token,refreshKey]);
 const toggle=async()=>{
  if(!loaded||operationRef.current)return;
  const version=generation.current;
  operationRef.current=true;setBusy(true);setError('');setNotice('');
  try{
   const state=await configureTeamApplications(communityId,type,competitionId,!open,token);
   if(version!==generation.current)return;
   setOpen(state.applicationsOpen);setNotice(t('Configuração guardada.'));
  }catch(e){if(version===generation.current){
   setLoaded(false);
   setError((e instanceof Error?e.message:t('Não foi possível alterar a configuração.'))+
    ' '+t('O estado pode ter mudado. Atualiza os dados antes de repetir.'));
  }}finally{operationRef.current=false;if(version===generation.current)setBusy(false);}
 };
 const decide=async(id:number,approve:boolean)=>{
  if(operationRef.current||!applicationsVerified||!applications.some(a=>a.id===id&&a.status==='PENDING'))return;
  const version=generation.current;
  operationRef.current=true;setBusy(true);setError('');setNotice('');
  try{
   const result=await decideTeamApplication(id,approve,token);
   if(version!==generation.current)return;
   setApplications(previous=>previous.map(a=>a.id===id?result:a));
   setNotice(approve?t('Pedido aprovado. Conclui agora a inscrição e valida o plantel.'):t('Pedido recusado.'));
  }catch(e){if(version===generation.current){
   setApplicationsVerified(false);
   setError((e instanceof Error?e.message:t('Não foi possível confirmar a decisão.'))+
    ' '+t('O pedido pode ter sido processado. Atualiza os dados para verificar antes de repetir.'));
  }}finally{operationRef.current=false;if(version===generation.current)setBusy(false);}
 };
 return <View style={styles.panel}>
  <Text style={styles.heading}>{t('Candidaturas de equipas')}</Text>
  <Text style={styles.note}>{t('Permite que equipas encontrem esta competição e peçam participação.')}</Text>
  {error?<Message tone="error">{error}</Message>:null}
  {notice?<Message>{notice}</Message>:null}
  <Button title={t('Atualizar estado das candidaturas')} secondary disabled={busy} onPress={()=>setRefreshKey(key=>key+1)}/>
  {!loaded?<Text style={styles.note}>{t('Configuração indisponível. Atualiza os dados para verificar.')}</Text>:<>
   <Text style={styles.note}>{t('Pesquisa pública: {a}',{a:open?t('Ativada'):t('Desativada')})}</Text>
   <Button title={open?t('Fechar candidaturas'):t('Abrir candidaturas')} disabled={busy} onPress={()=>void toggle()}/>
  </>}
  <Text style={styles.heading}>{t('Pedidos recebidos ({a})',{a:applicationsVerified?applications.length:'—'})}</Text>
   {!applicationsVerified?<Text style={styles.note}>{t('Não foi possível confirmar os pedidos. As decisões estão temporariamente bloqueadas.')}</Text>:null}
   {applications.map(a=><View key={a.id} style={styles.item}>
    <Text style={styles.name}>{a.teamName}</Text>
    <Text style={styles.note}>{a.status==='PENDING'?t('Pendente'):a.status==='APPROVED'?t('Aprovado'):t('Recusado')}</Text>
    {a.status==='PENDING'?<>
     <Button title={t('Aprovar pedido')} disabled={busy||!applicationsVerified} onPress={()=>void decide(a.id,true)}/>
     <Button title={t('Recusar pedido')} secondary disabled={busy||!applicationsVerified} onPress={()=>void decide(a.id,false)}/>
    </>:null}
    {applicationsVerified&&a.status==='APPROVED'?<GlobalTeamEnrollment communityId={communityId}
      competitionId={competitionId} type={type} globalTeamId={a.teamId} token={token} onEnrolled={onEnrolled}/>:null}
   </View>)}
   {applicationsVerified&&applications.length===0?<Text style={styles.note}>{t('Ainda não existem pedidos.')}</Text>:null}
   <Text style={styles.note}>{t('A aprovação não adiciona jogadores à competição automaticamente.')}</Text>
 </View>;
}
const styles=StyleSheet.create({
 panel:{padding:15,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,gap:10},
 heading:{fontSize:17,fontWeight:'800',color:C.white},name:{fontSize:14,fontWeight:'700',color:C.white},
 note:{fontSize:12,lineHeight:19,color:C.muted},
 item:{padding:12,borderRadius:12,borderWidth:1,borderColor:C.border,gap:8}
});
