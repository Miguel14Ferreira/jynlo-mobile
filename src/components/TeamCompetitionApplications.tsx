import React,{useEffect,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {Button,Message} from './UI';
import {C} from '../lib/theme';
import {configureTeamApplications,decideTeamApplication,teamCompetitionApplicationSettings,
 teamCompetitionApplications,type TeamCompetitionApplication,type TeamCompetitionKind}
 from '../lib/team-competition-applications-api';

interface Props {communityId:number;competitionId:number;type:TeamCompetitionKind;token:string;}
export function TeamCompetitionApplications({communityId,competitionId,type,token}:Props){
 const [open,setOpen]=useState(false),[loaded,setLoaded]=useState(false);
 const [applications,setApplications]=useState<TeamCompetitionApplication[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{
  let active=true;
  setLoaded(false);
  // The request client is read-only here; discard results after a scope change.
  void Promise.all([
   teamCompetitionApplicationSettings(communityId,type,competitionId,token),
   teamCompetitionApplications(communityId,type,competitionId,token)
  ]).then(([settings,rows])=>{if(active){setOpen(settings.applicationsOpen);setApplications(rows);setLoaded(true);setError('');}})
  .catch(e=>{if(active)setError(e instanceof Error?e.message:'Erro a carregar candidaturas.');});
  return()=>{active=false;};
 },[communityId,competitionId,type,token]);
 const toggle=async()=>{
  if(!loaded||busy)return;setBusy(true);setError('');setNotice('');
  try{
   const state=await configureTeamApplications(communityId,type,competitionId,!open,token);
   setOpen(state.applicationsOpen);setNotice('Configuração guardada.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar a configuração.');}
  finally{setBusy(false);}
 };
 const decide=async(id:number,approve:boolean)=>{
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{
   const result=await decideTeamApplication(id,approve,token);
   setApplications(previous=>previous.map(a=>a.id===id?result:a));
   setNotice(approve?'Pedido aprovado. Conclui agora a inscrição e valida o plantel.':'Pedido recusado.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível guardar a decisão.');}
  finally{setBusy(false);}
 };
 return <View style={styles.panel}>
  <Text style={styles.heading}>Candidaturas de equipas</Text>
  <Text style={styles.note}>Permite que equipas encontrem esta competição e peçam participação.</Text>
  {error?<Message tone="error">{error}</Message>:null}
  {notice?<Message>{notice}</Message>:null}
  {!loaded?<Text style={styles.note}>A carregar configuração…</Text>:<>
   <Text style={styles.note}>Pesquisa pública: {open?'Ativada':'Desativada'}</Text>
   <Button title={open?'Fechar candidaturas':'Abrir candidaturas'} disabled={busy} onPress={()=>void toggle()}/>
   <Text style={styles.heading}>Pedidos recebidos ({applications.length})</Text>
   {applications.map(a=><View key={a.id} style={styles.item}>
    <Text style={styles.name}>{a.teamName}</Text>
    <Text style={styles.note}>{a.status==='PENDING'?'Pendente':a.status==='APPROVED'?'Aprovado':'Recusado'}</Text>
    {a.status==='PENDING'?<>
     <Button title="Aprovar pedido" disabled={busy} onPress={()=>void decide(a.id,true)}/>
     <Button title="Recusar pedido" secondary disabled={busy} onPress={()=>void decide(a.id,false)}/>
    </>:null}
   </View>)}
   {applications.length===0?<Text style={styles.note}>Ainda não existem pedidos.</Text>:null}
   <Text style={styles.note}>A aprovação não adiciona jogadores à competição automaticamente.</Text>
  </>}
 </View>;
}
const styles=StyleSheet.create({
 panel:{padding:15,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,gap:10},
 heading:{fontSize:17,fontWeight:'800',color:C.white},name:{fontSize:14,fontWeight:'700',color:C.white},
 note:{fontSize:12,lineHeight:19,color:C.muted},
 item:{padding:12,borderRadius:12,borderWidth:1,borderColor:C.border,gap:8}
});
