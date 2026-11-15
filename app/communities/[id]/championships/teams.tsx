import React,{useCallback,useRef,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {communityDetails} from '../../../../src/lib/community-api';
import {communityChampionships,getChampionshipTeams,createChampionshipTeam,linkChampionshipTeam,type ChampionshipTeams} from '../../../../src/lib/championship-api';
import {C} from '../../../../src/lib/theme';
import {CompetitionTeamSearch} from '../../../../src/components/CompetitionTeamSearch';

export default function ChampionshipTeamsScreen(){
 const params=useLocalSearchParams<{id:string;championshipId:string}>();
 const communityId=Number(params.id),championshipId=Number(params.championshipId),auth=useAuth(),router=useRouter();
 const [data,setData]=useState<ChampionshipTeams|null>(null);
 const [organizer,setOrganizer]=useState(false),[closed,setClosed]=useState(false);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [name,setName]=useState(''),[selected,setSelected]=useState<Record<number,number>>({}),[retry,setRetry]=useState(0);
 const savingRef=useRef(false);
 useFocusEffect(useCallback(()=>{
  let active=true;
  setLoading(true);setError('');setData(null);setOrganizer(false);setClosed(false);
  async function load(){
   try{
    if(!auth.token||!auth.username||!Number.isSafeInteger(communityId)||communityId<=0||!Number.isSafeInteger(championshipId)||championshipId<=0)
     throw Error('Inicia sessão e seleciona um campeonato válido.');
    const [teams,championships,group]=await Promise.all([
     getChampionshipTeams(communityId,championshipId,auth.token),
     communityChampionships(communityId,auth.token),
     communityDetails(communityId,auth.token,auth.username)
    ]);
    if(!active)return;
    const championship=championships.find(c=>c.id===championshipId);
    if(!championship)throw Error('Campeonato não encontrado ou sem acesso.');
    const role='myRole' in group?group.myRole:null;
    setOrganizer(role==='OWNER'||role==='ADMIN');
    setClosed(!!championship.closedAt);
    setData(teams);
   }catch(e){if(active)setError(e instanceof Error?e.message:'Não foi possível consultar equipas.');}
   finally{if(active)setLoading(false);}
  }
  void load();return()=>{active=false;};
 },[communityId,championshipId,auth.token,auth.username,retry]));
 async function update(action:()=>Promise<ChampionshipTeams>){
  if(savingRef.current||saving||closed||!organizer||!auth.token||!data)return;
  savingRef.current=true;setSaving(true);setError('');
  try{const next=await action();setData(next);setName('');setSelected({});}
  catch(e){setError((e instanceof Error?e.message:'Não foi possível guardar a alteração.')+' Confirma o estado antes de repetir.');}
  finally{savingRef.current=false;setSaving(false);}
 }
 return <Page><DemoBanner/><Eyebrow>EQUIPAS DA ÉPOCA</Eyebrow>
  <Text style={styles.heading}>Equipas do campeonato</Text>
  <Text style={styles.hint}>Uma equipa pode disputar várias provas com identificadores diferentes. Associa cada equipa da prova à sua equipa do campeonato.</Text>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error&&!data?<Button secondary title="Tentar novamente" onPress={()=>setRetry(x=>x+1)}/>:null}
  {closed?<Message>Este campeonato está encerrado. As associações são apenas de leitura.</Message>:null}
  {data?<View style={styles.card}>
   <Text style={styles.title}>Equipas da época ({data.teams.length})</Text>
   {data.teams.length===0?<Text style={styles.hint}>Ainda não existem equipas definidas nesta época.</Text>:null}
   {data.teams.map(team=><Text key={team.id} style={styles.team}>• {team.name}</Text>)}
   {organizer&&!closed?<View style={styles.section}>
    <Text style={styles.label}>Nova equipa da época</Text>
    <TextInput style={styles.input} placeholder="Nome da equipa" placeholderTextColor={C.muted} maxLength={100} value={name} editable={!saving} onChangeText={setName}/>
    <Button title={saving?'A guardar…':'Criar equipa'} disabled={saving||!name.trim()} onPress={()=>Alert.alert('Criar equipa?',name.trim(),[
     {text:'Cancelar',style:'cancel'},{text:'Criar',onPress:()=>{void update(()=>createChampionshipTeam(communityId,championshipId,name,auth.token!));}}
    ])}/>
   </View>:null}
   {organizer&&!closed&&auth.token?<CompetitionTeamSearch communityId={communityId} competitionId={championshipId} type="CHAMPIONSHIP" token={auth.token}/>:null}
  </View>:null}
  {data?<View style={styles.card}>
   <Text style={styles.title}>Equipas das provas ({data.competitionTeams.length})</Text>
   {data.competitionTeams.length===0?<Text style={styles.hint}>Ainda não existem equipas de torneios associados a este campeonato.</Text>:null}
   {data.competitionTeams.map(entry=>{
    const linked=data.teams.find(team=>team.id===entry.championshipTeamId);
    const picked=selected[entry.id]??entry.championshipTeamId;
    const conflictingTeamIds=new Set(data.competitionTeams
     .filter(other=>other.tournamentId===entry.tournamentId&&other.id!==entry.id&&other.championshipTeamId!==null)
     .map(other=>other.championshipTeamId));
    return <View key={entry.id} style={styles.section}>
     <Text style={styles.label}>{entry.name}</Text>
     <Text style={styles.hint}>{entry.tournamentName} · {linked?'Equipa da época: '+linked.name:'Sem associação'}</Text>
     {organizer&&!closed?<View style={styles.section}>
      {data.teams.map(team=><Pressable key={team.id} onPress={()=>setSelected(current=>({...current,[entry.id]:team.id}))} disabled={saving||conflictingTeamIds.has(team.id)} accessibilityRole="radio" accessibilityState={{selected:picked===team.id,disabled:conflictingTeamIds.has(team.id)}} style={[styles.choice,picked===team.id&&styles.selected,conflictingTeamIds.has(team.id)&&styles.unavailable]}>
       <Text style={styles.team}>{picked===team.id?'●':'○'} {team.name}{conflictingTeamIds.has(team.id)?' · Já utilizada nesta prova':''}</Text>
      </Pressable>)}
      <Button secondary title="Guardar associação" disabled={saving||!picked||picked===entry.championshipTeamId||conflictingTeamIds.has(picked)} onPress={()=>{
       if(!picked)return;
       const target=data.teams.find(team=>team.id===picked);
       Alert.alert('Associar equipa?',entry.name+' → '+(target?.name||''),[
        {text:'Cancelar',style:'cancel'},
        {text:'Associar',onPress:()=>{void update(()=>linkChampionshipTeam(communityId,championshipId,entry.id,picked,auth.token!));}}
       ]);
      }}/>
      {!saving&&data.teams.length===0?<Text style={styles.hint}>Cria primeiro uma equipa da época para poderes fazer esta associação.</Text>:
       !saving&&picked===entry.championshipTeamId?<Text style={styles.hint}>Esta equipa já está associada. Seleciona outra para alterar.</Text>:
       !saving&&conflictingTeamIds.has(picked)?<Text style={styles.hint}>Esta equipa já está utilizada nesta prova. Escolhe outra equipa disponível.</Text>:null}
     </View>:null}
    </View>;
   })}
  </View>:null}
  <Button secondary title="Voltar ao campeonato" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 heading:{fontSize:25,fontWeight:'900',color:C.white},hint:{fontSize:13,lineHeight:20,color:C.muted},
 card:{padding:16,borderRadius:18,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,gap:12},
 title:{color:C.white,fontWeight:'900',fontSize:18},label:{color:C.white,fontWeight:'800',fontSize:15},
 team:{color:C.white,fontSize:14},section:{gap:9,paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.border},
 input:{borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,color:C.white,backgroundColor:C.surface2},
 choice:{padding:12,backgroundColor:C.surface2,borderWidth:1,borderColor:C.border,borderRadius:12},
 selected:{borderColor:C.mint},unavailable:{opacity:0.45}
});
