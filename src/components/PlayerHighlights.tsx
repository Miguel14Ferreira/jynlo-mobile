import React,{useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {t} from '../lib/i18n';
import {C} from '../lib/theme';
import {communityMonthLeaders,playerOfMonthPoll,playerStats,type MonthLeader,type PlayerStats} from '../lib/player-highlights-api';

/** A player's numbers from community games (goals, assists, MVP), on the profile. */
export function PlayerStatsRow({username,token}:{username:string;token:string|null}){
 const [stats,setStats]=useState<PlayerStats|null>(null);
 useEffect(()=>{let alive=true;setStats(null);void playerStats(username,token).then(s=>{if(alive)setStats(s);}).catch(()=>{});return()=>{alive=false;};},[username,token]);
 if(!stats||stats.games<=0)return null;
 const cells:[number,string][]=[[stats.games,t('Jogos')],[stats.wins,t('Vitórias')],[stats.goals,t('Golos')],[stats.assists,t('Assistências')],[stats.mvps,'MVP']];
 return <View style={styles.stats} accessibilityLabel={t('Estatísticas')}>
  {cells.map(([n,label])=><View key={label} style={styles.cell}><Text maxFontSizeMultiplier={1.3} style={styles.num}>{n}</Text><Text style={styles.cellLabel} numberOfLines={1}>{label}</Text></View>)}
 </View>;
}

/** "Destaques do mês" in a community, and the "Jogador do mês" vote for admins. */
export function CommunityMonthLeaders({communityId,token,canManage}:{communityId:number;token:string|null;canManage:boolean}){
 const router=useRouter();
 const [leaders,setLeaders]=useState<MonthLeader[]>([]),[busy,setBusy]=useState(false),[created,setCreated]=useState(false),[note,setNote]=useState('');
 useEffect(()=>{let alive=true;setLeaders([]);void communityMonthLeaders(communityId,token).then(l=>{if(alive)setLeaders(l);}).catch(()=>{});return()=>{alive=false;};},[communityId,token]);
 if(!leaders.length)return null;
 async function vote(){
  if(busy||!token)return;setBusy(true);setNote('');
  try{await playerOfMonthPoll(communityId,token);setCreated(true);setNote(t('A votação está no chat da comunidade.'));}
  catch(e){setNote(e instanceof Error?e.message:t('Não foi possível criar a votação.'));}
  finally{setBusy(false);}
 }
 return <View style={styles.card}>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>🏆 {t('Destaques do mês')}</Text>
  {leaders.map((l,i)=><Pressable key={i} disabled={!l.username} accessibilityRole={l.username?'link':undefined}
   onPress={()=>{if(l.username)router.push({pathname:'/social/[username]',params:{username:l.username}});}} style={styles.row}>
   <View style={[styles.pos,i===0&&styles.posFirst]}><Text style={[styles.posText,i===0&&styles.posTextFirst]}>{i+1}</Text></View>
   <Text style={styles.name} numberOfLines={1}>{l.name}</Text>
   <Text style={styles.nums}>⚽ {l.goals} · 🅰️ {l.assists} · ⭐ {l.mvps}</Text>
  </Pressable>)}
  {canManage?<Pressable accessibilityRole="button" disabled={busy||created} onPress={()=>{void vote();}} style={[styles.vote,(busy||created)&&{opacity:.6}]}>
   <Text style={styles.voteText}>{created?t('Votação criada no chat'):busy?t('A criar…'):t('Votar o jogador do mês')}</Text></Pressable>:null}
  {note?<Text style={styles.note}>{note}</Text>:null}
 </View>;
}
const styles=StyleSheet.create({
 stats:{flexDirection:'row',gap:6,marginVertical:8},
 cell:{flex:1,alignItems:'center',gap:2,paddingVertical:10,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 num:{color:C.white,fontSize:18,fontWeight:'900'},
 cellLabel:{color:C.muted,fontSize:10},
 card:{gap:8,padding:14,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 title:{color:C.white,fontSize:16,fontWeight:'900'},
 row:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,paddingHorizontal:10,borderRadius:12,backgroundColor:'#0B2A38'},
 pos:{width:26,height:26,borderRadius:13,backgroundColor:'#163F4D',alignItems:'center',justifyContent:'center'},
 posFirst:{backgroundColor:'#FCD34D'},
 posText:{color:'#BFF7E9',fontWeight:'900',fontSize:12},
 posTextFirst:{color:'#3B2A00'},
 name:{flex:1,color:C.white,fontWeight:'800'},
 nums:{color:C.muted,fontSize:12},
 vote:{alignSelf:'flex-start',backgroundColor:C.mint,borderRadius:999,paddingHorizontal:14,paddingVertical:9},
 voteText:{color:'#062B2E',fontWeight:'900'},
 note:{color:C.muted,fontSize:12},
});
