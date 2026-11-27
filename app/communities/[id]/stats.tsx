import React,{useCallback,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams} from 'expo-router';
import {t} from '../../../src/lib/i18n';
import {useAuth} from '../../../src/lib/auth';
import {Loader,Message,Page} from '../../../src/components/UI';
import {C} from '../../../src/lib/theme';
import {sportName} from '../../../src/lib/sport-names.cjs';
import {communityResultsOverview,type CommunityResultsOverview,type CommunityStanding} from '../../../src/lib/community-results-api';

const nameOf=(r:CommunityStanding)=>r.fullName||r.username||t('Jogador');
const keyOf=(r:CommunityStanding)=>(r.username||r.fullName||'')+'#'+r.position;

/** Same choice as the website: the best value wins, ties go to the better-placed player; nothing without a real value. */
function best(rows:CommunityStanding[],value:(r:CommunityStanding)=>number):CommunityStanding|undefined{
 let top:CommunityStanding|undefined;
 for(const r of rows){const v=value(r);if(v<=0)continue;if(!top||v>value(top)||(v===value(top)&&r.position<top.position))top=r;}
 return top;
}

/** Community statistics: leaders, records, a head-to-head and the full table — the website's "Estatísticas" tab. */
export default function CommunityStatsScreen(){
 const {id:rawId}=useLocalSearchParams<{id:string}>();
 const id=typeof rawId==='string'&&/^[1-9]\d*$/.test(rawId)?Number(rawId):NaN;
 const auth=useAuth();
 const [seasonId,setSeasonId]=useState<number|null>(null);
 const [data,setData]=useState<CommunityResultsOverview|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [a,setA]=useState(''),[b,setB]=useState('');
 useFocusEffect(useCallback(()=>{
  let alive=true;
  setLoading(true);setError('');
  if(!Number.isSafeInteger(id)||!auth.token){setLoading(false);return()=>{alive=false;};}
  communityResultsOverview(id,auth.token,seasonId).then(d=>{if(alive)setData(d);})
   .catch(e=>{if(alive){setData(null);setError(e instanceof Error?e.message:t('Não foi possível carregar as estatísticas.'));}})
   .finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[id,auth.token,seasonId]));
 const rows=useMemo(()=>(data?.standings??[]).filter(r=>r.games>0),[data]);
 const enabled=data?.settings?.rankingsEnabled!==false;
 const leader=rows[0]&&(rows[0].games>0||rows[0].points>0)?rows[0]:undefined;
 const leaders:[string,CommunityStanding|undefined,(r:CommunityStanding)=>string][]=[
  [t('Líder'),leader,r=>t('{a} pts',{a:r.points})],
  [t('Mais golos'),best(rows,r=>r.goals),r=>String(r.goals)],
  [t('Mais assistências'),best(rows,r=>r.assists),r=>String(r.assists)],
  [t('Mais MVP'),best(rows,r=>r.mvps??0),r=>String(r.mvps??0)],
  [t('Mais jogos sem sofrer'),best(rows,r=>r.cleanSheets??0),r=>String(r.cleanSheets??0)],
  [t('Mais jogos'),best(rows,r=>r.games),r=>String(r.games)],
  [t('Melhor % de vitórias'),best(rows,r=>r.winRate??0),r=>(r.winRate??0)+'%'],
  [t('Maior série de vitórias'),best(rows,r=>r.bestWinStreak??0),r=>String(r.bestWinStreak??0)],
 ];
 const pa=rows.find(r=>keyOf(r)===a),pb=rows.find(r=>keyOf(r)===b);
 const compare:[string,(r:CommunityStanding)=>number][]=[[t('Pontos'),r=>r.points],[t('Jogos'),r=>r.games],[t('Vitórias'),r=>r.wins],
  [t('Golos'),r=>r.goals],[t('Assistências'),r=>r.assists],[t('% vitórias'),r=>r.winRate??0]];
 return <Page>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {!loading&&data&&!enabled?<Message>{t('Esta comunidade não tem a classificação ligada, por isso ainda não há estatísticas.')}</Message>:null}
  {data&&enabled?<>
   <Text style={styles.hint}>{t('Estatísticas das jornadas regulares da comunidade, incluindo histórico importado por Excel. Não incluem automaticamente os torneios.')}</Text>
   {data.seasons.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
    <Pressable accessibilityRole="button" accessibilityState={{selected:seasonId===null}} onPress={()=>setSeasonId(null)} style={[styles.chip,seasonId===null&&styles.chipOn]}>
     <Text style={[styles.chipText,seasonId===null&&styles.chipTextOn]}>{t('Todas')}</Text></Pressable>
    {data.seasons.map(s=><Pressable key={s.id} accessibilityRole="button" accessibilityState={{selected:seasonId===s.id}} onPress={()=>setSeasonId(s.id)} style={[styles.chip,seasonId===s.id&&styles.chipOn]}>
     <Text style={[styles.chipText,seasonId===s.id&&styles.chipTextOn]}>{s.label||s.name||t('Época {n}',{n:s.id})}{s.sport?' · '+sportName(s.sport):''}</Text></Pressable>)}
   </ScrollView>:null}
   {rows.length===0?<Message>{t('Ainda não há jogos com resultado nesta seleção.')}</Message>:<>
    <View style={styles.grid}>
     {leaders.filter(([, r])=>!!r).map(([label,r,value])=><View key={label} style={styles.leader}>
      <Text style={styles.leaderLabel}>{label}</Text>
      <Text style={styles.leaderName} numberOfLines={1}>{nameOf(r!)}</Text>
      <Text style={styles.leaderValue}>{value(r!)}</Text>
     </View>)}
    </View>

    <View style={styles.section}>
     <Text style={styles.sectionTitle}>{t('Comparar jogadores')}</Text>
     {(['A','B'] as const).map(side=><ScrollView key={side} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      <Text style={styles.side}>{side}</Text>
      {rows.map(r=>{const sel=(side==='A'?a:b)===keyOf(r);return <Pressable key={keyOf(r)} accessibilityRole="button" accessibilityState={{selected:sel}}
       onPress={()=>side==='A'?setA(sel?'':keyOf(r)):setB(sel?'':keyOf(r))} style={[styles.chip,sel&&styles.chipOn]}>
       <Text style={[styles.chipText,sel&&styles.chipTextOn]} numberOfLines={1}>{nameOf(r)}</Text></Pressable>;})}
     </ScrollView>)}
     {pa&&pb?compare.map(([label,v])=>{const x=v(pa),y=v(pb);return <View key={label} style={styles.cmpRow}>
      <Text style={[styles.cmpVal,x>y&&styles.cmpWin]}>{label===t('% vitórias')?x+'%':x}</Text>
      <Text style={styles.cmpLabel}>{label}</Text>
      <Text style={[styles.cmpVal,{textAlign:'right'},y>x&&styles.cmpWin]}>{label===t('% vitórias')?y+'%':y}</Text>
     </View>;}):<Text style={styles.hint}>{t('Escolhe um jogador em A e outro em B.')}</Text>}
    </View>

    <View style={styles.section}>
     <Text style={styles.sectionTitle}>{t('Tabela completa')}</Text>
     <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
       <View style={styles.tr}>{[t('#'),t('Jogador'),t('J'),t('V'),t('E'),t('D'),t('Pts'),t('Golos'),t('Assist.'),t('MVP'),t('% V'),t('Série')].map((h,i)=>
        <Text key={h+i} style={[styles.th,i===1&&styles.nameCol]}>{h}</Text>)}</View>
       {rows.map(r=><View key={keyOf(r)} style={styles.tr}>
        <Text style={styles.td}>{r.position}</Text>
        <Text style={[styles.td,styles.nameCol,{fontWeight:'800'}]} numberOfLines={1}>{nameOf(r)}</Text>
        <Text style={styles.td}>{r.games}</Text><Text style={styles.td}>{r.wins}</Text><Text style={styles.td}>{r.draws}</Text>
        <Text style={styles.td}>{r.losses}</Text><Text style={[styles.td,{fontWeight:'900'}]}>{r.points}</Text>
        <Text style={styles.td}>{r.goals}</Text><Text style={styles.td}>{r.assists}</Text><Text style={styles.td}>{r.mvps??0}</Text>
        <Text style={styles.td}>{(r.winRate??0)+'%'}</Text><Text style={styles.td}>{r.currentStreak||'—'}</Text>
       </View>)}
      </View>
     </ScrollView>
    </View>
   </>}
  </>:null}
 </Page>;
}

const styles=StyleSheet.create({
 hint:{color:C.muted,fontSize:12,lineHeight:18},
 chips:{gap:8,paddingVertical:2,paddingRight:16,alignItems:'center'},
 chip:{minHeight:40,paddingHorizontal:12,justifyContent:'center',borderRadius:20,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,maxWidth:180},
 chipOn:{backgroundColor:C.mint,borderColor:C.mint},chipText:{color:C.white,fontWeight:'700',fontSize:13},chipTextOn:{color:C.background},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:10},
 leader:{flexBasis:'47%',flexGrow:1,padding:12,gap:3,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 leaderLabel:{color:C.muted,fontSize:11,fontWeight:'800',letterSpacing:.4},leaderName:{color:C.white,fontSize:14,fontWeight:'800'},
 leaderValue:{color:C.mint,fontSize:20,fontWeight:'900'},
 section:{padding:14,gap:10,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 sectionTitle:{color:C.white,fontSize:17,fontWeight:'900'},side:{color:C.mint,fontWeight:'900',width:18},
 cmpRow:{flexDirection:'row',alignItems:'center',paddingVertical:6,borderTopWidth:1,borderTopColor:C.border},
 cmpVal:{flex:1,color:C.white,fontSize:15,fontWeight:'700'},cmpWin:{color:C.mint,fontWeight:'900'},cmpLabel:{color:C.muted,fontSize:12,width:110,textAlign:'center'},
 tr:{flexDirection:'row',alignItems:'center',minHeight:36,borderBottomWidth:1,borderBottomColor:C.border},
 th:{width:46,color:C.muted,fontSize:11,fontWeight:'800',textAlign:'center'},td:{width:46,color:C.white,fontSize:13,textAlign:'center'},
 nameCol:{width:140,textAlign:'left'},
});
