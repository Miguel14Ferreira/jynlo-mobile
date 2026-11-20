import React,{useCallback,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {useAuth} from '../lib/auth';
import {mySessions} from '../lib/parity-api';
import {myCommunities} from '../lib/community-api';
import {organizeMySessions} from '../lib/my-sessions-core.cjs';
import {formatDate} from '../lib/format.cjs';
import {MobileTheme} from '../lib/theme';
import {JynloIcon} from '../components/JynloIcon';
import type {CommunityGroup,SessionSummary} from '../lib/types';

const colors=MobileTheme.colors;
const MAX_GAMES=2;

/**
 * "A seguir" block shown at the top of Início for signed-in players: the next
 * games and the player's communities come before the social feed, so a new
 * user lands on what they came to do instead of an empty Stories rail.
 * Read-only; failures hide the block instead of blocking the feed.
 */
export function HomeUpNext(){
 const router=useRouter(),auth=useAuth();
 const [games,setGames]=useState<SessionSummary[]|null>(null);
 const [communities,setCommunities]=useState<CommunityGroup[]>([]);
 const [failed,setFailed]=useState(false);
 const generation=useRef(0);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  if(!auth.token||!auth.username){setGames(null);setCommunities([]);return;}
  const token=auth.token,username=auth.username;
  void Promise.allSettled([mySessions(token,username),myCommunities(token,username)]).then(([sessions,groups])=>{
   if(version!==generation.current)return;
   if(sessions.status==='fulfilled'){
    const organized=organizeMySessions(sessions.value) as {upcoming:{items:SessionSummary[]}[]};
    const upcoming=organized.upcoming.flatMap(group=>group.items)
     .sort((a,b)=>Date.parse(a.gameDate)-Date.parse(b.gameDate));
    setGames(upcoming);setFailed(false);
   }else{setGames(null);setFailed(true);}
   setCommunities(groups.status==='fulfilled'?groups.value:[]);
  });
  return ()=>{generation.current++;};
 },[auth.token,auth.username]));
 if(!auth.token||!auth.username||failed||games===null)return null;
 const next=games.slice(0,MAX_GAMES);
 return <View style={styles.card}>
  <View style={styles.head}>
   <Text style={styles.title}>A seguir</Text>
   <Pressable accessibilityRole="button" onPress={()=>router.push('/my-sessions')} style={styles.link}>
    <Text style={styles.linkText}>{games.length>MAX_GAMES?`Ver todos (${games.length})`:'As minhas sessões'}</Text>
   </Pressable>
  </View>
  {next.length?next.map(game=><Pressable key={game.id} accessibilityRole="button"
    accessibilityLabel={`${game.sport} em ${game.city}, ${formatDate(game.gameDate)}`}
    onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(game.id)}})} style={styles.game}>
    <View style={styles.gameIcon}><JynloIcon name="session" size={22} color={colors.accent}/></View>
    <View style={{flex:1,gap:2}}>
     <Text style={styles.gameTitle} numberOfLines={1}>{game.sport} · {game.city}</Text>
     <Text style={styles.gameMeta} numberOfLines={1}>{formatDate(game.gameDate)} · {game.participantCount}/{game.maxParticipants} jogadores</Text>
    </View>
    <JynloIcon name="chevron-right" size={22} color={colors.accent}/>
   </Pressable>)
   :<View style={styles.empty}>
    <Text style={styles.gameMeta}>Ainda não tens jogos marcados.</Text>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/(tabs)/explore')} style={styles.primary}>
     <Text style={styles.primaryText}>Encontrar um jogo</Text>
    </Pressable>
   </View>}
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
   {communities.slice(0,6).map(group=><Pressable key={group.id} accessibilityRole="button"
     accessibilityLabel={'Abrir comunidade '+group.name}
     onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(group.id)}})} style={styles.chip}>
     <JynloIcon name="community" size={17} color={colors.accent}/><Text style={styles.chipText} numberOfLines={1}>{group.name}</Text>
    </Pressable>)}
   <Pressable accessibilityRole="button" onPress={()=>router.push('/(tabs)/communities')} style={styles.chip}>
    <Text style={styles.chipText}>{communities.length?'Comunidades':'Encontrar comunidades'}</Text>
   </Pressable>
   <Pressable accessibilityRole="button" onPress={()=>router.push('/(tabs)/tournaments')} style={styles.chip}>
    <JynloIcon name="championship" size={17} color={colors.accent}/><Text style={styles.chipText}>Torneios</Text>
   </Pressable>
  </ScrollView>
 </View>;
}

const styles=StyleSheet.create({
 card:{gap:10,padding:15,borderRadius:MobileTheme.radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,marginBottom:14},
 head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 title:{color:colors.text,fontSize:MobileTheme.typography.title,fontWeight:'900'},
 link:{minHeight:MobileTheme.touchTarget,justifyContent:'center',paddingHorizontal:4},
 linkText:{color:colors.accent,fontSize:13,fontWeight:'800'},
 game:{minHeight:60,flexDirection:'row',alignItems:'center',gap:12,padding:11,borderRadius:MobileTheme.radius.md,backgroundColor:colors.raised},
 gameIcon:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:colors.background},
 gameTitle:{color:colors.text,fontSize:15,fontWeight:'900'},
 gameMeta:{color:colors.muted,fontSize:13},
 empty:{gap:10},
 primary:{minHeight:MobileTheme.touchTarget,borderRadius:MobileTheme.radius.pill,alignItems:'center',justifyContent:'center',backgroundColor:colors.accent},
 primaryText:{color:colors.background,fontSize:14,fontWeight:'900'},
 chips:{gap:8,paddingTop:2},
 chip:{minHeight:40,maxWidth:200,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,borderRadius:MobileTheme.radius.pill,borderWidth:1,borderColor:colors.border,backgroundColor:colors.background},
 chipText:{color:colors.text,fontSize:13,fontWeight:'800',flexShrink:1},
});
