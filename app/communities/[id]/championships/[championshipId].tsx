import React,{useCallback,useRef,useState} from 'react';
import {t} from '../../../../src/lib/i18n';
import {Alert,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {communityChampionships,championshipStandings,addChampionshipCompetition,setChampionshipWinnerPoints,setChampionshipPlacementPoints,closeCommunityChampionship,type CommunityChampionship,type ChampionshipStandings} from '../../../../src/lib/championship-api';
import {C} from '../../../../src/lib/theme';
import {communityDetails} from '../../../../src/lib/community-api';
import {tournamentsForCommunity} from '../../../../src/lib/competition-api';
import type {JynloTournament} from '../../../../src/lib/types';

export default function ChampionshipDetail(){
 const {id,championshipId}=useLocalSearchParams<{id:string;championshipId:string}>();
 const communityId=Number(id),competitionId=Number(championshipId),auth=useAuth(),router=useRouter();
 const [championship,setChampionship]=useState<CommunityChampionship|null>(null);
 const [standings,setStandings]=useState<ChampionshipStandings|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[standingsError,setStandingsError]=useState('');
 const [retry,setRetry]=useState(0);
 const [organizer,setOrganizer]=useState(false),[available,setAvailable]=useState<JynloTournament[]>([]);
 const [manageError,setManageError]=useState(''),[saving,setSaving]=useState(false),[pointsDraft,setPointsDraft]=useState<Record<number,string>>({}),[placementDraft,setPlacementDraft]=useState<Record<number,string>>({});
 const savingRef=useRef(false);
 useFocusEffect(useCallback(()=>{
  let active=true;
  const load=async()=>{
   setLoading(true);setError('');setStandingsError('');setManageError('');setChampionship(null);setStandings(null);setOrganizer(false);setAvailable([]);
   try{
    if(!auth.token)throw Error(t('Inicia sessão para consultar campeonatos.'));
    if(!Number.isSafeInteger(communityId)||communityId<=0||!Number.isSafeInteger(competitionId)||competitionId<=0)throw Error(t('Campeonato inválido.'));
    const championships=await communityChampionships(communityId,auth.token);
    if(!active)return;
    const selected=championships.find(item=>item.id===competitionId);
    if(!selected)throw Error(t('Campeonato não encontrado ou sem acesso.'));
    setChampionship(selected);
    if(auth.username){
     try{
      const group=await communityDetails(communityId,auth.token,auth.username);
      if(!active)return;
      const role='myRole' in group?group.myRole:null;
      const canManage=role==='OWNER'||role==='ADMIN';
      setOrganizer(canManage);
      if(canManage&&!selected.closedAt){const all=await tournamentsForCommunity(communityId,auth.token,auth.username);
       if(active)setAvailable(all.filter(t=>t.sport===selected.sport&&!selected.competitions.some(item=>item.id===t.id)));}
     }catch(e){if(active)setManageError(e instanceof Error?e.message:t('Não foi possível carregar as opções de gestão.'));}
    }
    try{
     const table=await championshipStandings(communityId,competitionId,auth.token);
     if(active)setStandings(table);
    }catch(e){if(active)setStandingsError(e instanceof Error?e.message:t('Não foi possível carregar a classificação.'));}
   }catch(e){if(active)setError(e instanceof Error?e.message:t('Não foi possível abrir o campeonato.'));}
   finally{if(active)setLoading(false);}
  };
  void load();return()=>{active=false;};
 },[communityId,competitionId,auth.token,auth.username,retry]));
 async function update(action:()=>Promise<CommunityChampionship>){
  if(savingRef.current||saving||!auth.token||!organizer||!championship||championship.closedAt)return;
  savingRef.current=true;setSaving(true);setManageError('');
  try{await action();setRetry(n=>n+1);}
  catch(e){setManageError((e instanceof Error?e.message:t('Não foi possível guardar a alteração.'))+' '+t('Confirma o estado antes de repetir.'));}
  finally{savingRef.current=false;setSaving(false);}
 }
 return <Page><DemoBanner/><Eyebrow>{t('CAMPEONATO')}</Eyebrow>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error?<Button secondary title={t('Tentar novamente')} onPress={()=>setRetry(value=>value+1)}/>:null}
  {championship?<View style={styles.card}>
   <Text style={styles.heading}>{championship.name}</Text>
   <Text style={styles.sub}>{t('{a} · Época {b}',{a:championship.sport,b:championship.seasonLabel})}</Text>
   {championship.closedAt?<Message>Campeonato encerrado · Classificação e resultados arquivados{championship.championDisplayName?` · Campeão: ${championship.championDisplayName}`:''}</Message>:null}
   <Button secondary title={t('Equipas do campeonato')} onPress={()=>router.push({pathname:'/communities/[id]/championships/teams',params:{id:String(communityId),championshipId:String(competitionId)}})}/>
   <Button title={t('Ligas, Taças e resultados')} onPress={()=>router.push({pathname:'/communities/[id]/championships/events',params:{id:String(communityId),championshipId:String(competitionId)}})}/>
   <Text style={styles.title}>{t('Provas do campeonato')}</Text>
   {championship.competitions.length===0?<Text style={styles.sub}>{t('Ainda não há torneios associados.')}</Text>:null}
   {championship.competitions.map(item=><View key={item.id} style={styles.row}>
    <Text style={styles.name}>{item.name}</Text>
    <Text style={styles.sub}>{item.status} · {item.winnerConfirmed?t('Vencedor confirmado'):t('Resultado pendente')}</Text>
    {organizer&&!championship.closedAt&&item.status==='DRAFT'?<View style={styles.scoring}>
     <Text style={styles.sub}>{t('Pontos atribuídos ao vencedor')}</Text>
     <TextInput style={styles.input} keyboardType="number-pad" value={pointsDraft[item.id]??String(item.winnerPoints)} onChangeText={value=>setPointsDraft(current=>({...current,[item.id]:value}))} editable={!saving} maxLength={5}/>
     <Button secondary title={t('Guardar pontuação')} disabled={saving} onPress={()=>{
      const raw=pointsDraft[item.id]??String(item.winnerPoints);
      const points=Number(raw);
      if(!/^\d+$/.test(raw)||!Number.isInteger(points)||points>10000){setManageError(t('Indica uma pontuação inteira entre 0 e 10000.'));return;}
      void update(()=>setChampionshipWinnerPoints(communityId,competitionId,item.id,points,auth.token!));
     }}/>
    </View>:null}
    {organizer&&!championship.closedAt&&item.status==='DRAFT'?<View style={styles.scoring}>
     <Text style={styles.sub}>{t('Pontos por posição (2 a 20 lugares, por ordem decrescente)')}</Text>
     <TextInput style={styles.input} keyboardType="numbers-and-punctuation" value={placementDraft[item.id]??item.pointsByPlace??''} onChangeText={value=>setPlacementDraft(current=>({...current,[item.id]:value}))} editable={!saving} maxLength={120} placeholder={t('Ex.: 25,18,15,12,10')} placeholderTextColor={C.muted}/>
     <Button secondary title={t('Guardar pontos por posição')} disabled={saving} onPress={()=>{void update(()=>setChampionshipPlacementPoints(communityId,competitionId,item.id,placementDraft[item.id]??item.pointsByPlace??'',auth.token!));}}/>
    </View>:null}
    <Button secondary title={t('Ver torneio')} onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(communityId),id:String(item.id)}})}/>
   </View>)}
   {organizer&&!championship.closedAt?<View style={styles.row}>
    <Text style={styles.title}>{t('Associar torneios existentes')}</Text>
    {manageError?<Message tone="error">{manageError}</Message>:null}
    {available.length===0?<Text style={styles.sub}>{t('Não existem torneios da mesma modalidade por associar.')}</Text>:null}
    {available.map(item=><View key={item.id} style={styles.scoring}>
     <Text style={styles.name}>{item.name}</Text>
     <Button secondary title={t('Adicionar ao campeonato')} disabled={saving} onPress={()=>Alert.alert(t('Associar torneio?'),item.name,[{text:t('Cancelar'),style:'cancel'},{text:t('Associar'),onPress:()=>{void update(()=>addChampionshipCompetition(communityId,competitionId,item.id,auth.token!));}}])}/>
    </View>)}
   </View>:null}
   <Text style={styles.title}>{t('Classificação geral')}</Text>
   {standingsError?<Message tone="error">{standingsError}</Message>:null}
   {standingsError?<Button secondary title={t('Recarregar classificação')} onPress={()=>setRetry(value=>value+1)}/>:null}
   {standings?<Text style={styles.sub}>{t('{a} provas pontuadas · {b} só com vencedor · {c} pendentes',{a:standings.fullyScoredCompetitions,b:standings.winnerOnlyCompetitions,c:standings.pendingCompetitions})}</Text>:null}
   {standings&&standings.standings.length===0?<Text style={styles.sub}>{t('Ainda não existem resultados confirmados para a classificação.')}</Text>:null}
   {organizer&&!championship.closedAt&&standings&&!standingsError?<View style={styles.row}>
    <Text style={styles.title}>{t('Encerrar campeonato')}</Text>
    <Text style={styles.sub}>{t('O encerramento guarda a classificação final e impede futuras alterações. O servidor verifica os resultados e desempates antes de aceitar.')}</Text>
    <Button secondary title={t('Encerrar campeonato')} disabled={saving} onPress={()=>Alert.alert(t('Encerrar campeonato?'), t('Esta ação é definitiva. A classificação final e os resultados ficam arquivados e não poderão ser alterados.'),[
     {text:t('Cancelar'),style:'cancel'},
     {text:t('Encerrar definitivamente'),style:'destructive',onPress:()=>{void update(()=>closeCommunityChampionship(communityId,competitionId,auth.token!));}}
    ])}/>
   </View>:null}
   {standings?.standings.map((row,index)=><View key={row.entryType+':'+row.participantId} style={styles.standing}>
    <Text style={styles.name}>{index+1}. {row.name}</Text>
    <Text style={styles.sub}>{t('{a} pontos · {b} vitórias · {c} provas',{a:row.points,b:row.victories,c:row.awardedCompetitions})}</Text>
   </View>)}
  </View>:null}
  <Button secondary title={t('Voltar às competições')} onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 card:{padding:17,gap:13,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 heading:{fontSize:25,fontWeight:'900',color:C.white},
 title:{fontSize:18,fontWeight:'800',color:C.white,marginTop:8},
 name:{fontSize:15,fontWeight:'700',color:C.white},
 sub:{fontSize:13,lineHeight:19,color:C.muted},
 row:{gap:7,padding:12,backgroundColor:C.surface2,borderRadius:12},
 standing:{gap:4,paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.border},
 scoring:{gap:8,paddingVertical:6},input:{borderWidth:1,borderColor:C.border,borderRadius:10,padding:10,color:C.white,backgroundColor:C.surface2}
});
