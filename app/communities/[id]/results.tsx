import React,{useCallback,useMemo,useState} from 'react';
import {t} from '../../../src/lib/i18n';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {communityResultsOverview,type CommunityResultsOverview} from '../../../src/lib/community-results-api';
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
  </View>:null}
  {ready&&seasonId!==null?<View style={styles.section}>
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
 contributions:{paddingTop:8,gap:5,borderTopWidth:1,borderTopColor:C.border},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}
});
