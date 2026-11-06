import React,{useCallback,useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {tournamentDetails,tournamentTable} from '../../../src/lib/competition-api';
import {communityDetails} from '../../../src/lib/community-api';
import {classificationKind,label,standingsColumns,isPerformanceKind} from '../../../src/lib/competition-core.cjs';
import {formatChessPoints} from '../../../src/lib/performance-core.cjs';
import {C} from '../../../src/lib/theme';
import type {JynloTournament,TournamentTable} from '../../../src/lib/types';
export default function TournamentDetailScreen(){
 const params=useLocalSearchParams<{communityId:string;id:string}>();
 const communityId=Number(params.communityId),id=Number(params.id);
 const auth=useAuth(),router=useRouter();
 const [tournament,setTournament]=useState<JynloTournament|null>(null);
 const [organizerRole,setOrganizerRole]=useState<string|null>(null);
 const [table,setTable]=useState<TournamentTable|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const generation=useRef(0);
 const load=useCallback(async(version=generation.current)=>{
  if(!auth.token||!auth.username){
   if(version===generation.current)setLoading(false);
   return;
  }
  if(!Number.isSafeInteger(communityId)||communityId<=0||!Number.isSafeInteger(id)||id<=0){
   if(version===generation.current){setError('Torneio inválido.');setLoading(false);}
   return;
  }
  setLoading(true);setError('');
  try{
   const [result,community]=await Promise.all([
    tournamentDetails(communityId,id,auth.token,auth.username),
    communityDetails(communityId,auth.token,auth.username)
   ]);
   if(version!==generation.current)return;
   if(community.id!==communityId)throw Error('A comunidade devolvida não corresponde à selecionada.');
   if(!('myRole' in community)||!community.myRole)throw Error('Já não pertences a esta comunidade.');
   setOrganizerRole(community.myRole);
   setTournament(result);
   const standings=await tournamentTable(communityId,result,auth.token,auth.username);
   if(version===generation.current)setTable(standings);
  }catch(e){
   if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar o torneio.');
  }finally{if(version===generation.current)setLoading(false);}
 },[communityId,id,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  setTournament(null);setOrganizerRole(null);setTable(null);setError('');setLoading(true);
  void load(version);
  return ()=>{generation.current++;};
 },[load]));
 const kind=tournament?classificationKind(tournament):'UNSUPPORTED';
 return <Page><DemoBanner/><Eyebrow>COMPETIÇÃO JYNLO</Eyebrow>
   {!auth.token?<Button title="Entrar para ver torneio" onPress={()=>router.push('/login')}/>:null}
   {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
   {tournament?<><Text style={styles.title}>{tournament.name}</Text>
     <View style={styles.line}><Badge text={tournament.sport||'Multidesporto'}/><Badge text={tournament.status==='IN_PROGRESS'?'A decorrer':tournament.status==='DRAFT'?'Em preparação':'Concluído'}/></View>
     <Text style={styles.heading}>{label(kind)}</Text>
     {table?<View style={styles.panel}>
       <Text style={styles.columns}>{standingsColumns(kind).join('   ·   ')}</Text>
       {table.rows.map((row,i)=>{
        const r=row as unknown as Record<string,unknown>;
        const name=String(r.teamName??r.fullName??r.displayName??r.username??'Participante');
        const points=kind==='CHESS'?formatChessPoints(r.points):r.points;
        return <View key={i} style={styles.standing}><Text style={styles.position}>{String(r.position)}.</Text>
          <View style={{flex:1}}><Text style={styles.name}>{name}</Text>
            <Text style={styles.meta}>{`${r.played??'—'} ${kind==='CHESS'?'partidas':'jogos'} · ${r.won??'—'} vitórias · ${r.drawn??'—'} empates · ${r.lost??'—'} derrotas`}</Text></View>
          <Text style={styles.points}>{points==null?'—':String(points)} {kind==='CHESS'?'pontos':'pts'}</Text>
        </View>;
       })}
       {table.rows.length===0?<Text style={styles.meta}>Ainda não existem resultados para apresentar.</Text>:null}
       <Text style={styles.source}>{table.source}</Text>
     </View>:!isPerformanceKind(kind)?<Message>Esta modalidade tem regras próprias. Não aplicamos classificações de futebol sem confirmação das regras.</Message>:null}
     {isPerformanceKind(kind)?<Button title={kind==='RACE'?'Ver resultados de corridas':kind==='TIMED'?'Ver tempos da prova':kind==='MEASURED'?'Ver marcas da prova':'Ver resultados das estafetas'} onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/results',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {(organizerRole==='OWNER'||organizerRole==='ADMIN')&&['RACE','TIMED','MEASURED'].includes(kind)?<Button secondary title="Gerir jornadas da competição" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/events',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {kind==='RELAY'&&(organizerRole==='OWNER'||organizerRole==='ADMIN')?<Button secondary title="Gerir séries, final e júri" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/relays',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {kind==='INDIVIDUAL'||kind==='CHESS'?<Button secondary title="Calendário e jogos individuais" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/matches',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {tournament.entryType!=='TEAM'?<Button secondary title="Participantes e inscrições" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/participants',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {tournament.entryType==='TEAM'&&!isPerformanceKind(kind)?<Button title="Equipas e convites" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/teams',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {tournament.entryType==='TEAM'&&kind==='TEAM'?<Button secondary title={tournament.format==='GROUP_KNOCKOUT'?'Fase de grupos e eliminatórias':tournament.format==='KNOCKOUT'?'Ver eliminatórias':'Calendário de jogos'} onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/fixtures',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {(organizerRole==='OWNER'||organizerRole==='ADMIN')?<Button secondary title="Gerir competição" onPress={()=>router.push({pathname:"/tournaments/[communityId]/[id]/manage",params:{communityId:String(communityId),id:String(id)}})}/>:null}
     <Button secondary title="Voltar aos torneios" onPress={()=>router.back()}/>
   </>:null}
 </Page>;
}
const styles=StyleSheet.create({title:{color:C.white,fontSize:29,fontWeight:'900'},line:{flexDirection:'row',gap:8,flexWrap:'wrap'},heading:{color:C.white,fontSize:20,fontWeight:'900'},
 panel:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:18,padding:16,gap:11},columns:{fontSize:11,color:C.mint,fontWeight:'800'},
 standing:{flexDirection:'row',alignItems:'center',borderTopColor:C.border,borderTopWidth:1,paddingTop:12,gap:9},position:{width:23,color:C.mint,fontWeight:'900',fontSize:18},
 name:{color:C.white,fontWeight:'800',fontSize:14},meta:{fontSize:11,color:C.muted,marginTop:4},points:{color:C.mint,fontWeight:'900',fontSize:13},source:{color:C.muted,fontSize:10,marginTop:10}});
