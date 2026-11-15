import React,{useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {Button,Message} from './UI';
import {discoverSportsTeams,type SportsTeam} from '../lib/sports-teams-api';
import {teamCompetitionInvitations,inviteTeamToCompetition,
 type TeamCompetitionInvitation,type TeamCompetitionType} from '../lib/team-competition-invitations-api';
import {C} from '../lib/theme';

interface Props{communityId:number;competitionId:number;type:TeamCompetitionType;token:string;}
export function CompetitionTeamSearch({communityId,competitionId,type,token}:Props){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[rows,setRows]=useState<SportsTeam[]>([]);
 const [existing,setExisting]=useState<TeamCompetitionInvitation[]>([]);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [searched,setSearched]=useState(false);
 const search=async()=>{
  if(loading||query.trim().length<1)return;
  setLoading(true);setError('');setNotice('');
  try{
   const [teams,invitations]=await Promise.all([
    discoverSportsTeams(query,token),
    teamCompetitionInvitations(communityId,type,competitionId,token)
   ]);
   setRows(teams);setExisting(invitations);setSearched(true);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível pesquisar equipas.');}
  finally{setLoading(false);}
 };
 const invite=async(teamId:number)=>{
  if(loading||existing.some(x=>x.teamId===teamId))return;
  setLoading(true);setError('');setNotice('');
  try{
   const invitation=await inviteTeamToCompetition(communityId,type,competitionId,teamId,token);
   setExisting(items=>[...items,invitation]);
   setNotice('Convite enviado. A equipa só participa após confirmação da inscrição.');
  }catch(e){setError((e instanceof Error?e.message:'Não foi possível enviar o convite.')+
     ' Confirma o estado antes de repetir.');}
  finally{setLoading(false);}
 };
 return <View style={styles.box}>
   <Button title={open?'Fechar pesquisa':'Pesquisar equipa'} secondary onPress={()=>setOpen(v=>!v)}/>
   {open?<View style={styles.content}>
    <Text style={styles.hint}>Pesquisa equipas existentes na Jynlo e convida o responsável.</Text>
    <TextInput style={styles.input} value={query} onChangeText={setQuery}
      placeholder="Nome da equipa" placeholderTextColor={C.muted} maxLength={100}
      accessibilityLabel="Nome da equipa a pesquisar"/>
    <Button title={loading?'A pesquisar…':'Pesquisar'} disabled={loading||!query.trim()} onPress={()=>void search()}/>
    {error?<Message tone="error">{error}</Message>:null}
    {notice?<Message>{notice}</Message>:null}
    {rows.map(team=>{
     const invitation=existing.find(x=>x.teamId===team.id);
     return <View key={team.id} style={styles.result}>
      <Text style={styles.name}>{team.name}</Text>
      <Text style={styles.hint}>{team.sport||'Várias modalidades'} · {team.location||'Localização não indicada'}</Text>
      {invitation?<Text style={styles.hint}>Convite: {invitation.status==='PENDING'?'pendente':invitation.status==='ACCEPTED'?'aceite':'recusado'}</Text>:
       <Button title="Convidar equipa" disabled={loading} onPress={()=>void invite(team.id)}/>}
     </View>;
    })}
    {searched&&!rows.length?<Message>Não foram encontradas equipas.</Message>:null}
    <Text style={styles.hint}>O convite não adiciona automaticamente jogadores à competição.</Text>
   </View>:null}
 </View>;
}
const styles=StyleSheet.create({
 box:{padding:14,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,gap:8},
 content:{gap:10},hint:{fontSize:12,color:C.muted,lineHeight:19},
 input:{backgroundColor:C.surface2,color:C.white,padding:12,borderRadius:12,borderWidth:1,borderColor:C.border},
 result:{padding:12,borderRadius:12,borderWidth:1,borderColor:C.border,gap:7},
 name:{color:C.white,fontSize:15,fontWeight:'800'}
});
