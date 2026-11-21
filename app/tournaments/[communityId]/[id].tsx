import React,{useCallback,useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {tournamentDetails,tournamentTable} from '../../../src/lib/competition-api';
import {communityDetails} from '../../../src/lib/community-api';
import {classificationKind,label,standingsColumns,isPerformanceKind} from '../../../src/lib/competition-core.cjs';
import {formatChessPoints} from '../../../src/lib/performance-core.cjs';
import {officialTournamentOutcome} from '../../../src/lib/tournament-outcome-core.cjs';
import {C} from '../../../src/lib/theme';
import {PublicShareCard} from '../../../src/components/PublicShareCard';
import type {JynloTournament,TournamentTable} from '../../../src/lib/types';
export default function TournamentDetailScreen(){
 const params=useLocalSearchParams<{communityId:string;id:string}>();
 const communityId=Number(params.communityId),id=Number(params.id);
 const auth=useAuth(),router=useRouter();
 const [tournament,setTournament]=useState<JynloTournament|null>(null);
 const [organizerRole,setOrganizerRole]=useState<string|null>(null);
 const [table,setTable]=useState<TournamentTable|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [tableError,setTableError]=useState('');
 const generation=useRef(0),requestVersion=useRef(0);
 const load=useCallback(async(version=generation.current)=>{
  const request=++requestVersion.current;
  if(version!==generation.current)return;
  // Invalidate previous private results before every explicit reload, not just focus.
  setTournament(null);setOrganizerRole(null);setTable(null);setTableError('');setError('');
  if(!auth.token||!auth.username){
   if(version===generation.current)setLoading(false);
   return;
  }
  if(!Number.isSafeInteger(communityId)||communityId<=0||!Number.isSafeInteger(id)||id<=0){
   if(version===generation.current){setError('Torneio inválido.');setLoading(false);}
   return;
  }
  setLoading(true);
  try{
   const [result,community]=await Promise.all([
    tournamentDetails(communityId,id,auth.token,auth.username),
    communityDetails(communityId,auth.token,auth.username)
   ]);
   if(version!==generation.current||request!==requestVersion.current)return;
   if(community.id!==communityId)throw Error('A comunidade devolvida não corresponde à selecionada.');
   if(!('myRole' in community)||!community.myRole)throw Error('Já não pertences a esta comunidade.');
   setOrganizerRole(community.myRole);
   setTournament(result);
   try{
    const standings=await tournamentTable(communityId,result,auth.token,auth.username);
    if(version===generation.current&&request===requestVersion.current)setTable(standings);
   }catch(e){
    if(version===generation.current&&request===requestVersion.current){
     setTable(null);
     setTableError(e instanceof Error?e.message:'Não foi possível carregar a classificação.');
    }
   }
  }catch(e){
   if(version===generation.current&&request===requestVersion.current)setError(e instanceof Error?e.message:'Não foi possível carregar o torneio.');
  }finally{if(version===generation.current&&request===requestVersion.current)setLoading(false);}
 },[communityId,id,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  setTournament(null);setOrganizerRole(null);setTable(null);setTableError('');setError('');setLoading(true);
  void load(version);
  return ()=>{generation.current++;};
 },[load]));
 const kind=tournament?classificationKind(tournament):'UNSUPPORTED';
 const officialOutcome=officialTournamentOutcome(tournament);
 return <Page><DemoBanner/><Eyebrow>COMPETIÇÃO JYNLO</Eyebrow>
   {!auth.token?<Button title="Entrar para ver torneio" onPress={()=>router.push('/login')}/>:null}
   {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
   {tournament?<><View style={styles.hero}>
     <Text style={styles.heroEyebrow}>TORNEIO · JYNLO</Text>
     <Text style={styles.title}>{tournament.name}</Text>
     <View style={styles.line}><Badge text={tournament.sport||'Multidesporto'}/><Badge text={tournament.status==='IN_PROGRESS'?'A decorrer':tournament.status==='DRAFT'?'Em preparação':'Concluído'}/></View>
     <Text style={styles.heroKind}>{label(kind)}</Text>
    </View>
     {auth.token?<PublicShareCard target={{kind:'TOURNAMENT',communityId,tournamentId:id}} name={tournament.name}
      token={auth.token} canManage={organizerRole==='OWNER'||organizerRole==='ADMIN'}/>:null}
     {officialOutcome?<View style={styles.panel}>
      <Text style={styles.heading}>{officialOutcome.title}</Text>
      <Text style={styles.meta}>{officialOutcome.detail}</Text>
     </View>:null}
     {tableError?<Message tone="error">A classificação não está disponível: {tableError}</Message>:null}
     {tableError?<Button secondary title="Tentar carregar novamente" onPress={()=>{void load();}}/>:null}
     {table?<View style={styles.panel}>
       <View style={styles.sectionHeading}><Text style={styles.heading}>Classificação</Text><Text style={styles.sectionCount}>{table.rows.length} {table.rows.length===1?'participante':'participantes'}</Text></View>
       <Text style={styles.columns}>{standingsColumns(kind).join('   ·   ')}</Text>
       {table.rows.map((row,i)=>{
        const r=row as unknown as Record<string,unknown>;
        const name=String(r.teamName??r.fullName??r.displayName??r.username??'Participante');
        const points=kind==='CHESS'?formatChessPoints(r.points):r.points;
        return <View key={i} style={styles.standing}>
          <View style={styles.positionBox}><Text style={styles.position}>{String(r.position??i+1)}</Text></View>
          <View style={styles.standingIdentity}><Text numberOfLines={2} style={styles.name}>{name}</Text>
            <Text style={styles.meta}>{`${r.played??'—'} ${kind==='CHESS'?'partidas':'jogos'} · ${r.won??'—'} vitórias · ${r.drawn??'—'} empates · ${r.lost??'—'} derrotas`}</Text></View>
          <View style={styles.pointsBox}><Text style={styles.points}>{points==null?'—':String(points)}</Text><Text style={styles.pointsLabel}>{kind==='CHESS'?'pontos':'pts'}</Text></View>
        </View>;
       })}
       {table.rows.length===0?<Text style={styles.meta}>Ainda não existem resultados para apresentar.</Text>:null}
       <Text style={styles.source}>{table.source}</Text>
     </View>:kind==='EVENT_RANKING'?<View style={styles.panel}>
       <Text style={styles.heading}>🏅 Classificação por provas</Text>
       <Text style={styles.meta}>Cada prova conta: os lugares dão pontos e a soma decide o campeão.</Text>
       <Button title="Ver provas e classificação" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/provas',params:{communityId:String(communityId),id:String(id)}})}/>
     </View>:!tableError&&!isPerformanceKind(kind)?<Message>Esta modalidade tem regras próprias. Não aplicamos classificações de futebol sem confirmação das regras.</Message>:null}
     {isPerformanceKind(kind)?<Button title={kind==='RACE'?'Ver resultados de corridas':kind==='TIMED'?'Ver tempos da prova':kind==='MEASURED'?'Ver marcas da prova':'Ver resultados das estafetas'} onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/results',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {(organizerRole==='OWNER'||organizerRole==='ADMIN')&&['RACE','TIMED','MEASURED'].includes(kind)?<Button secondary title="Gerir jornadas da competição" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/events',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {kind==='RELAY'&&(organizerRole==='OWNER'||organizerRole==='ADMIN')?<Button secondary title="Gerir séries, final e júri" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/relays',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {kind==='INDIVIDUAL'||kind==='CHESS'?<Button secondary title="Calendário e jogos individuais" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/matches',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {tournament.entryType!=='TEAM'?<Button secondary title="Participantes e inscrições" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/participants',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {tournament.entryType==='TEAM'&&!isPerformanceKind(kind)?<Button title="Equipas e convites" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/teams',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {tournament.entryType==='TEAM'&&kind==='TEAM'?<Button secondary title={tournament.format==='GROUP_KNOCKOUT'?'Fase de grupos e eliminatórias':tournament.format==='KNOCKOUT'?'Ver eliminatórias':'Calendário de jogos'} onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/fixtures',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {(organizerRole==='OWNER'||organizerRole==='ADMIN')&&kind!=='EVENT_RANKING'?<Button secondary title="Gerir competição" onPress={()=>router.push({pathname:"/tournaments/[communityId]/[id]/manage",params:{communityId:String(communityId),id:String(id)}})}/>:null}
     <Button secondary title="Voltar aos torneios" onPress={()=>router.back()}/>
   </>:null}
 </Page>;
}
const styles=StyleSheet.create({
 hero:{gap:12,padding:19,borderWidth:1,borderColor:'#40D4B958',borderRadius:20,backgroundColor:'#0A303D'},
 heroEyebrow:{fontSize:11,color:'#72F2D8',letterSpacing:1.4,fontWeight:'900'},
 title:{color:C.white,fontSize:28,lineHeight:34,fontWeight:'900',letterSpacing:-0.6},
 line:{flexDirection:'row',gap:8,flexWrap:'wrap'},heroKind:{color:'#BBE2E1',fontSize:14,fontWeight:'700'},
 sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'},
 sectionCount:{color:'#99DDCE',fontSize:12,fontWeight:'800'},
 heading:{color:C.white,fontSize:19,fontWeight:'900'},
 panel:{backgroundColor:'#082B3A',borderColor:'#3DC4B04D',borderWidth:1,borderRadius:18,padding:16,gap:12},
 columns:{fontSize:11,color:'#98E6D6',fontWeight:'800',lineHeight:17},
 standing:{flexDirection:'row',alignItems:'center',borderTopColor:'#3BAEAB34',borderTopWidth:1,paddingVertical:12,gap:11,minWidth:0},
 positionBox:{width:34,height:34,borderRadius:11,backgroundColor:'#135E59',alignItems:'center',justifyContent:'center'},
 position:{color:'#A0FFE3',fontWeight:'900',fontSize:15},
 standingIdentity:{flex:1,minWidth:0,gap:4},name:{color:C.white,fontWeight:'800',fontSize:14,lineHeight:19},
 meta:{fontSize:11,color:'#ACCAD2',lineHeight:16},
 pointsBox:{minWidth:50,paddingHorizontal:7,alignItems:'center',gap:3},
 points:{color:'#7FF5D6',fontWeight:'900',fontSize:18},
 pointsLabel:{color:'#B5D2DA',fontSize:10,fontWeight:'800'},
 source:{color:C.muted,fontSize:10,marginTop:10,lineHeight:16}
});
