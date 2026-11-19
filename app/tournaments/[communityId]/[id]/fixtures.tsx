import React,{useCallback,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {TournamentMatchCard} from '../../../../src/components/TournamentMatchUI';
import {useAuth} from '../../../../src/lib/auth';
import {tournamentDetails} from '../../../../src/lib/competition-api';
import {teamTournamentGroups,teamTournamentMatches} from '../../../../src/lib/tournament-fixtures-api';
import {canListMatches,splitTeamMatches} from '../../../../src/lib/tournament-fixtures-core.cjs';
import {validateNextFixturePage} from '../../../../src/lib/tournament-organizer-pages.cjs';
import {C} from '../../../../src/lib/theme';
import type {JynloTournament,TournamentTeamGroups,TournamentTeamMatch} from '../../../../src/lib/types';
export default function TeamFixturesScreen(){
 const params=useLocalSearchParams<{communityId:string;id:string}>(),cid=Number(params.communityId),tid=Number(params.id);
 const router=useRouter(),auth=useAuth();
 const [tournament,setTournament]=useState<JynloTournament|null>(null);
 const [groups,setGroups]=useState<TournamentTeamGroups|null>(null),[matches,setMatches]=useState<TournamentTeamMatch[]>([]);
 const [page,setPage]=useState(0),[hasMore,setHasMore]=useState(false),[active,setActive]=useState<'GROUP'|'KNOCKOUT'>('GROUP');
 const [loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),paging=useRef(false);
 const load=useCallback(async(version=generation.current)=>{
  if(!auth.token||!auth.username){
   if(version===generation.current){setTournament(null);setGroups(null);setMatches([]);setHasMore(false);setPage(0);setLoadingMore(false);setLoading(false);}
   return;
  }
  if(!Number.isSafeInteger(cid)||cid<=0||!Number.isSafeInteger(tid)||tid<=0){
   if(version===generation.current){setTournament(null);setGroups(null);setMatches([]);setHasMore(false);setError('Competição inválida.');setLoading(false);}
   return;
  }
  setLoading(true);setError('');setTournament(null);setGroups(null);setMatches([]);setHasMore(false);setPage(0);
  try{
   const t=await tournamentDetails(cid,tid,auth.token,auth.username);
   if(version!==generation.current)return;
   setTournament(t);
   if(!canListMatches(t))return;
   const [groupData,matchData]=await Promise.all([
    t.format==='GROUP_KNOCKOUT'?teamTournamentGroups(cid,tid,auth.token,auth.username):Promise.resolve(null),
    teamTournamentMatches(cid,tid,0,auth.token,auth.username)
   ]);
   if(version!==generation.current)return;
   setGroups(groupData);setMatches(matchData.matches);setPage(matchData.page);setHasMore(matchData.hasMore);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar os jogos do torneio.');}
  finally{if(version===generation.current)setLoading(false);}
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  paging.current=false;setLoadingMore(false);setActive('GROUP');
  // Clear prior account/competition data before any authorized read completes.
  setTournament(null);setGroups(null);setMatches([]);setHasMore(false);setPage(0);
  void load(version);
  return()=>{generation.current++;};
 },[load]));
 const split=useMemo(()=>splitTeamMatches(matches,tournament?.format||'LEAGUE'),[matches,tournament?.format]);
 const isGroups=tournament?.format==='GROUP_KNOCKOUT';
 async function more(){if(!auth.token||!auth.username||paging.current||loadingMore||!hasMore||loading)return;
  const version=generation.current;
  paging.current=true;setLoadingMore(true);setError('');
  try{const next=page+1,response=await teamTournamentMatches(cid,tid,next,auth.token,auth.username);
   if(version!==generation.current)return;
   const part=validateNextFixturePage<TournamentTeamMatch>(response,next);
   setMatches(previous=>[...previous,...part.matches.filter(m=>!previous.some(x=>x.id===m.id))]);setPage(part.page);setHasMore(part.hasMore);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar mais jogos.');}
  finally{if(version===generation.current){paging.current=false;setLoadingMore(false);}}
 }
 const teamPage=(teamId:number)=>router.push({pathname:'/tournaments/[communityId]/[id]/teams/[teamId]',params:{communityId:String(cid),id:String(tid),teamId:String(teamId)}});
 const renderMatches=(entries:TournamentTeamMatch[])=>entries.map(m=><TournamentMatchCard key={m.id} match={m} onTeamPress={teamPage}/>);
 return <Page><DemoBanner/><Eyebrow>TORNEIO · JOGOS</Eyebrow>
   <View style={styles.hero}><Text style={styles.heroLabel}>CALENDÁRIO · JYNLO</Text><Text style={styles.title}>{tournament?.name||'Grupos e eliminatórias'}</Text>
    {tournament?<Text style={styles.heroInfo}>{tournament.sport||'Multidesporto'} · {tournament.format==='GROUP_KNOCKOUT'?'Grupos e eliminatórias':tournament.format==='KNOCKOUT'?'Eliminatórias':'Liga'}</Text>:null}
   </View>
   {!auth.token?<Button title="Entrar para consultar os jogos" onPress={()=>router.push('/login')}/>:null}
   {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
   {!loading&&tournament&&!canListMatches(tournament)?<Message>Esta competição tem um sistema próprio de resultados. Não vamos apresentar resultados de jogos genéricos para esta modalidade.</Message>:null}
   {!loading&&tournament&&canListMatches(tournament)?<>
    {isGroups?<>
      <View style={styles.tabs}>{([{id:'GROUP',title:'Fase de grupos'},{id:'KNOCKOUT',title:'Eliminatórias'}] as const).map(t=><Pressable key={t.id} onPress={()=>setActive(t.id)} style={[styles.tab,active===t.id&&styles.tabActive]} accessibilityRole="button" accessibilityState={{selected:active===t.id}}>
        <Text style={[styles.tabText,active===t.id&&styles.tabTextActive]}>{t.title}</Text>
      </Pressable>)}</View>
      {active==='GROUP'?<>
        {groups?.groups.length?groups.groups.map(g=><View key={g.groupNumber} style={styles.group}>
          <Text style={styles.heading}>Grupo {g.groupNumber}</Text>
          {g.standings.map(row=><Pressable key={row.teamId} onPress={()=>teamPage(row.teamId)} style={styles.standing} accessibilityRole="button" accessibilityLabel={'Ver equipa '+row.teamName}>
            <View style={styles.rankPill}><Text style={styles.rank}>{row.position}</Text></View><Text style={styles.team} numberOfLines={2}>{row.teamName}</Text>
            <View style={styles.pointsBlock}><Text style={styles.points}>{row.points} pts</Text><Text style={styles.played}>{row.played} J</Text></View>
          </Pressable>)}
          {split.groups.find(x=>x.number===g.groupNumber)?.matches.map(m=><TournamentMatchCard key={m.id} match={m} onTeamPress={teamPage}/>)||null}
        </View>):<Message>Os grupos ainda não têm uma classificação publicada pelo servidor.</Message>}
      </>:<>
        {!groups?.knockoutStarted?<Message>A fase a eliminar ainda não começou. A passagem de equipas será indicada pelo servidor, não calculada pela app.</Message>:null}
        {groups?.knockoutStarted?renderMatches(split.knockout):null}
        {groups?.knockoutStarted&&split.knockout.length===0?<Message>{hasMore?'Os jogos desta fase podem estar nas páginas seguintes.':'Ainda não existem jogos de eliminação disponíveis.'}</Message>:null}
      </>}
    </>:<>
      <Text style={styles.heading}>{tournament.format==='KNOCKOUT'?'Eliminatórias':'Calendário de jogos'}</Text>
      {renderMatches(tournament.format==='KNOCKOUT'?split.knockout:split.league)}
      {matches.length===0?<Message>Ainda não há jogos gerados para este torneio.</Message>:null}
    </>}
    {hasMore?<Button secondary title={loadingMore?'A carregar…':'Carregar mais jogos'} disabled={loadingMore} onPress={()=>{void more();}}/>:null}
    <Message>Os resultados, grupos e progressão da competição são sempre os devolvidos pelo backend da Jynlo. Não calculamos qualificação nem vencedores no telemóvel.</Message>
   </>:null}
   <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 hero:{padding:17,borderRadius:18,borderWidth:1,borderColor:'#3CD8BA55',backgroundColor:'#082C3B',gap:8},
 heroLabel:{color:'#79F2D8',fontWeight:'900',fontSize:11,letterSpacing:1.3},
 heroInfo:{color:'#A6D9D5',fontSize:13,fontWeight:'700',lineHeight:19},
 title:{fontSize:26,lineHeight:33,fontWeight:'900',color:C.white,letterSpacing:-.4},
 heading:{fontSize:18,fontWeight:'900',color:C.white},
 tabs:{flexDirection:'row',gap:8,padding:5,borderRadius:15,backgroundColor:'#062634',borderWidth:1,borderColor:'#3DAEAA55'},
 tab:{flex:1,minWidth:0,minHeight:46,paddingHorizontal:6,paddingVertical:10,borderRadius:11,backgroundColor:'transparent',alignItems:'center',justifyContent:'center'},
 tabActive:{backgroundColor:'#41E1BE'},
 tabText:{fontSize:12,fontWeight:'800',color:'#B6DADE',textAlign:'center'},tabTextActive:{color:'#062E31'},
 group:{borderRadius:17,padding:15,borderWidth:1,borderColor:'#3EC4B34D',backgroundColor:'#092D3B',gap:12},
 standing:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderBottomWidth:1,borderColor:'#3AB7A732',minWidth:0},
 rankPill:{width:31,height:31,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:'#10574F'},
 rank:{fontSize:13,fontWeight:'900',color:'#9DFFE5'},
 team:{fontSize:13,fontWeight:'800',color:C.white,flex:1,minWidth:0,lineHeight:18},
 pointsBlock:{minWidth:57,alignItems:'flex-end',gap:3},points:{fontSize:13,fontWeight:'900',color:'#76F4D4'},played:{fontSize:10,fontWeight:'700',color:'#ABCCD0'}
});
