import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {createSportsTeam,discoverSportsTeams,mySportsTeams,joinedSportsTeams,mySportsTeamInvitations,respondSportsTeamInvitation,SportsTeam,SportsTeamInvitation} from '../../src/lib/sports-teams-api';
import {C} from '../../src/lib/theme';
import {JynloIcon} from '../../src/components/JynloIcon';
import TeamBrandAvatar from '../../src/components/TeamBrandAvatar';
import {myTeamCompetitionInvitations,answerTeamCompetitionInvitation,type TeamCompetitionInvitation} from '../../src/lib/team-competition-invitations-api';

export default function TeamsScreen(){
 const auth=useAuth(),router=useRouter();
 const [owned,setOwned]=useState<SportsTeam[]>([]),[joined,setJoined]=useState<SportsTeam[]>([]),[teams,setTeams]=useState<SportsTeam[]>([]),[invites,setInvites]=useState<SportsTeamInvitation[]>([]),[competitionInvites,setCompetitionInvites]=useState<TeamCompetitionInvitation[]>([]),[query,setQuery]=useState('');
 const [name,setName]=useState(''),[sport,setSport]=useState(''),[location,setLocation]=useState('');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [joinedError,setJoinedError]=useState('');
 const [createOpen,setCreateOpen]=useState(false);
 const [submittedQuery,setSubmittedQuery]=useState('');
 const requestVersion=useRef(0);
 const reading=useRef<number|null>(null),savingRef=useRef(false);
 useEffect(()=>{savingRef.current=saving;},[saving]);
 // A different authenticated account must never inherit the previous account's private team lists.
 useEffect(()=>{
   requestVersion.current++;reading.current=null;
   setOwned([]);setJoined([]);setInvites([]);setCompetitionInvites([]);
   setTeams([]);setJoinedError('');setError('');setLoading(true);
   setCreateOpen(false);setName('');setSport('');setLocation('');
 },[auth.token]);
 const load=useCallback(async(silent=false,force=false)=>{
   if(!force&&(reading.current===requestVersion.current||savingRef.current))return;
   const version=++requestVersion.current;
   reading.current=version;
   if(!silent){setLoading(true);setError('');}
   try{
    // Convites são secundários: um endpoint antigo/temporariamente indisponível
    // não pode impedir o acesso às equipas, nem apagar resultados já carregados.
    const [discovery,mine,memberTeams,memberships,competitions]=await Promise.allSettled([
      discoverSportsTeams(submittedQuery,auth.token||undefined),
      auth.token?mySportsTeams(auth.token):Promise.resolve([]),
      auth.token?joinedSportsTeams(auth.token):Promise.resolve([]),
      auth.token?mySportsTeamInvitations(auth.token):Promise.resolve([]),
      auth.token?myTeamCompetitionInvitations(auth.token):Promise.resolve([])
    ]);
    if(reading.current===version)reading.current=null;
    if(version!==requestVersion.current)return;
    const failed:string[]=[];
    if(discovery.status==='fulfilled')setTeams(discovery.value);
    else failed.push('pesquisa');
    if(mine.status==='fulfilled')setOwned(mine.value);
    else failed.push('as tuas equipas');
    if(memberTeams.status==='fulfilled'){setJoined(memberTeams.value);setJoinedError('');}
    else setJoinedError('Não foi possível confirmar as equipas onde participas.');
    if(memberships.status==='fulfilled')setInvites(memberships.value);
    else failed.push('convites de jogadores');
    if(competitions.status==='fulfilled')setCompetitionInvites(competitions.value.filter(x=>x.status==='PENDING'));
    else failed.push('convites para competições');
    if(failed.length&&!silent)setError('Não foi possível carregar '+failed.join(', ')+'. As restantes secções continuam disponíveis. Podes tentar novamente.');
   }catch(e){if(!silent&&version===requestVersion.current)setError(e instanceof Error?e.message:'Erro a carregar equipas.');}
   finally{
    if(reading.current===version)reading.current=null;
    if(!silent&&version===requestVersion.current)setLoading(false);
   }
 },[submittedQuery,auth.token]);
 const search=()=>{const next=query.trim();if(next===submittedQuery){void load();}else setSubmittedQuery(next);};
 useFocusEffect(useCallback(()=>{
   void load();
   const timer=setInterval(()=>{
    if(AppState.currentState==='active'&&!savingRef.current)void load(true);
   },60000);
   const resume=AppState.addEventListener('change',state=>{
    if(state==='active'&&!savingRef.current)void load(true);
   });
   return ()=>{clearInterval(timer);resume.remove();requestVersion.current++;};
 },[load]));
 const respond=async(teamId:number,accept:boolean)=>{
  if(!auth.token||savingRef.current)return;
  savingRef.current=true;setSaving(true);setError('');
  try{await respondSportsTeamInvitation(teamId,accept,auth.token);await load(false,true);}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível responder ao convite.');}
  finally{savingRef.current=false;setSaving(false);}
 };
 const respondCompetition=async(id:number,accept:boolean)=>{
  if(!auth.token||savingRef.current)return;
  savingRef.current=true;setSaving(true);setError('');
  try{await answerTeamCompetitionInvitation(id,accept,auth.token);await load(false,true);}
  catch(e){setError((e instanceof Error?e.message:'Erro ao responder.')+' Verifica o convite antes de repetir.');}
  finally{savingRef.current=false;setSaving(false);}
 };
 const create=async()=>{
  if(!auth.token){router.push('/login');return;}
  if(savingRef.current||name.trim().length<2)return;
  savingRef.current=true;setSaving(true);setError('');
  try{
   const team=await createSportsTeam({name,sport,location},auth.token);
   setName('');setSport('');setLocation('');
   router.push({pathname:'/teams/[id]',params:{id:String(team.id)}});
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a equipa.');}
  finally{savingRef.current=false;setSaving(false);}
 };
 return <Page><Brand subtitle="AS TUAS EQUIPAS"/><DemoBanner/>
  <View style={styles.hero}>
   <View style={styles.heroEmblem}><JynloIcon name="community" size={29} color={C.mint}/></View>
   <Text style={styles.heroEyebrow}>JOGA EM EQUIPA</Text>
   <Text style={styles.title}>O teu clube. A tua história.</Text>
   <Text style={styles.heroSub}>Junta a malta, entra em competições e leva a equipa contigo para todas as épocas.</Text>
   <Button title="Encontrar torneios e campeonatos" onPress={()=>router.push('/teams/competitions')}/>
  </View>
  {auth.token?<Button title={createOpen?'Fechar criação de equipa':'+ Criar nova equipa'} secondary onPress={()=>setCreateOpen(open=>!open)}/>
   :<Button title="Iniciar sessão para criar equipa" onPress={()=>router.push('/login')}/>}
  {auth.token&&createOpen?<View style={styles.section}>
   <Text style={styles.heading}>Dá identidade à tua equipa</Text>
   <Text style={styles.note}>Depois de criares a equipa, podes convidar jogadores.</Text>
   <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={100}
    placeholder="Nome da equipa" placeholderTextColor={C.muted} accessibilityLabel="Nome da nova equipa"/>
   <TextInput style={styles.input} value={sport} onChangeText={setSport} maxLength={100}
    placeholder="Modalidade" placeholderTextColor={C.muted} accessibilityLabel="Modalidade da equipa"/>
   <TextInput style={styles.input} value={location} onChangeText={setLocation} maxLength={100}
    placeholder="Localização" placeholderTextColor={C.muted} accessibilityLabel="Localização da equipa"/>
   <Button title={saving?'A criar…':'Criar equipa'} disabled={saving||name.trim().length<2} onPress={()=>void create()}/>
  </View>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {invites.length>0?<View style={styles.section}>
   <Text style={styles.heading}>Convites para equipas</Text>
   {invites.map(x=><View key={x.teamId} style={styles.card}>
     <Text style={styles.heading}>{x.teamName}</Text>
     <Button title="Aceitar convite" disabled={saving} onPress={()=>void respond(x.teamId,true)}/>
     <Button title="Recusar convite" disabled={saving} onPress={()=>void respond(x.teamId,false)}/>
   </View>)}
  </View>:null}
  {competitionInvites.length>0?<View style={styles.section}>
   <Text style={styles.heading}>Convites para competições</Text>
   {competitionInvites.map(x=><View key={x.id} style={styles.card}>
    <Text style={styles.heading}>{x.teamName}</Text>
    <Text style={styles.note}>{x.competitionType==='TOURNAMENT'?'Torneio':'Campeonato'} · Convite pendente</Text>
    <Text style={styles.note}>Aceitar confirma o interesse da equipa; a inscrição competitiva é concluída pelo organizador.</Text>
    <Button title="Aceitar convite" disabled={saving} onPress={()=>void respondCompetition(x.id,true)}/>
    <Button title="Recusar convite" disabled={saving} onPress={()=>void respondCompetition(x.id,false)}/>
   </View>)}
  </View>:null}
  {auth.token?<View style={styles.section}>
    <View style={styles.sectionHeader}><Text style={styles.heading}>As minhas equipas</Text><Text style={styles.count}>{owned.length}</Text></View>
    {!loading&&!error&&owned.length===0?<View style={styles.empty}>
      <JynloIcon name="community" size={27} color={C.mint}/>
      <Text style={styles.heading}>{joined.length?'Ainda não administras uma equipa':'A tua primeira equipa começa aqui'}</Text>
      <Text style={styles.note}>{joined.length?'Já fazes parte de um plantel. Também podes criar a tua própria equipa.':'Cria uma equipa e mantém os teus jogadores e o histórico unidos.'}</Text>
      <Button title="Criar equipa" secondary onPress={()=>setCreateOpen(true)}/>
    </View>:null}
    {owned.map(team=><Pressable key={team.id} style={({pressed})=>[styles.card,pressed&&styles.pressed]}
       accessibilityRole="button" accessibilityLabel={'Abrir equipa '+team.name}
       onPress={()=>router.push({pathname:'/teams/[id]',params:{id:String(team.id)}})}>
       <View style={styles.teamRow}><TeamBrandAvatar team={team} size={56}/>
       <View style={styles.teamCopy}><Text style={styles.heading} numberOfLines={2}>{team.name}</Text>
       <Text style={styles.note} numberOfLines={1}>{team.sport||'Várias modalidades'} · {team.location||'Localização por definir'}</Text></View>
       <JynloIcon name="chevron-right" color={C.mint} size={22}/></View>
    </Pressable>)}
  </View>:null}
  {auth.token?<View style={styles.section}>
    <View style={styles.sectionHeader}><Text style={styles.heading}>Equipas onde és jogador</Text><Text style={styles.count}>{joined.length}</Text></View>
    <Text style={styles.note}>Acede às mensagens, às publicações e ao plantel das equipas onde aceitaste um convite.</Text>
    {joinedError?<Message tone="error">{joinedError}</Message>:null}
    {joined.map(team=><Pressable key={team.id} style={({pressed})=>[styles.card,pressed&&styles.pressed]}
      accessibilityRole="button" accessibilityLabel={'Abrir equipa onde és jogador '+team.name}
      onPress={()=>router.push({pathname:'/teams/[id]',params:{id:String(team.id)}})}>
      <View style={styles.teamRow}><TeamBrandAvatar team={team} size={56}/>
       <View style={styles.teamCopy}><Text style={styles.heading} numberOfLines={2}>{team.name}</Text>
        <Text style={styles.note} numberOfLines={1}>{team.sport||'Várias modalidades'} · Jogador confirmado</Text></View>
       <JynloIcon name="chevron-right" color={C.mint} size={22}/></View>
    </Pressable>)}
  </View>:null}
  <View style={styles.section}>
    <View style={styles.sectionHeader}><Text style={styles.heading}>Descobrir equipas</Text><JynloIcon name="search" color={C.mint} size={20}/></View>
    <TextInput style={styles.input} value={query} onChangeText={setQuery}
       placeholder="Nome, modalidade ou cidade" placeholderTextColor={C.muted} accessibilityLabel="Pesquisar equipas"
       returnKeyType="search" onSubmitEditing={search}/>
    <Button title="Pesquisar" secondary onPress={search}/>
    {loading?<Loader/>:teams.length===0?<View style={styles.empty}><Text style={styles.note}>Não encontrámos equipas. Experimenta outra pesquisa.</Text></View>:
      teams.map(team=><Pressable key={team.id} style={({pressed})=>[styles.card,pressed&&styles.pressed]}
        accessibilityRole="button" accessibilityLabel={'Ver equipa '+team.name}
        onPress={()=>router.push({pathname:'/teams/[id]',params:{id:String(team.id)}})}>
        <View style={styles.teamRow}><TeamBrandAvatar team={team} size={56}/>
        <View style={styles.teamCopy}><Text style={styles.heading} numberOfLines={2}>{team.name}</Text>
        <Text style={styles.note} numberOfLines={1}>{team.sport||'Várias modalidades'} · {team.location||'Localização não indicada'}</Text></View>
        <JynloIcon name="chevron-right" color={C.mint} size={22}/></View>
      </Pressable>)}
  </View>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:31,fontWeight:'900',color:C.white,lineHeight:37,letterSpacing:-.7},
 note:{fontSize:13,color:C.muted,lineHeight:20},
 heading:{fontSize:17,fontWeight:'800',color:C.white,flexShrink:1},
 hero:{backgroundColor:'#12352C',borderWidth:1,borderColor:'#2A6754',borderRadius:24,padding:21,gap:13},
 heroEmblem:{backgroundColor:'#225342',borderRadius:17,width:56,height:56,alignItems:'center',justifyContent:'center'},
 heroEyebrow:{fontSize:10,color:C.mint,fontWeight:'900',letterSpacing:1.5},
 heroSub:{fontSize:14,color:'#D5E6DD',lineHeight:22},
 input:{backgroundColor:C.surface2,borderWidth:1,borderColor:C.border,borderRadius:14,
  color:C.white,paddingHorizontal:15,paddingVertical:13,minHeight:50},
 section:{gap:12,padding:16,backgroundColor:C.surface,borderRadius:20,borderWidth:1,borderColor:C.border},
 sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:9},
 count:{backgroundColor:'#17483A',color:C.mint,fontWeight:'900',fontSize:12,borderRadius:15,
  paddingHorizontal:11,paddingVertical:5,overflow:'hidden'},
 card:{padding:14,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface2,gap:7},
 teamRow:{flexDirection:'row',alignItems:'center',gap:12},
 teamIcon:{width:48,height:48,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'#204639'},
 teamCopy:{flex:1,minWidth:0,gap:3},
 empty:{borderWidth:1,borderStyle:'dashed',borderColor:C.border,borderRadius:16,padding:19,gap:12,alignItems:'center'},
 pressed:{opacity:.76}
});
