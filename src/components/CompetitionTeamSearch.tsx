import React,{useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {Button,Message} from './UI';
import {discoverSportsTeams,type SportsTeam} from '../lib/sports-teams-api';
import {teamCompetitionInvitations,inviteTeamToCompetition,
 type TeamCompetitionInvitation,type TeamCompetitionType} from '../lib/team-competition-invitations-api';
import {C} from '../lib/theme';
import {GlobalTeamEnrollment} from './GlobalTeamEnrollment';
import {communityTeamMemberships,type TeamCommunityMembership} from '../lib/team-community-memberships-api';

interface Props{communityId:number;competitionId:number;type:TeamCompetitionType;token:string;onEnrolled?:()=>void;}
export function CompetitionTeamSearch({communityId,competitionId,type,token,onEnrolled}:Props){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[rows,setRows]=useState<SportsTeam[]>([]);
 const [existing,setExisting]=useState<TeamCompetitionInvitation[]>([]);
 const [associated,setAssociated]=useState<TeamCommunityMembership[]>([]);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [searched,setSearched]=useState(false);
 const searchVersion=useRef(0);
 const [invitesVerified,setInvitesVerified]=useState(false);
 const [refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  if(!open)return;
  let active=true;
  setError('');setInvitesVerified(false);
  void Promise.allSettled([
    communityTeamMemberships(communityId,token),
    teamCompetitionInvitations(communityId,type,competitionId,token)
  ]).then(([memberships,invitations])=>{
    if(!active)return;
    if(memberships.status==='fulfilled')setAssociated(memberships.value.filter(m=>m.status==='ACTIVE'));
    if(invitations.status==='fulfilled'){setExisting(invitations.value);setInvitesVerified(true);}
    const missing=[];
    if(memberships.status==='rejected')missing.push(t('equipas da comunidade'));
    if(invitations.status==='rejected')missing.push(t('convites anteriores'));
    if(missing.length)setError(t('Não foi possível atualizar {v}. Confirma o estado antes de enviar novos convites.',{v:missing.join(' e ')}));
  });
  return()=>{active=false;searchVersion.current++;};
 },[open,communityId,competitionId,type,token,refreshKey]);
 const search=async()=>{
  if(loading||query.trim().length<1)return;
  const version=++searchVersion.current;
  setLoading(true);setError('');setNotice('');
  const [teams,invitations]=await Promise.allSettled([
    discoverSportsTeams(query.trim(),token),
    teamCompetitionInvitations(communityId,type,competitionId,token)
  ]);
  if(version!==searchVersion.current)return;
  if(teams.status==='fulfilled'){setRows(teams.value);setSearched(true);}
  else setError(t('Não foi possível pesquisar equipas. Experimenta novamente.'));
  if(invitations.status==='fulfilled'){setExisting(invitations.value);setInvitesVerified(true);}
  else {setInvitesVerified(false);setError(previous=>[previous,t('Não foi possível confirmar os convites existentes. Não envies novos convites até atualizar o estado.')].filter(Boolean).join(' '));}
  setLoading(false);
 };
 const invite=async(teamId:number)=>{
  if(loading||!invitesVerified||
   ![...associated.map(item=>item.teamId),...rows.map(item=>item.id)].includes(teamId)||
   existing.some(x=>x.teamId===teamId))return;
  setLoading(true);setError('');setNotice('');
  try{
   const invitation=await inviteTeamToCompetition(communityId,type,competitionId,teamId,token);
   setExisting(items=>[...items.filter(item=>item.teamId!==teamId),invitation]);
   setNotice(t('Convite enviado. A equipa só participa após confirmação da inscrição.'));
  }catch(e){
   // An invitation may have been committed before a timeout. Do not rely on
   // the stale list or offer another POST until the server confirms its state.
   setInvitesVerified(false);
   setError((e instanceof Error?e.message:t('Não foi possível enviar o convite.'))+
     ' '+t('O convite pode ter sido entregue. Pesquisa novamente para confirmar antes de repetir.'));
  }
  finally{setLoading(false);}
 };
 return <View style={styles.box}>
   <Button title={open?t('Fechar pesquisa'):t('Pesquisar equipa')} secondary onPress={()=>setOpen(v=>!v)}/>
   {open?<View style={styles.content}>
    <Text style={styles.hint}>{t('Pesquisa equipas existentes na Jynlo e convida o responsável.')}</Text>
    <Text style={styles.name}>{t('Equipas da comunidade ({a})',{a:associated.length})}</Text>
    {associated.map(team=>{
      const invitation=existing.find(x=>x.teamId===team.teamId);
      return <View key={team.id} style={styles.result}>
        <Text style={styles.name}>{team.teamName}</Text>
        {invitation?<><Text style={styles.hint}>{t('Convite: {a}',{a:invitation.status})}</Text>
         {invitation.status==='ACCEPTED'?<GlobalTeamEnrollment communityId={communityId}
           competitionId={competitionId} type={type} globalTeamId={team.teamId} token={token} onEnrolled={onEnrolled}/>:null}</>:
         <Button title={t('Convidar para a competição')} disabled={loading||!invitesVerified} onPress={()=>void invite(team.teamId)}/>}
      </View>;
    })}
    <Text style={styles.name}>{t('Outras equipas da Jynlo')}</Text>
    <TextInput style={styles.input} value={query} onChangeText={setQuery}
      placeholder={t('Nome da equipa')} placeholderTextColor={C.muted} maxLength={100}
      accessibilityLabel={t('Nome da equipa a pesquisar')} returnKeyType="search" onSubmitEditing={()=>void search()}/>
    <Button title={loading?t('A pesquisar…'):t('Pesquisar')} disabled={loading||!query.trim()} onPress={()=>void search()}/>
    {error?<Message tone="error">{error}</Message>:null}
    {!invitesVerified?<Button secondary title={t('Verificar convites anteriores')}
      disabled={loading} onPress={()=>setRefreshKey(key=>key+1)}/>:null}
    {notice?<Message>{notice}</Message>:null}
    {rows.map(team=>{
     const invitation=existing.find(x=>x.teamId===team.id);
     return <View key={team.id} style={styles.result}>
      <Text style={styles.name}>{team.name}</Text>
      <Text style={styles.hint}>{team.sport||t('Várias modalidades')} · {team.location||t('Localização não indicada')}</Text>
      {invitation?<><Text style={styles.hint}>{t('Convite: {a}',{a:invitation.status==='PENDING'?'pendente':invitation.status==='ACCEPTED'?'aceite':'recusado'})}</Text>
       {invitation.status==='ACCEPTED'?<GlobalTeamEnrollment communityId={communityId}
         competitionId={competitionId} type={type} globalTeamId={team.id} token={token} onEnrolled={onEnrolled}/>:null}</>:
       <Button title={t('Convidar equipa')} disabled={loading||!invitesVerified} onPress={()=>void invite(team.id)}/>}
     </View>;
    })}
    {searched&&!rows.length?<Message>{t('Não foram encontradas equipas.')}</Message>:null}
    <Text style={styles.hint}>{t('O convite não adiciona automaticamente jogadores à competição.')}</Text>
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
