import React,{useCallback,useRef,useState} from 'react';
import {t as tr} from '../../../../../src/lib/i18n';
import {Alert,Share,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../../src/components/UI';
import {TournamentMatchCard} from '../../../../../src/components/TournamentMatchUI';
import {useAuth} from '../../../../../src/lib/auth';
import {tournamentDetails} from '../../../../../src/lib/competition-api';
import {communityDetails} from '../../../../../src/lib/community-api';
import {teamProfileMatches} from '../../../../../src/lib/tournament-fixtures-api';
import {canListMatches} from '../../../../../src/lib/tournament-fixtures-core.cjs';
import {acceptTeamPlace,shareableTeamInvite,tournamentTeams,tournamentTeamPromotionStatus,promoteTournamentTeam,type TeamPromotionStatus} from '../../../../../src/lib/team-api';
import {C} from '../../../../../src/lib/theme';
import type {JynloTournament,JynloTournamentTeam,TournamentTeamMatch} from '../../../../../src/lib/types';
import {sportName} from '../../../../../src/lib/sport-names.cjs';
export default function TournamentTeamProfileScreen(){
 const params=useLocalSearchParams<{communityId:string;id:string;teamId:string}>();
 const cid=Number(params.communityId),tid=Number(params.id),teamId=Number(params.teamId),router=useRouter(),auth=useAuth();
 const [needsCommunity,setNeedsCommunity]=useState(false);
 const [promotion,setPromotion]=useState<TeamPromotionStatus|null>(null);
 const [promoting,setPromoting]=useState(false);
 const [tournament,setTournament]=useState<JynloTournament|null>(null),[team,setTeam]=useState<JynloTournamentTeam|null>(null);
 const [matches,setMatches]=useState<TournamentTeamMatch[]>([]),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[loadingMore,setLoadingMore]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const generation=useRef(0),joining=useRef(false),paging=useRef(false),promotionLock=useRef(false);
 const load=useCallback(async(version=generation.current)=>{
  if(!auth.token||!auth.username){if(version===generation.current)setLoading(false);return;}
  if(![cid,tid,teamId].every(n=>Number.isSafeInteger(n)&&n>0)){
   if(version===generation.current){setError(tr('Identificador de equipa inválido.'));setLoading(false);}
   return;
  }
  setLoading(true);setError('');setNeedsCommunity(false);setTournament(null);setTeam(null);setMatches([]);setHasMore(false);setPage(0);setPromotion(null);
  try{
   const community=await communityDetails(cid,auth.token,auth.username);
   if(version!==generation.current)return;
   if(!('myRole' in community)||!community.myRole){
    setNeedsCommunity(true);
    setError(tr('Para participares nesta equipa, primeiro tens de aderir à comunidade.'));
    return;
   }
   const [t,teams]=await Promise.all([tournamentDetails(cid,tid,auth.token,auth.username),tournamentTeams(cid,tid,auth.token,auth.username)]);
   if(version!==generation.current)return;
   setTournament(t);
   if(t.entryType!=='TEAM')throw Error(tr('Este torneio não tem equipas.'));
   const selected=teams.find(x=>x.id===teamId);
   if(!selected)throw Error(tr('Equipa não encontrada ou sem acesso.'));
   setTeam(selected);
   try{
    const status=await tournamentTeamPromotionStatus(cid,tid,teamId,auth.token);
    if(version===generation.current)setPromotion(status);
   }catch{
    if(version===generation.current)setPromotion(null);
   }
   if(canListMatches(t)){
    const response=await teamProfileMatches(cid,tid,teamId,0,auth.token,auth.username);
    if(version===generation.current){setMatches(response.matches);setPage(response.page);setHasMore(response.hasMore);}
   }
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:tr('Não foi possível carregar a equipa.'));}
  finally{if(version===generation.current)setLoading(false);}
 },[cid,tid,teamId,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  paging.current=false;
  setLoadingMore(false);
  setTournament(null);setTeam(null);setMatches([]);setPage(0);setHasMore(false);setNeedsCommunity(false);setError('');setMessage('');setLoading(true);
  void load(version);
  return ()=>{generation.current++;};
 },[load]));
 async function join(){
  if(!auth.token||!auth.username||joining.current||loading||!team||!tournament||tournament.status!=='DRAFT'||
   team.players.some(p=>p.username===auth.username)||
   (team.playersPerTeam!=null&&team.players.length>=team.playersPerTeam))return;
  const version=generation.current;
  joining.current=true;setBusy(true);setError('');setMessage('');
  try{await acceptTeamPlace(cid,tid,teamId,auth.token,auth.username);
   if(version!==generation.current)return;
   setMessage(tr('Presença na equipa confirmada pelo servidor.'));await load(version);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:tr('Não foi possível entrar na equipa.'));}
  finally{joining.current=false;if(version===generation.current)setBusy(false);}
 }
 async function share(){if(!team)return;
  try{const url=shareableTeamInvite(cid,tid,team.id);
   await Share.share({message:`🏆 ${team.name} — ${tournament?.name||tr('Torneio Jynlo')}\n${tr('Para participar, entra na comunidade e aguarda a validação do servidor.')}\n${url}`});
  }catch(e){setError(e instanceof Error?e.message:tr('Não foi possível partilhar.'));}
 }
 async function promote(){
  if(!auth.token||!promotion?.canPromote||promotionLock.current||loading)return;
  const token=auth.token,version=generation.current;
  promotionLock.current=true;setPromoting(true);setError('');
  try{
   const permanent=await promoteTournamentTeam(cid,tid,teamId,token);
   if(version!==generation.current)return;
   setPromotion({globalTeamId:permanent.id,canPromote:false,archived:false});
   setMessage(tr('Equipa guardada na Jynlo. O histórico do torneio foi preservado.'));
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:tr('Não foi possível guardar a equipa.'));}
  finally{promotionLock.current=false;if(version===generation.current)setPromoting(false);}
 }
 async function more(){if(!auth.token||!auth.username||paging.current||loading||!hasMore)return;
  const version=generation.current;
  paging.current=true;setLoadingMore(true);setError('');
  try{
   const next=page+1;
   const part=await teamProfileMatches(cid,tid,teamId,next,auth.token,auth.username);
   if(version!==generation.current)return;
   setMatches(prev=>[...prev,...part.matches.filter(m=>!prev.some(x=>x.id===m.id))]);
   setPage(part.page);setHasMore(part.hasMore);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:tr('Não foi possível carregar mais jogos.'));}
  finally{paging.current=false;if(version===generation.current)setLoadingMore(false);}
 }
 const isMember=!!team?.players.some(p=>p.username===auth.username);
 const full=!!team&&team.playersPerTeam!=null&&team.players.length>=team.playersPerTeam;
 const accepting=!!tournament&&tournament.status==='DRAFT';
 return <Page><DemoBanner/><Eyebrow>{tr('TORNEIO · EQUIPA')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{team?.name||tr('Perfil da equipa')}</Text>
  {tournament?<Text style={styles.subtitle}>{tournament.name} · {sportName(tournament.sport)||tr('Multidesporto')}</Text>:null}
  {!auth.token?<><Message>{tr('Inicia sessão para abrir o convite e pedir lugar nesta equipa. Depois de entrares, regressas diretamente aqui.')}</Message>
   <Button title={tr('Iniciar sessão para participar')} onPress={()=>router.push({pathname:'/login',params:{redirect:'/tournaments/'+cid+'/'+tid+'/teams/'+teamId}})}/></>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {needsCommunity?<Button title={tr('Entrar na comunidade')} onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(cid),returnTo:'/tournaments/'+cid+'/'+tid+'/teams/'+teamId}})}/>:null}{message?<Message>{message}</Message>:null}
  {team?<>
   <View style={styles.panel}>
    <Text style={styles.heading}>{tr('Plantel')}</Text>
    <Text style={styles.subtitle}>{tr('{a}/{b} jogadores',{a:team.players.length,b:team.playersPerTeam??tr('Sem limite definido')})}</Text>
    {team.players.length?team.players.map(player=><View key={player.profileId} style={styles.player}>
     <Text style={styles.playerName}>{player.displayName}</Text><Text style={styles.subtitle}>@{player.username}</Text>
    </View>):<Text style={styles.subtitle}>{tr('Ainda não há jogadores inscritos.')}</Text>}
   </View>
   {promotion?.canPromote?<View style={styles.panel}>
    <Text style={styles.heading}>{tr('O futuro desta equipa é contigo')}</Text>
    <Text style={styles.subtitle}>{tr('Podes continuar a usá-la apenas neste torneio, ou criar uma equipa permanente da Jynlo. A escolha não altera os resultados nem inscreve jogadores automaticamente noutras competições.')}</Text>
    <Button title={promoting?tr('A guardar…'):tr('Tornar equipa permanente')}
     disabled={promoting||loading} onPress={()=>Alert.alert(tr('Criar equipa permanente?'),
      tr('A equipa ficará no teu perfil Jynlo e poderá participar noutras comunidades. O torneio e o seu histórico serão mantidos.'),
      [{text:tr('Agora não'),style:'cancel'},{text:tr('Criar equipa permanente'),onPress:()=>{void promote();}}])}/>
    <Text style={styles.subtitle}>{tr('Se não converteres, esta equipa permanece apenas no torneio.')}</Text>
   </View>:null}
   {promotion?.archived&&!promotion.globalTeamId?<View style={styles.panel}>
    <Text style={styles.heading}>{tr('Equipa temporária arquivada')}</Text>
    <Text style={styles.subtitle}>{tr('O torneio terminou. Esta equipa já não pode ser convertida, mas os resultados e o plantel histórico continuam preservados.')}</Text>
   </View>:null}
   {promotion?.globalTeamId?<View style={styles.panel}>
    <Text style={styles.heading}>{tr('Equipa permanente Jynlo')}</Text>
    <Text style={styles.subtitle}>{tr('Esta equipa já tem uma identidade própria, independente do torneio.')}</Text>
    <Button title={tr('Abrir equipa na Jynlo')} secondary onPress={()=>router.push({pathname:'/teams/[id]',params:{id:String(promotion.globalTeamId)}})}/>
   </View>:null}
   <Button title={tr('Partilhar convite da equipa')} onPress={()=>{void share();}} secondary/>
   {isMember?<Message>{tr('Já fazes parte desta equipa.')}</Message>:
    !accepting?<Message>{tr('As inscrições nesta equipa estão encerradas.')}</Message>:
    full?<Message>{tr('Esta equipa já tem o plantel completo.')}</Message>:
    <Button title={busy?tr('A confirmar…'):tr('Pedir lugar na equipa')} onPress={()=>{void join();}} disabled={busy||loading}/> }
   <Text style={styles.heading}>{tr('Jogos da equipa')}</Text>
   {canListMatches(tournament)?<>
     {matches.map(match=><TournamentMatchCard key={match.id} match={match}/>)}
     {!matches.length&&!loading?<Message>{tr('Esta equipa ainda não tem jogos disponíveis.')}</Message>:null}
     {hasMore?<Button secondary disabled={loadingMore} title={loadingMore?tr('A carregar…'):tr('Carregar mais jogos')} onPress={()=>{void more();}}/>:null}
   </>:<Message>{tr('Os resultados desta modalidade têm regras específicas e ainda não são apresentados nesta página.')}</Message>}
  </>:null}
  <Button secondary title={tr('Voltar às equipas')} onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({title:{fontSize:29,color:C.white,fontWeight:'900'},subtitle:{color:C.muted,fontSize:12,lineHeight:18},
 panel:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:18,padding:17,gap:11},
 heading:{fontSize:18,fontWeight:'900',color:C.white},player:{paddingVertical:10,borderTopWidth:1,borderTopColor:C.border,gap:3},playerName:{fontSize:14,fontWeight:'800',color:C.white}});
