import {HistoricalArchives} from '../../../src/components/HistoricalArchives';
import React,{useCallback,useMemo,useState} from 'react';
import {t} from '../../../src/lib/i18n';
import {Alert,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {closeCommunitySeason,communityResultsOverview,createCommunitySeason,setOverallStandings,type CommunityResultsOverview} from '../../../src/lib/community-results-api';
import {communityDetails} from '../../../src/lib/community-api';
import {communitySports} from '../../../src/lib/community-core.cjs';
import {defaultSeasonName,seasonDraft,standingTabs} from '../../../src/lib/community-season-core.cjs';
import {communityResults,officialRoundScore,roundPlayerContributions} from '../../../src/lib/community-results-core.cjs';
import {useAuth} from '../../../src/lib/auth';
import {C} from '../../../src/lib/theme';
import {sportName} from '../../../src/lib/sport-names.cjs';

export default function CommunityResultsScreen(){
 const {id:rawId}=useLocalSearchParams<{id:string}>();
 const id=typeof rawId==='string'&&/^[1-9]\d*$/.test(rawId)?Number(rawId):NaN;
 const auth=useAuth(),router=useRouter();
 const [seasonId,setSeasonId]=useState<number|null>(null);
 const [data,setData]=useState<CommunityResultsOverview|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [retry,setRetry]=useState(0),[showAll,setShowAll]=useState(false);
 const account=(auth.token||'')+'|'+(auth.username||'')+'|'+id+'|'+(seasonId||'all');
 const [loadedAccount,setLoadedAccount]=useState('');
 const [manage,setManage]=useState(false),[sports,setSports]=useState<string[]>([]);
 const [formOpen,setFormOpen]=useState(false),[seasonName,setSeasonName]=useState(''),[seasonSport,setSeasonSport]=useState<string|null>(null);
 const [busy,setBusy]=useState(false),[manageError,setManageError]=useState(''),[notice,setNotice]=useState('');
 const [tabKey,setTabKey]=useState<string|null>(null);
 useFocusEffect(useCallback(()=>{
  let active=true;
  setManage(false);setSports([]);
  if(!Number.isSafeInteger(id)||id<=0||!auth.token)return()=>{active=false;};
  void communityDetails(id,auth.token,auth.username).then(c=>{
   if(!active)return;
   const role='myRole' in c?c.myRole:null;
   setManage(role==='OWNER'||role==='ADMIN');setSports(communitySports(c));
  }).catch(()=>{/* Management is optional: results still load. */});
  return()=>{active=false;};
 },[id,auth.token,auth.username]));
 useFocusEffect(useCallback(()=>{
  let active=true;
  setData(null);setLoadedAccount('');setError('');setLoading(true);
  if(!Number.isSafeInteger(id)||id<=0||!auth.token||!auth.username){
   setLoading(false);
   return()=>{active=false;};
  }
  void communityResultsOverview(id,auth.token,seasonId).then(next=>{
   if(!active)return;
   if(!Array.isArray(next?.rounds)||!Array.isArray(next?.standings)||!Array.isArray(next?.seasons))
    throw Error(t('O servidor devolveu classificações incompletas.'));
   setData(next);setLoadedAccount(account);
  }).catch(e=>{
   if(active)setError(e instanceof Error?e.message:t('Não foi possível obter os resultados.'));
  }).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[account,auth.token,auth.username,id,seasonId,retry]));
 const ready=data&&loadedAccount===account;
 const results=useMemo(()=>communityResults(ready?data:null,seasonId),[ready,data,seasonId]);
 const visibleRounds=showAll?results.rounds:results.rounds.slice(0,8);
 const tabs=useMemo(()=>standingTabs(ready?data:null),[ready,data]);
 const tab=tabs.find(item=>item.key===tabKey)||tabs[0]||null;
 const selectedSeason=results.seasons.find(item=>item.id===seasonId)||null;
 const overallEnabled=data?.settings?.overallStandingsEnabled===true;
 function openSeasonForm(){
  setSeasonSport(null);setSeasonName(defaultSeasonName(null));setManageError('');setNotice('');setFormOpen(true);
 }
 function chooseSeasonSport(sport:string|null){
  setSeasonSport(sport);
  setSeasonName(name=>!name.trim()||name.startsWith(defaultSeasonName(null))?defaultSeasonName(sport):name);
 }
 async function createSeason(){
  if(busy||!auth.token)return;
  let draft;
  try{draft=seasonDraft({name:seasonName,sport:seasonSport},sports);}catch(e){setManageError(e instanceof Error?e.message:String(e));return;}
  setBusy(true);setManageError('');
  try{
   const created=await createCommunitySeason(id,auth.token,draft);
   setFormOpen(false);setNotice(t('Época criada.'));setSeasonId(Number.isSafeInteger(created?.id)?created.id:null);setTabKey(null);setRetry(v=>v+1);
  }catch(e){setManageError(e instanceof Error?e.message:t('Não foi possível criar a época.'));}
  finally{setBusy(false);}
 }
 function confirmCloseSeason(){
  if(!selectedSeason||busy)return;
  Alert.alert(t('Encerrar época?'),t('A classificação fica guardada no histórico e deixa de contar novos jogos.'),[
   {text:t('Cancelar'),style:'cancel'},
   {text:t('Encerrar'),style:'destructive',onPress:()=>{void closeSeason(selectedSeason.id);}}
  ]);
 }
 async function closeSeason(target:number){
  setBusy(true);setManageError('');setNotice('');
  try{await closeCommunitySeason(id,auth.token,target);setNotice(t('Época encerrada.'));setRetry(v=>v+1);}
  catch(e){setManageError(e instanceof Error?e.message:t('Não foi possível encerrar a época.'));}
  finally{setBusy(false);}
 }
 async function toggleOverall(){
  if(busy)return;
  setBusy(true);setManageError('');setNotice('');
  try{
   const next=await setOverallStandings(id,auth.token,!overallEnabled);
   setNotice(next?.overallStandingsEnabled?t('Classificação Geral ligada.'):t('Classificação Geral desligada.'));setRetry(v=>v+1);
  }catch(e){setManageError(e instanceof Error?e.message:t('Não foi possível guardar.'));}
  finally{setBusy(false);}
 }
 return <Page>
  <DemoBanner/><Eyebrow>{t('JYNLO · RESULTADOS E CLASSIFICAÇÕES')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Histórico da comunidade')}</Text>
  <Text style={styles.hint}>{t('Jornadas, resultados e estatísticas oficiais, diretamente das classificações da comunidade.')}</Text>
  {!auth.token?<Button title={t('Iniciar sessão')} onPress={()=>router.push('/login')}/>:null}
  {!Number.isSafeInteger(id)||id<=0?<Message tone="error">{t('Comunidade inválida.')}</Message>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error&&auth.token?<Button secondary title={t('Voltar a carregar resultados')} onPress={()=>setRetry(v=>v+1)}/>:null}
  {ready?<View style={styles.section}>
   <Text style={styles.sectionTitle}>{t('Épocas')}</Text>
   <View style={styles.wrap}>
    <Pressable accessibilityRole="button" accessibilityState={{selected:seasonId===null}} onPress={()=>{setSeasonId(null);setShowAll(false);}}
     style={[styles.season,seasonId===null&&styles.active]}><Text style={styles.seasonLabel}>{t('Todas')}</Text></Pressable>
    {results.seasons.map(season=><Pressable key={season.id} accessibilityRole="button"
      accessibilityState={{selected:seasonId===season.id}} onPress={()=>{setSeasonId(season.id);setShowAll(false);}}
      style={[styles.season,seasonId===season.id&&styles.active]}>
      <Text style={styles.seasonLabel}>{season.label||season.name||t('Época {n}',{n:season.id})}{season.sport?' · '+sportName(season.sport):''}</Text>
     </Pressable>)}
   </View>
   {seasonId===null?<Text style={styles.hint}>{t('Seleciona uma época para consultar a classificação específica. O histórico completo reúne as jornadas disponíveis.')}</Text>:null}
   {notice?<Message>{notice}</Message>:null}
   {manageError?<Message tone="error">{manageError}</Message>:null}
   {manage&&!formOpen?<View style={styles.actions}>
    <Button secondary title={t('Nova época')} disabled={busy} onPress={openSeasonForm}/>
    {selectedSeason?.active?<Button secondary title={t('Encerrar época')} disabled={busy} onPress={confirmCloseSeason}/>:null}
    <Button secondary title={t('Definições da competição')} onPress={()=>router.push({pathname:'/communities/[id]/competition-settings',params:{id:String(id)}})}/>
    {sports.length>1?<Button secondary disabled={busy} title={overallEnabled?t('Desligar classificação Geral'):t('Ligar classificação Geral')} onPress={()=>{void toggleOverall();}}/>:null}
   </View>:null}
   {manage&&sports.length>1&&!formOpen?<Text style={styles.hint}>{t('A classificação Geral junta todas as modalidades de uma época partilhada: conta vitórias e jogos, sem somar pontos de modalidades diferentes.')}</Text>:null}
   {manage&&formOpen?<View style={styles.form}>
    <Text style={styles.label}>{t('Nome da época')}</Text>
    <TextInput value={seasonName} onChangeText={setSeasonName} maxLength={120} editable={!busy}
     placeholder={t('Ex.: Época 2026')} placeholderTextColor={C.muted} style={styles.input} accessibilityLabel={t('Nome da época')}/>
    {sports.length>1?<>
     <Text style={styles.label}>{t('Modalidade')}</Text>
     <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityState={{selected:seasonSport===null}} onPress={()=>chooseSeasonSport(null)}
       style={[styles.season,seasonSport===null&&styles.active]}><Text style={styles.seasonLabel}>{t('Todas as modalidades')}</Text></Pressable>
      {sports.map(sport=><Pressable key={sport} accessibilityRole="button" accessibilityState={{selected:seasonSport===sport}}
       onPress={()=>chooseSeasonSport(sport)} style={[styles.season,seasonSport===sport&&styles.active]}>
       <Text style={styles.seasonLabel}>{sportName(sport)}</Text></Pressable>)}
     </View>
     <Text style={styles.hint}>{seasonSport?t('Só conta jogos de {s}. Podes ter uma época ativa por modalidade.',{s:sportName(seasonSport)})
      :t('Uma época para tudo: cada modalidade tem a sua tabela e podes ligar a classificação Geral.')}</Text>
    </>:null}
    <View style={styles.actions}>
     <Button title={busy?t('A criar…'):t('Criar época')} disabled={busy} onPress={()=>{void createSeason();}}/>
     <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>setFormOpen(false)}/>
    </View>
   </View>:null}
  </View>:null}
  {ready&&tab?<View style={styles.section}>
   <Text style={styles.sectionTitle}>{t('Classificação')}</Text>
   {tabs.length>1?<View style={styles.wrap}>{tabs.map(item=><Pressable key={item.key} accessibilityRole="button"
     accessibilityState={{selected:item.key===tab.key}} onPress={()=>setTabKey(item.key)}
     style={[styles.season,item.key===tab.key&&styles.active]}><Text style={styles.seasonLabel}>{item.label}</Text></Pressable>)}</View>:null}
   {tab.kind==='overall'?<Text style={styles.hint}>{t('Vitórias e jogos somados entre modalidades. Os pontos de cada modalidade ficam nas tabelas próprias.')}</Text>:null}
   {tab.rows.map((player,index)=><View key={(player.username||player.fullName||'')+index} style={styles.standing}>
    <Text style={styles.position}>{player.position}.</Text>
    <View style={styles.standingName}><Text style={styles.playerName} numberOfLines={1}>{player.fullName||player.username||t('Jogador')}</Text>
     <Text style={styles.hint}>{tab.kind==='overall'?t('{a} jogos · {b} vitórias · {c} modalidades',{a:player.games??0,b:player.wins,c:player.sports??0})
      :tab.kind==='racket'?t('{a} jogos · {b}V {c}D · sets {d}',{a:player.matches??0,b:player.wins,c:player.losses??0,d:(player.setDifference??0)>0?'+'+player.setDifference:String(player.setDifference??0)})
      :t('{a} jogos · {b}V {c}E {d}D',{a:player.games??0,b:player.wins,c:player.draws??0,d:player.losses??0})}</Text></View>
    <Text style={styles.points}>{tab.kind==='overall'?t('{a} vit.',{a:player.wins}):tab.kind==='racket'
     ?(player.championshipPoints!=null?t('{a} pts',{a:player.championshipPoints}):t('{a} vit.',{a:player.wins})):t('{a} pts',{a:player.points??0})}</Text>
   </View>)}
  </View>:null}
  {ready&&seasonId!==null&&!tab?<View style={styles.section}>
   <Text style={styles.sectionTitle}>{t('Classificação · {a} jogadores',{a:results.standings.length})}</Text>
   {results.standings.length===0?<Text style={styles.hint}>{t('Ainda não existem classificações para esta época.')}</Text>:null}
   {results.standings.map(player=><View key={player.username||player.position} style={styles.standing}>
    <Text style={styles.position}>{player.position}.</Text>
    <View style={styles.standingName}><Text style={styles.playerName} numberOfLines={1}>{player.fullName||player.username||t('Jogador')}</Text>
     <Text style={styles.hint}>{t('{a} jogos · {b}V {c}E {d}D · {e} golos · {f} assist.',{a:player.games,b:player.wins,c:player.draws,d:player.losses,e:player.goals,f:player.assists})}</Text></View>
    <Text style={styles.points}>{t('{a} pts',{a:player.points})}</Text>
   </View>)}
  </View>:null}
  {ready?<View style={styles.section}>
   <View style={styles.top}><Text style={styles.sectionTitle}>{t('Jornadas · {a}',{a:results.rounds.length})}</Text></View>
   {results.rounds.length===0?<Text style={styles.hint}>{t('Ainda não há resultados nesta seleção.')}</Text>:null}
   {visibleRounds.map(round=>{
    const score=officialRoundScore(round);
    const contributors=roundPlayerContributions(round);
    return <View key={round.id} style={styles.round}>
     <Text style={styles.roundTitle}>{round.name||t('Jornada {n}',{n:round.id})}</Text>
     <Text style={styles.hint}>{sportName(round.sport)||t('Modalidade não indicada')} · {new Date(round.playedAt).toLocaleDateString('pt-PT')}</Text>
     {score?<View style={styles.scoreRow}><Text style={styles.scoreSide}>{t('Equipa A')}</Text><Text maxFontSizeMultiplier={1.3} style={styles.score}>{score.label}</Text><Text style={styles.scoreSide}>{t('Equipa B')}</Text></View>:
      <Text style={styles.hint}>{t('Sem marcador oficial registado. Consulta os resultados individuais da jornada.')}</Text>}
     {contributors.length>0?<View style={styles.contributions}>{contributors.map((p,i)=><Text key={p.name+i} style={styles.hint}>
      {p.name}{p.team?' · '+t('Equipa {v}',{v:p.team}):''}{p.goals>0?' · '+t('{n} golos',{n:p.goals}):''}{p.assists>0?' · '+t('{n} assistências',{n:p.assists}):''}
     </Text>)}</View>:null}
    </View>;
   })}
   {results.rounds.length>8?<Button secondary title={showAll?t('Mostrar menos'):t('Ver todas as jornadas')} onPress={()=>setShowAll(v=>!v)}/>:null}
  </View>:null}
  {Number.isSafeInteger(id)&&id>0&&auth.token?<HistoricalArchives communityId={id} token={auth.token}/>:null}
  <Button secondary title={t('Voltar à comunidade')} onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:27,color:C.white,fontWeight:'900'},hint:{color:C.muted,fontSize:12,lineHeight:18},
 section:{padding:15,gap:13,borderColor:C.border,borderWidth:1,borderRadius:18,backgroundColor:C.surface},
 sectionTitle:{fontSize:18,fontWeight:'900',color:C.white},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},
 season:{minHeight:42,paddingHorizontal:12,paddingVertical:8,borderColor:C.border,borderWidth:1,borderRadius:12,justifyContent:'center'},
 active:{borderColor:C.mint,backgroundColor:C.surface2},seasonLabel:{fontSize:12,color:C.white,fontWeight:'700'},
 standing:{flexDirection:'row',alignItems:'center',gap:9,paddingVertical:7,borderBottomWidth:1,borderBottomColor:C.border},
 position:{color:C.mint,fontWeight:'900',width:26},standingName:{flex:1,gap:3},playerName:{fontSize:13,color:C.white,fontWeight:'800'},
 points:{color:C.white,fontSize:15,fontWeight:'900'},round:{padding:13,gap:9,borderWidth:1,borderColor:C.border,borderRadius:14},
 roundTitle:{color:C.white,fontSize:15,fontWeight:'900'},scoreRow:{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'},
 scoreSide:{fontSize:12,color:C.muted,flex:1,textAlign:'center'},score:{fontSize:27,color:C.white,fontWeight:'900'},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:8},form:{gap:10,paddingTop:4},
 label:{color:C.white,fontSize:13,fontWeight:'800'},
 input:{minHeight:46,borderColor:C.border,borderWidth:1,borderRadius:12,paddingHorizontal:12,color:C.white,backgroundColor:C.surface2,fontSize:15},
 contributions:{paddingTop:8,gap:5,borderTopWidth:1,borderTopColor:C.border},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}
});
