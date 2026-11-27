import React,{useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {t} from '../lib/i18n';
import {C} from '../lib/theme';
import {listMatchArchives,listStandingArchives,matchArchive,standingArchive,
 type HistoricalArchiveSummary,type HistoricalMatchArchive,type HistoricalStandingArchive} from '../lib/community-results-api';

/** The community's imported history: past standings tables and past games, opened one at a time. */
export function HistoricalArchives({communityId,token}:{communityId:number;token:string|null}){
 const [standings,setStandings]=useState<HistoricalArchiveSummary[]>([]);
 const [matches,setMatches]=useState<HistoricalArchiveSummary[]>([]);
 const [open,setOpen]=useState<string|null>(null);
 const [detail,setDetail]=useState<HistoricalStandingArchive|HistoricalMatchArchive|null>(null);
 const [loadingDetail,setLoadingDetail]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  if(!token||!communityId)return;
  listStandingArchives(communityId,token).then(l=>{if(alive)setStandings(Array.isArray(l)?l:[]);}).catch(()=>{});
  listMatchArchives(communityId,token).then(l=>{if(alive)setMatches(Array.isArray(l)?l:[]);}).catch(()=>{});
  return()=>{alive=false;};
 },[communityId,token]);
 if(!standings.length&&!matches.length)return null;
 async function toggle(kind:'s'|'m',a:HistoricalArchiveSummary){
  const key=kind+a.id;
  if(open===key){setOpen(null);setDetail(null);return;}
  setOpen(key);setDetail(null);setError('');setLoadingDetail(true);
  try{setDetail(kind==='s'?await standingArchive(communityId,a.id,token):await matchArchive(communityId,a.id,token));}
  catch{setError(t('Não foi possível abrir este histórico.'));}
  finally{setLoadingDetail(false);}
 }
 const row=(kind:'s'|'m',a:HistoricalArchiveSummary)=><View key={kind+a.id}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:open===kind+a.id}} onPress={()=>{void toggle(kind,a);}} style={styles.item}>
   <View style={{flex:1,minWidth:0}}><Text style={styles.itemTitle} numberOfLines={2}>{a.title}</Text>
    <Text style={styles.hint}>{a.entryType==='TEAM'?t('Equipas'):t('Individual')} · {new Date(a.createdAt).toLocaleDateString('pt-PT')}</Text></View>
   <Text style={styles.chev}>{open===kind+a.id?'−':'+'}</Text>
  </Pressable>
  {open===kind+a.id?<View style={styles.detail}>
   {loadingDetail?<Text style={styles.hint}>{t('A carregar…')}</Text>:null}
   {error?<Text style={styles.error}>{error}</Text>:null}
   {detail&&kind==='s'?(detail as HistoricalStandingArchive).rows.map(r=><View key={r.position+r.name} style={styles.standing}>
    <Text style={styles.position}>{r.position}.</Text>
    <View style={{flex:1,minWidth:0}}><Text style={styles.name} numberOfLines={1}>{r.name}</Text>
     {r.played!=null?<Text style={styles.hint}>{t('{a} jogos · {b}V {c}E {d}D',{a:r.played,b:r.wins??0,c:r.draws??0,d:r.losses??0})}</Text>:null}</View>
    <Text style={styles.points}>{t('{a} pts',{a:r.points})}</Text>
   </View>):null}
   {detail&&kind==='m'?(detail as HistoricalMatchArchive).rows.map(r=><View key={r.sourceRow} style={styles.match}>
    {r.sourceRound||r.sourceDate?<Text style={styles.hint}>{[r.sourceRound,r.sourceDate].filter(Boolean).join(' · ')}</Text>:null}
    <View style={styles.scoreRow}><Text style={styles.team} numberOfLines={1}>{r.home}</Text>
     <Text style={styles.score}>{r.homeScore} – {r.awayScore}</Text>
     <Text style={[styles.team,{textAlign:'right'}]} numberOfLines={1}>{r.away}</Text></View>
   </View>):null}
  </View>:null}
 </View>;
 return <View style={styles.section}>
  <Text style={styles.sectionTitle}>{t('Histórico importado')}</Text>
  {standings.length?<><Text style={styles.label}>{t('Classificações')}</Text>{standings.map(a=>row('s',a))}</>:null}
  {matches.length?<><Text style={styles.label}>{t('Jogos')}</Text>{matches.map(a=>row('m',a))}</>:null}
 </View>;
}

const styles=StyleSheet.create({
 section:{padding:15,gap:10,borderColor:C.border,borderWidth:1,borderRadius:18,backgroundColor:C.surface},
 sectionTitle:{fontSize:18,fontWeight:'900',color:C.white},label:{color:C.muted,fontSize:12,fontWeight:'800',letterSpacing:.6,marginTop:4},
 item:{flexDirection:'row',alignItems:'center',gap:10,minHeight:52,paddingVertical:8,borderTopWidth:1,borderTopColor:C.border},
 itemTitle:{color:C.white,fontWeight:'800',fontSize:14},chev:{color:C.mint,fontSize:22,fontWeight:'900',width:24,textAlign:'center'},
 hint:{color:C.muted,fontSize:12,lineHeight:18},error:{color:'#ffb4b4',fontSize:13},detail:{paddingBottom:8,gap:2},
 standing:{flexDirection:'row',alignItems:'center',gap:9,paddingVertical:6,borderBottomWidth:1,borderBottomColor:C.border},
 position:{color:C.mint,fontWeight:'900',width:28},name:{color:C.white,fontWeight:'800',fontSize:13},points:{color:C.white,fontWeight:'900',fontSize:14},
 match:{paddingVertical:7,borderBottomWidth:1,borderBottomColor:C.border,gap:2},
 scoreRow:{flexDirection:'row',alignItems:'center',gap:8},team:{flex:1,color:C.white,fontSize:13,fontWeight:'700'},
 score:{color:C.white,fontWeight:'900',fontSize:15,minWidth:56,textAlign:'center'},
});
