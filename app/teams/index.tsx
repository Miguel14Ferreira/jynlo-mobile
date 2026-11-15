import React,{useCallback,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {createSportsTeam,discoverSportsTeams,SportsTeam} from '../../src/lib/sports-teams-api';
import {C} from '../../src/lib/theme';

export default function TeamsScreen(){
 const auth=useAuth(),router=useRouter();
 const [teams,setTeams]=useState<SportsTeam[]>([]),[query,setQuery]=useState('');
 const [name,setName]=useState(''),[sport,setSport]=useState(''),[location,setLocation]=useState('');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{
   setLoading(true);setError('');
   try{setTeams(await discoverSportsTeams(query,auth.token||undefined));}
   catch(e){setError(e instanceof Error?e.message:'Erro a carregar equipas.');}
   finally{setLoading(false);}
 },[query,auth.token]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const create=async()=>{
  if(!auth.token){router.push('/login');return;}
  if(saving||!name.trim())return;
  setSaving(true);setError('');
  try{
   const team=await createSportsTeam({name,sport,location},auth.token);
   setName('');setSport('');setLocation('');
   router.push({pathname:'/teams/[id]',params:{id:String(team.id)}});
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a equipa.');}
  finally{setSaving(false);}
 };
 return <Page><Brand subtitle="AS TUAS EQUIPAS"/><DemoBanner/>
  <Text style={styles.title}>Equipas</Text>
  <Text style={styles.note}>Cria uma equipa independente para participar em várias comunidades e competições.</Text>
  <TextInput style={styles.input} value={query} onChangeText={setQuery}
    placeholder="Pesquisar equipas" placeholderTextColor={C.muted} accessibilityLabel="Pesquisar equipas"/>
  <Button title="Pesquisar" onPress={()=>void load()}/>
  {auth.token?<View style={styles.section}>
   <Text style={styles.heading}>Criar equipa</Text>
   <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={100}
    placeholder="Nome da equipa" placeholderTextColor={C.muted}/>
   <TextInput style={styles.input} value={sport} onChangeText={setSport} maxLength={100}
    placeholder="Modalidade" placeholderTextColor={C.muted}/>
   <TextInput style={styles.input} value={location} onChangeText={setLocation} maxLength={100}
    placeholder="Localização" placeholderTextColor={C.muted}/>
   <Button title={saving?'A criar…':'Criar equipa'} onPress={()=>void create()}/>
  </View>:<Button title="Iniciar sessão para criar equipa" onPress={()=>router.push('/login')}/>}
  {error?<Message tone="error">{error}</Message>:null}
  {loading?<Loader/>:teams.length===0?<Message>Não foram encontradas equipas.</Message>:
    teams.map(team=><Pressable key={team.id} style={styles.card}
      onPress={()=>router.push({pathname:'/teams/[id]',params:{id:String(team.id)}})}>
      <Text style={styles.heading}>{team.name} ›</Text>
      <Text style={styles.note}>{team.sport||'Várias modalidades'} · {team.location||'Localização não indicada'}</Text>
    </Pressable>)}
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:30,fontWeight:'900',color:C.white},
 note:{fontSize:13,color:C.muted,lineHeight:20},
 heading:{fontSize:17,fontWeight:'800',color:C.white},
 input:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:12,
  color:C.white,paddingHorizontal:15,paddingVertical:13,minHeight:48},
 section:{gap:10,padding:15,backgroundColor:C.surface,borderRadius:16},
 card:{padding:16,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,gap:7}
});
