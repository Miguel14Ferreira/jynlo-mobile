import React,{useCallback,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {TournamentMatchCard} from '../../../../src/components/TournamentMatchUI';
import {useAuth} from '../../../../src/lib/auth';
import {tournamentDetails} from '../../../../src/lib/competition-api';
import {teamTournamentGroups,teamTournamentMatches} from '../../../../src/lib/tournament-fixtures-api';
import {canListMatches,splitTeamMatches} from '../../../../src/lib/tournament-fixtures-core.cjs';
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
  if(!auth.token||!auth.username){if(version===generation.current)setLoading(false);return;}
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
  paging.current=false;
  void load(version);
  return()=>{generation.current++;};
 },[load]));
 const split=useMemo(()=>splitTeamMatches(matches,tournament?.format||'LEAGUE'),[matches,tournament?.format]);
 const isGroups=tournament?.format==='GROUP_KNOCKOUT';
 async function more(){if(!auth.token||!auth.username||paging.current||loadingMore||!hasMore||loading)return;
  const version=generation.current;
  paging.current=true;setLoadingMore(true);setError('');
  try{const next=page+1,part=await teamTournamentMatches(cid,tid,next,auth.token,auth.username);
   if(version!==generation.current)return;
   setMatches(previous=>[...previous,...part.matches.filter(m=>!previous.some(x=>x.id===m.id))]);setPage(part.page);setHasMore(part.hasMore);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar mais jogos.');}
  finally{paging.current=false;setLoadingMore(false);}
 }
 const teamPage=(teamId:number)=>router.push({pathname:'/tournaments/[communityId]/[id]/teams/[teamId]',params:{communityId:String(cid),id:String(tid),teamId:String(teamId)}});
 const renderMatches=(entries:TournamentTeamMatch[])=>entries.map(m=><TournamentMatchCard key={m.id} match={m} onTeamPress={teamPage}/>);
 return <Page><DemoBanner/><Eyebrow>TORNEIO · JOGOS</Eyebrow>
   <Text style={styles.title}>{tournament?.name||'Grupos e eliminatórias'}</Text>
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
          {g.standings.map(row=><Pressable key={row.teamId} onPress={()=>teamPage(row.teamId)} style={styles.standing} accessibilityRole="button">
            <Text style={styles.rank}>{row.position}.</Text><Text style={styles.team}>{row.teamName}</Text>
            <Text style={styles.points}>{row.played} J · {row.points} pts</Text>
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
const styles=StyleSheet.create({title:{fontSize:28,fontWeight:'900',color:C.white},heading:{fontSize:18,fontWeight:'900',color:C.white},
 tabs:{flexDirection:'row',gap:9},tab:{flex:1,padding:11,borderRadius:12,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,alignItems:'center'},
 tabActive:{backgroundColor:C.mint,borderColor:C.mint},tabText:{fontSize:12,fontWeight:'800',color:C.white},tabTextActive:{color:C.background},
 group:{borderRadius:18,padding:14,backgroundColor:C.surface2,gap:11},standing:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderBottomWidth:1,borderColor:C.border},
 rank:{fontSize:13,fontWeight:'900',color:C.mint,width:24},team:{fontSize:13,fontWeight:'800',color:C.white,flex:1},points:{fontSize:12,color:C.muted}
});
