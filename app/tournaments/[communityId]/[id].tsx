import React,{useCallback,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {tournamentDetails,tournamentTable} from '../../../src/lib/competition-api';
import {classificationKind,label,standingsColumns} from '../../../src/lib/competition-core.cjs';
import {C} from '../../../src/lib/theme';
import type {JynloTournament,TournamentTable} from '../../../src/lib/types';
export default function TournamentDetailScreen(){
 const params=useLocalSearchParams<{communityId:string;id:string}>();
 const communityId=Number(params.communityId),id=Number(params.id);
 const auth=useAuth(),router=useRouter();
 const [tournament,setTournament]=useState<JynloTournament|null>(null);
 const [table,setTable]=useState<TournamentTable|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!auth.token||!auth.username){setLoading(false);return;}
  setLoading(true);setError('');
  try{const result=await tournamentDetails(communityId,id,auth.token,auth.username);
    setTournament(result);setTable(await tournamentTable(communityId,result,auth.token,auth.username));}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar o torneio.');}
  finally{setLoading(false);}
 },[communityId,id,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
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
        const points=kind==='RACE'?r.championshipPoints:r.points;
        return <View key={i} style={styles.standing}><Text style={styles.position}>{String(r.position)}.</Text>
          <View style={{flex:1}}><Text style={styles.name}>{name}</Text>
            <Text style={styles.meta}>{kind==='RACE'?`${r.races} corridas · ${r.podiums} pódios`:`${r.played} jogos · ${r.won} vitórias`}</Text></View>
          <Text style={styles.points}>{points==null?'—':String(points)} pts</Text>
        </View>;
       })}
       <Text style={styles.source}>{table.source}</Text>
     </View>:<Message>Esta modalidade tem regras próprias. A respetiva classificação ainda não está implementada no cliente mobile — não vamos aplicar-lhe a tabela de futebol.</Message>}
     {tournament.entryType==='TEAM'?<Button title="Equipas e convites" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/teams',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     {tournament.entryType==='TEAM'?<Button secondary title={tournament.format==='GROUP_KNOCKOUT'?'Fase de grupos e eliminatórias':tournament.format==='KNOCKOUT'?'Ver eliminatórias':'Calendário de jogos'} onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/fixtures',params:{communityId:String(communityId),id:String(id)}})}/>:null}
     <Button secondary title="Voltar aos torneios" onPress={()=>router.back()}/>
   </>:null}
 </Page>;
}
const styles=StyleSheet.create({title:{color:C.white,fontSize:29,fontWeight:'900'},line:{flexDirection:'row',gap:8,flexWrap:'wrap'},heading:{color:C.white,fontSize:20,fontWeight:'900'},
 panel:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:18,padding:16,gap:11},columns:{fontSize:11,color:C.mint,fontWeight:'800'},
 standing:{flexDirection:'row',alignItems:'center',borderTopColor:C.border,borderTopWidth:1,paddingTop:12,gap:9},position:{width:23,color:C.mint,fontWeight:'900',fontSize:18},
 name:{color:C.white,fontWeight:'800',fontSize:14},meta:{fontSize:11,color:C.muted,marginTop:4},points:{color:C.mint,fontWeight:'900',fontSize:13},source:{color:C.muted,fontSize:10,marginTop:10}});
