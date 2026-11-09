import React,{useCallback,useState} from 'react';
import {Alert,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {communityChampionships,championshipStandings,addChampionshipCompetition,setChampionshipWinnerPoints,setChampionshipPlacementPoints,type CommunityChampionship,type ChampionshipStandings} from '../../../../src/lib/championship-api';
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
 useFocusEffect(useCallback(()=>{
  let active=true;
  const load=async()=>{
   setLoading(true);setError('');setStandingsError('');setManageError('');setChampionship(null);setStandings(null);setOrganizer(false);setAvailable([]);
   try{
    if(!auth.token)throw Error('Inicia sessão para consultar campeonatos.');
    if(!Number.isSafeInteger(communityId)||communityId<=0||!Number.isSafeInteger(competitionId)||competitionId<=0)throw Error('Campeonato inválido.');
    const championships=await communityChampionships(communityId,auth.token);
    if(!active)return;
    const selected=championships.find(item=>item.id===competitionId);
    if(!selected)throw Error('Campeonato não encontrado ou sem acesso.');
    setChampionship(selected);
    if(auth.username){
     try{
      const group=await communityDetails(communityId,auth.token,auth.username);
      if(!active)return;
      const role='myRole' in group?group.myRole:null;
      const canManage=role==='OWNER'||role==='ADMIN';
      setOrganizer(canManage);
      if(canManage){const all=await tournamentsForCommunity(communityId,auth.token,auth.username);
       if(active)setAvailable(all.filter(t=>t.sport===selected.sport&&!selected.competitions.some(item=>item.id===t.id)));}
     }catch(e){if(active)setManageError(e instanceof Error?e.message:'Não foi possível carregar as opções de gestão.');}
    }
    try{
     const table=await championshipStandings(communityId,competitionId,auth.token);
     if(active)setStandings(table);
    }catch(e){if(active)setStandingsError(e instanceof Error?e.message:'Não foi possível carregar a classificação.');}
   }catch(e){if(active)setError(e instanceof Error?e.message:'Não foi possível abrir o campeonato.');}
   finally{if(active)setLoading(false);}
  };
  void load();return()=>{active=false;};
 },[communityId,competitionId,auth.token,auth.username,retry]));
 async function update(action:()=>Promise<CommunityChampionship>){
  if(saving||!auth.token||!organizer)return;
  setSaving(true);setManageError('');
  try{await action();setRetry(n=>n+1);}
  catch(e){setManageError(e instanceof Error?e.message:'Não foi possível guardar a alteração.');}
  finally{setSaving(false);}
 }
 return <Page><DemoBanner/><Eyebrow>CAMPEONATO</Eyebrow>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error?<Button secondary title="Tentar novamente" onPress={()=>setRetry(value=>value+1)}/>:null}
  {championship?<View style={styles.card}>
   <Text style={styles.heading}>{championship.name}</Text>
   <Text style={styles.sub}>{championship.sport} · Época {championship.seasonLabel}</Text>
   <Text style={styles.title}>Provas do campeonato</Text>
   {championship.competitions.length===0?<Text style={styles.sub}>Ainda não há torneios associados.</Text>:null}
   {championship.competitions.map(item=><View key={item.id} style={styles.row}>
    <Text style={styles.name}>{item.name}</Text>
    <Text style={styles.sub}>{item.status} · {item.winnerConfirmed?'Vencedor confirmado':'Resultado pendente'}</Text>
    {organizer?<View style={styles.scoring}>
     <Text style={styles.sub}>Pontos atribuídos ao vencedor</Text>
     <TextInput style={styles.input} keyboardType="number-pad" value={pointsDraft[item.id]??String(item.winnerPoints)} onChangeText={value=>setPointsDraft(current=>({...current,[item.id]:value}))} editable={!saving} maxLength={5}/>
     <Button secondary title="Guardar pontuação" disabled={saving} onPress={()=>{
      const raw=pointsDraft[item.id]??String(item.winnerPoints);
      const points=Number(raw);
      if(!/^\\d+$/.test(raw)||!Number.isInteger(points)||points>10000){setManageError('Indica uma pontuação inteira entre 0 e 10000.');return;}
      void update(()=>setChampionshipWinnerPoints(communityId,competitionId,item.id,points,auth.token!));
     }}/>
    </View>:null}
    {organizer&&item.status==='DRAFT'?<View style={styles.scoring}>
     <Text style={styles.sub}>Pontos por posição (2 a 20 lugares, por ordem decrescente)</Text>
     <TextInput style={styles.input} keyboardType="numbers-and-punctuation" value={placementDraft[item.id]??item.pointsByPlace??''} onChangeText={value=>setPlacementDraft(current=>({...current,[item.id]:value}))} editable={!saving} maxLength={120} placeholder="Ex.: 25,18,15,12,10" placeholderTextColor={C.muted}/>
     <Button secondary title="Guardar pontos por posição" disabled={saving} onPress={()=>{void update(()=>setChampionshipPlacementPoints(communityId,competitionId,item.id,placementDraft[item.id]??item.pointsByPlace??'',auth.token!));}}/>
    </View>:null}
    <Button secondary title="Ver torneio" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(communityId),id:String(item.id)}})}/>
   </View>)}
   {organizer?<View style={styles.row}>
    <Text style={styles.title}>Associar torneios existentes</Text>
    {manageError?<Message tone="error">{manageError}</Message>:null}
    {available.length===0?<Text style={styles.sub}>Não existem torneios da mesma modalidade por associar.</Text>:null}
    {available.map(item=><View key={item.id} style={styles.scoring}>
     <Text style={styles.name}>{item.name}</Text>
     <Button secondary title="Adicionar ao campeonato" disabled={saving} onPress={()=>Alert.alert('Associar torneio?',item.name,[{text:'Cancelar',style:'cancel'},{text:'Associar',onPress:()=>{void update(()=>addChampionshipCompetition(communityId,competitionId,item.id,auth.token!));}}])}/>
    </View>)}
   </View>:null}
   <Text style={styles.title}>Classificação geral</Text>
   {standingsError?<Message tone="error">{standingsError}</Message>:null}
   {standingsError?<Button secondary title="Recarregar classificação" onPress={()=>setRetry(value=>value+1)}/>:null}
   {standings?<Text style={styles.sub}>{standings.fullyScoredCompetitions} provas pontuadas · {standings.winnerOnlyCompetitions} só com vencedor · {standings.pendingCompetitions} pendentes</Text>:null}
   {standings&&standings.standings.length===0?<Text style={styles.sub}>Ainda não existem resultados confirmados para a classificação.</Text>:null}
   {standings?.standings.map((row,index)=><View key={row.entryType+':'+row.participantId} style={styles.standing}>
    <Text style={styles.name}>{index+1}. {row.name}</Text>
    <Text style={styles.sub}>{row.points} pontos · {row.victories} vitórias · {row.awardedCompetitions} provas</Text>
   </View>)}
  </View>:null}
  <Button secondary title="Voltar às competições" onPress={()=>router.back()}/>
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
