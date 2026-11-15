import React,{useCallback,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {setSportsTeamFeatures,sportsTeamDetail,SportsTeam} from '../../src/lib/sports-teams-api';
import {C} from '../../src/lib/theme';

export default function TeamDetail(){
 const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),auth=useAuth();
 const teamId=Number(id);const [team,setTeam]=useState<SportsTeam|null>(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{setTeam(await sportsTeamDetail(teamId,auth.token||undefined));}
  catch(e){setError(e instanceof Error?e.message:'Equipa não encontrada.');}
  finally{setLoading(false);}
 },[teamId,auth.token]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const feature=async(field:'chatEnabled'|'feedEnabled')=>{
  if(!team||!auth.token||saving)return;
  setSaving(true);setError('');
  try{setTeam(await setSportsTeamFeatures(team.id,{[field]:!team[field]},auth.token));}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível guardar a configuração.');}
  finally{setSaving(false);}
 };
 return <Page>
  <Button title="← Equipas" onPress={()=>router.push('/teams')}/>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {team?<><View style={styles.header}>
    <Text style={styles.title}>{team.name}</Text>
    <Text style={styles.note}>{team.sport||'Várias modalidades'} · {team.location||'Localização não indicada'}</Text>
    {team.description?<Text style={styles.note}>{team.description}</Text>:null}
   </View>
   <View style={styles.panel}><Text style={styles.heading}>Plantel</Text>
    <Text style={styles.note}>A gestão de jogadores e convites está em desenvolvimento.</Text></View>
   <View style={styles.panel}><Text style={styles.heading}>Competições</Text>
    <Text style={styles.note}>A participação em comunidades, sessões e torneios será ligada a esta identidade.</Text></View>
   <View style={styles.panel}><Text style={styles.heading}>Feed</Text>
    <Text style={styles.note}>{team.feedEnabled?'Ativado. Publicações de equipa ainda indisponíveis.':'Desativado'}</Text>
    {auth.username&&auth.token?<Text style={styles.note}>Apenas o responsável pode alterar esta opção.</Text>:null}
    <Button title={team.feedEnabled?'Desativar feed':'Ativar feed'} onPress={()=>void feature('feedEnabled')}/>
   </View>
   <View style={styles.panel}><Text style={styles.heading}>Chat</Text>
    <Text style={styles.note}>{team.chatEnabled?'Ativado. Mensagens de equipa ainda indisponíveis.':'Desativado'}</Text>
    <Button title={team.chatEnabled?'Desativar chat':'Ativar chat'} onPress={()=>void feature('chatEnabled')}/>
   </View>
  </>:null}
 </Page>;
}
const styles=StyleSheet.create({
 header:{padding:20,backgroundColor:C.surface,borderRadius:16,gap:8},
 title:{fontSize:27,fontWeight:'900',color:C.white},
 note:{fontSize:13,color:C.muted,lineHeight:20},
 heading:{fontSize:17,fontWeight:'800',color:C.white},
 panel:{padding:16,borderWidth:1,borderColor:C.border,borderRadius:16,gap:10}
});
