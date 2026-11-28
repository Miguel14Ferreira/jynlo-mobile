import React,{useCallback,useRef,useState} from 'react';
import {t} from '../../../src/lib/i18n';
import {Alert,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {C} from '../../../src/lib/theme';
import {competitionSessionRoster,recordedCompetitionSessionIds,recordCompetitionSessionResult,competitionSessionCapabilities} from '../../../src/lib/session-competition-api';
import {buildSessionCompetitionResult,editableCompetitionRoster,confirmedPlayerStatistics,confirmedOfficialScore} from '../../../src/lib/session-competition-result.cjs';
import type {CompetitionOutcome,CompetitionRosterEntry,CompetitionTeam} from '../../../src/lib/session-competition-result.cjs';

export default function SessionCompetitionResultScreen(){
 const params=useLocalSearchParams<{id:string;communityId?:string;sport?:string}>();
 const sport=typeof params.sport==='string'?params.sport:'';
 const football=sport==='Futebol';
 const sessionId=typeof params.id==='string'&&/^[1-9]\d*$/.test(params.id)?Number(params.id):NaN;
 const communityId=typeof params.communityId==='string'&&/^[1-9]\d*$/.test(params.communityId)?Number(params.communityId):NaN;
 const valid=Number.isSafeInteger(sessionId)&&Number.isSafeInteger(communityId);
 const auth=useAuth(),router=useRouter();
 const [roster,setRoster]=useState<CompetitionRosterEntry[]>([]);
 const [outcome,setOutcome]=useState<CompetitionOutcome|null>(null);
 const [scoreA,setScoreA]=useState(''),[scoreB,setScoreB]=useState('');
 const [scoreSupported,setScoreSupported]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [recorded,setRecorded]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const [playerStatsSupported,setPlayerStatsSupported]=useState(false);
 const generation=useRef(0),writing=useRef(false);
 const identity=(auth.username||'')+'|'+(auth.token||'')+'|'+sessionId+'|'+communityId+'|'+sport;
 const identityRef=useRef(identity);
 identityRef.current=identity;
 const [loadedIdentity,setLoadedIdentity]=useState('');
 const confirmedIdentity=loadedIdentity===identity;
 const load=useCallback(async()=>{
  const version=++generation.current,actor=identity;
  setRoster([]);setOutcome(null);setScoreA('');setScoreB('');setRecorded(false);setPlayerStatsSupported(false);setScoreSupported(false);setError('');setSuccess('');setLoadedIdentity('');
  if(!valid||!auth.token||!auth.username){setLoading(false);return;}
  setLoading(true);
  try{
   const [players,recordedIds,capabilities]=await Promise.all([
    competitionSessionRoster(communityId,sessionId,auth.token),
    recordedCompetitionSessionIds(communityId,auth.token),
    football?competitionSessionCapabilities(communityId,sessionId,auth.token).catch(()=>null):Promise.resolve(null)
   ]);
   if(version!==generation.current||actor!==identityRef.current)return;
   if(!Array.isArray(recordedIds))throw Error(t('O servidor não confirmou os resultados anteriores.'));
   const already=recordedIds.includes(sessionId);
   setRecorded(already);
   setPlayerStatsSupported(football&&capabilities?.version===1&&capabilities.footballGoalsAssists===true);
   setScoreSupported(football&&capabilities?.version===1&&capabilities.footballFinalScore===true);
   if(!already)setRoster(editableCompetitionRoster(players));
   setLoadedIdentity(actor);
  }catch(e){
   if(version===generation.current&&actor===identityRef.current)
    setError(e instanceof Error?e.message:t('Não foi possível consultar os dados desta comunidade.'));
  }finally{if(version===generation.current&&actor===identityRef.current)setLoading(false);}
 },[communityId,sessionId,auth.token,auth.username,valid,identity]);
 useFocusEffect(useCallback(()=>{
  void load();
  return()=>{generation.current++;setRoster([]);setLoadedIdentity('');};
 },[load]));
 const change=(id:number,patch:Partial<CompetitionRosterEntry>)=>{
  if(busy||writing.current||!confirmedIdentity||recorded)return;
  setRoster(current=>current.map(p=>p.id===id?{...p,...patch}:p));
  setError('');
 };
 function confirm(){
  if(!confirmedIdentity||recorded||busy||writing.current||!auth.token||!valid)return;
  let payload:ReturnType<typeof buildSessionCompetitionResult>;
  try{payload=buildSessionCompetitionResult(outcome,roster,sport,scoreA,scoreB);}
  catch(e){setError(e instanceof Error?e.message:t('Confirma jogadores e equipas.'));return;}
  const version=generation.current,actor=identity,token=auth.token;
  const label=(outcome==='DRAW'?t('Empate'):outcome==='A'?t('Equipa A venceu'):t('Equipa B venceu'))+
    (payload.scoreA!==undefined?' · '+payload.scoreA+'–'+payload.scoreB:'');
  Alert.alert(t('Registar resultado oficial?'),label+' · '+payload.players.length+' '+t('jogadores. Esta ação cria uma jornada na classificação e não pode ser repetida.'),[
   {text:t('Voltar'),style:'cancel'},
   {text:t('Registar resultado'),onPress:()=>{
    if(writing.current||version!==generation.current||actor!==identityRef.current)return;
    writing.current=true;setBusy(true);setError('');
    let submitted=false;
    // Older servers can silently discard unknown JSON player-stat fields
    // while creating an irreversible round. Never send those statistics until
    // this authenticated endpoint confirms that the server understands them.
    void (async()=>{
     if(payload.players.some(player=>player.goals!==undefined||player.assists!==undefined)||payload.scoreA!==undefined){
      let capabilities:Awaited<ReturnType<typeof competitionSessionCapabilities>>;
      try{capabilities=await competitionSessionCapabilities(communityId,sessionId,token);}
      catch{throw Error(t('Ainda não é possível registar golos e assistências. Nenhuma jornada foi enviada. Deixa os golos e assistências em branco e tenta outra vez.'));}
      if(version!==generation.current||actor!==identityRef.current)return null;
      if(capabilities?.version!==1||
         (payload.players.some(player=>player.goals!==undefined||player.assists!==undefined)&&capabilities.footballGoalsAssists!==true)||
         (payload.scoreA!==undefined&&capabilities.footballFinalScore!==true))
       throw Error(t('Este servidor ainda não suporta o marcador oficial ou as estatísticas enviadas. Nenhuma jornada foi enviada.'));
     }
     // A user might switch account or navigate away during the capabilities GET.
     if(version!==generation.current||actor!==identityRef.current)return null;
     submitted=true;
     return recordCompetitionSessionResult(communityId,sessionId,token,payload);
    })().then(reply=>{
     if(!reply||version!==generation.current||actor!==identityRef.current)return;
     if(!Number.isSafeInteger(reply?.id)||reply.id<=0)
      throw Error(t('O servidor não confirmou a jornada. Verifica as classificações antes de repetir.'));
     setRecorded(true);setRoster([]);
     if(confirmedPlayerStatistics(payload,reply)&&confirmedOfficialScore(payload,reply))
      setSuccess(t('Jornada registada. O marcador oficial e as estatísticas confirmadas já contam para a classificação.'));
     else setSuccess(t('A jornada foi criada, mas não foi possível confirmar o marcador ou os golos e assistências guardados. Consulta a classificação antes de voltares a registar dados.'));
    }).catch(e=>{
     if(version===generation.current&&actor===identityRef.current)
      setError((e instanceof Error?e.message:t('Não foi possível confirmar o registo.'))+
       (submitted?' '+t('Consulta as jornadas antes de repetir, para evitar resultados duplicados.'):''));
    }).finally(()=>{writing.current=false;if(version===generation.current&&actor===identityRef.current)setBusy(false);});
   }}
  ]);
 }
 if(!valid)return <Page><Message tone="error">{t('Jogo ou comunidade inválida.')}</Message></Page>;
 return <Page>
  <DemoBanner/><Eyebrow>{t('JYNLO · APÓS O JOGO')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Resultado do jogo')}</Text>
  <Text style={styles.hint}>{t('Registo rápido de vitória ou empate para as classificações da comunidade. O resultado é validado pelo servidor e só a administração da comunidade pode submetê-lo.')}</Text>
  <Message>{football?(scoreSupported?t('Regista o marcador oficial e, se souberes, os golos e assistências dos jogadores. Não são inferidos dados em falta.'):t('Ainda não é possível registar o marcador. Podes registar vitória ou empate.')):t('Este formulário regista a vitória ou o empate. Estatísticas individuais desta modalidade não são calculadas automaticamente.')}</Message>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error&&!busy&&auth.token?<Button secondary title={t('Verificar novamente')} onPress={()=>{void load();}}/>:null}
  {success?<Message>{success}</Message>:null}
  {!auth.token?<Button title={t('Iniciar sessão')} onPress={()=>router.push('/login')}/>:null}
  {confirmedIdentity&&recorded?<View style={styles.panel}>
    <Text style={styles.sectionTitle}>{t('Resultado já registado')}</Text>
    <Text style={styles.hint}>{t('Este jogo já originou uma jornada. Consulta as classificações da comunidade; não vamos criar uma segunda jornada.')}</Text>
    <Button secondary title={t('Abrir comunidade')} onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(communityId)}})}/>
   </View>:null}
  {confirmedIdentity&&!recorded&&!loading?<View style={styles.panel}>
    {football&&scoreSupported?<View style={styles.scorePanel}>
      <Text style={styles.sectionTitle}>{t('Marcador oficial')}</Text>
      <Text style={styles.hint}>{t('Preenche ambos os resultados ou deixa ambos vazios. O marcador tem de concordar com o vencedor escolhido.')}</Text>
      <View style={styles.scoreRow}>
        <View style={styles.scoreField}><Text style={styles.statLabel}>{t('Equipa A')}</Text><TextInput accessibilityLabel={t('Golos oficiais Equipa A')}
          value={scoreA} onChangeText={setScoreA} editable={!busy} keyboardType="number-pad" maxLength={2}
          placeholder="—" placeholderTextColor={C.muted} style={styles.scoreInput}/></View>
        <Text style={styles.scoreDivider}>–</Text>
        <View style={styles.scoreField}><Text style={styles.statLabel}>{t('Equipa B')}</Text><TextInput accessibilityLabel={t('Golos oficiais Equipa B')}
          value={scoreB} onChangeText={setScoreB} editable={!busy} keyboardType="number-pad" maxLength={2}
          placeholder="—" placeholderTextColor={C.muted} style={styles.scoreInput}/></View>
      </View>
    </View>:null}
    <Text style={styles.sectionTitle}>{t('Quem venceu?')}</Text>
    <View style={styles.choiceRow}>
     {([{id:'A',label:t('Equipa A')},{id:'DRAW',label:t('Empate')},{id:'B',label:t('Equipa B')}] as const).map(option=>
      <Pressable key={option.id} accessibilityRole="button" accessibilityState={{selected:outcome===option.id,disabled:busy}}
       disabled={busy} onPress={()=>setOutcome(option.id)}
       style={[styles.choice,outcome===option.id&&styles.choiceActive]}>
       <Text style={styles.choiceText}>{option.label}</Text>
      </Pressable>)}
    </View>
    <Text style={styles.sectionTitle}>{t('Jogadores que participaram')}</Text>
    <Text style={styles.hint}>{t('Confirma quem jogou e em que equipa. Só serão incluídos jogadores inscritos que o servidor devolveu.')}</Text>
    {roster.length===0?<Message>{t('Sem jogadores elegíveis. Atualiza o jogo e confirma as inscrições antes de registar o resultado.')}</Message>:null}
    {roster.map(player=><View key={player.id} style={styles.player}>
     <Pressable accessibilityRole="checkbox" accessibilityState={{checked:player.selected,disabled:busy}}
      disabled={busy} onPress={()=>change(player.id,{selected:!player.selected})} style={styles.checkbox}>
      <Text style={styles.playerName}>{player.selected?'☑':'☐'} {player.label}</Text>
     </Pressable>
     {(['A','B'] as CompetitionTeam[]).map(team=><Pressable key={team}
      accessibilityRole="button" accessibilityLabel={t('Atribuir {user} à equipa {v}',{user:player.label,v:team})}
      accessibilityState={{selected:player.team===team,disabled:busy}} disabled={busy}
      onPress={()=>change(player.id,{team,selected:true})}
      style={[styles.teamButton,player.team===team&&player.selected&&styles.teamSelected]}>
      <Text style={styles.teamText}>{team}</Text>
     </Pressable>)}
    </View>)}
    {football&&playerStatsSupported?<Text style={styles.hint}>{t('Indica apenas as estatísticas que conheces. Deixa em branco quando não souberes; zero significa que confirmaste 0.')}</Text>:null}
    {football&&playerStatsSupported?roster.filter(player=>player.selected).map(player=><View key={'stats-'+player.id} style={styles.statsRow}>
      <Text style={styles.statsName} numberOfLines={1}>{t('{a} · Equipa {b}',{a:player.label,b:player.team||'?'})}</Text>
      <View style={styles.statFields}>
        <View style={styles.statField}><Text style={styles.statLabel}>{t('Golos')}</Text>
          <TextInput accessibilityLabel={t('Golos de {v}',{v:player.label})} value={player.goals}
            keyboardType="number-pad" maxLength={2} editable={!busy}
            onChangeText={value=>change(player.id,{goals:value})} placeholder="—" placeholderTextColor={C.muted} style={styles.statInput}/></View>
        <View style={styles.statField}><Text style={styles.statLabel}>{t('Assistências')}</Text>
          <TextInput accessibilityLabel={t('Assistências de {v}',{v:player.label})} value={player.assists}
            keyboardType="number-pad" maxLength={2} editable={!busy}
            onChangeText={value=>change(player.id,{assists:value})} placeholder="—" placeholderTextColor={C.muted} style={styles.statInput}/></View>
      </View>
    </View>):null}
    <Button title={busy?t('A registar…'):t('Registar resultado nas classificações')} disabled={busy||!roster.length||!outcome} onPress={confirm}/>
   </View>:null}
  <Button secondary title={t('Voltar ao jogo')} onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:26,color:C.white,fontWeight:'900'},hint:{fontSize:12,color:C.muted,lineHeight:19},
 panel:{padding:16,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,gap:14},
 sectionTitle:{fontSize:17,fontWeight:'900',color:C.white},
 choiceRow:{flexDirection:'row',gap:7},choice:{flex:1,minHeight:48,padding:8,justifyContent:'center',alignItems:'center',borderRadius:12,borderWidth:1,borderColor:C.border},
 choiceActive:{borderColor:C.mint,backgroundColor:C.surface2},choiceText:{fontSize:12,color:C.white,fontWeight:'800'},
 player:{flexDirection:'row',gap:9,alignItems:'center',minHeight:48,paddingVertical:6,borderBottomWidth:1,borderBottomColor:C.border},
 checkbox:{flex:1,minHeight:44,justifyContent:'center'},playerName:{color:C.white,fontSize:13,fontWeight:'700'},
 teamButton:{width:42,minHeight:42,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.border,borderRadius:10},
 teamSelected:{borderColor:C.mint,backgroundColor:C.surface2},teamText:{color:C.white,fontSize:13,fontWeight:'900'},
 statsRow:{gap:9,paddingVertical:9,borderBottomWidth:1,borderBottomColor:C.border},statsName:{fontSize:13,color:C.white,fontWeight:'800'},statFields:{flexDirection:'row',gap:10},statField:{flex:1,gap:5},statLabel:{fontSize:11,color:C.muted,fontWeight:'800'},statInput:{minHeight:46,backgroundColor:C.surface2,color:C.white,borderRadius:10,borderWidth:1,borderColor:C.border,paddingHorizontal:12,fontSize:15},
 scorePanel:{gap:12},scoreRow:{flexDirection:'row',alignItems:'center',gap:12},scoreField:{flex:1,gap:6},scoreDivider:{color:C.white,fontSize:24,fontWeight:'900'},scoreInput:{minHeight:64,backgroundColor:C.surface2,borderRadius:12,borderWidth:1,borderColor:C.border,color:C.white,textAlign:'center',fontSize:30,fontWeight:'900'}
});
