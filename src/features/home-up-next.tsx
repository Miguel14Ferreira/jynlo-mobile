import {FriendsGoing} from '../components/FriendsGoing';
import React,{useCallback,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {useAuth} from '../lib/auth';
import {mySessions} from '../lib/parity-api';
import {myCommunities,searchCommunities} from '../lib/community-api';
import {discoverSessions} from '../lib/api';
import {pickOpenGames,pickCommunitySuggestions} from '../lib/home-suggestions.cjs';
import {organizeMySessions} from '../lib/my-sessions-core.cjs';
import {formatDate} from '../lib/format.cjs';
import {MobileTheme} from '../lib/theme';
import {JynloIcon} from '../components/JynloIcon';
import type {CommunityGroup,CommunitySummary,SessionSummary} from '../lib/types';
import {sportName} from '../lib/sport-names.cjs';
import {communitySummaries} from '../lib/chat-api';
import {communityNews,unreadMap} from '../lib/home-community-news.cjs';

const colors=MobileTheme.colors;
const MAX_GAMES=2;
const MAX_COMMUNITIES=3;

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
 const [unread,setUnread]=useState<Map<string,number>>(new Map());
 const [openGames,setOpenGames]=useState<SessionSummary[]>([]);
 const [suggested,setSuggested]=useState<CommunitySummary[]>([]);
 const generation=useRef(0);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  if(!auth.token||!auth.username){setGames(null);setCommunities([]);setUnread(new Map());return;}
  const token=auth.token,username=auth.username;
  void Promise.allSettled([mySessions(token,username),myCommunities(token,username)]).then(([sessions,groups])=>{
   if(version!==generation.current)return;
   if(sessions.status==='fulfilled'){
    const organized=organizeMySessions(sessions.value) as {upcoming:{items:SessionSummary[]}[]};
    const upcoming=organized.upcoming.flatMap(group=>group.items)
     .sort((a,b)=>Date.parse(a.gameDate)-Date.parse(b.gameDate));
    setGames(upcoming);setFailed(false);
   }else{setGames(null);setFailed(true);}
   const mine=groups.status==='fulfilled'?groups.value:[];
   setCommunities(mine);
   // A new account should not land on an empty home: show open games and public communities to join.
   const myGames=sessions.status==='fulfilled'?(organizeMySessions(sessions.value) as {upcoming:{items:SessionSummary[]}[]}).upcoming.flatMap(g=>g.items):[];
   if(sessions.status==='fulfilled'&&!myGames.length){
    void discoverSessions({availableOnly:true,sort:'date'},token,username).then(list=>{
     if(version===generation.current)setOpenGames(pickOpenGames(list,[],Date.now()) as SessionSummary[]);
    }).catch(()=>{if(version===generation.current)setOpenGames([]);});
   }else setOpenGames([]);
   if(groups.status==='fulfilled'&&!mine.length){
    void searchCommunities('','',0).then(found=>{
     if(version===generation.current)setSuggested(pickCommunitySuggestions(found.communities,[]) as CommunitySummary[]);
    }).catch(()=>{if(version===generation.current)setSuggested([]);});
   }else setSuggested([]);
   // Unread counts are a bonus: without them the row falls back to the next game or members.
   const shown=mine.slice(0,MAX_COMMUNITIES);
   if(!shown.length){setUnread(new Map());return;}
   void communitySummaries(token,username,shown).then(rows=>{
    if(version===generation.current)setUnread(unreadMap(rows));
   }).catch(()=>{if(version===generation.current)setUnread(new Map());});
  });
  return ()=>{generation.current++;};
 },[auth.token,auth.username]));
 if(!auth.token||!auth.username||failed||games===null)return null;
 const next=games.slice(0,MAX_GAMES);
 return <View style={styles.card}>
  <View style={styles.head}>
   <Text style={styles.title}>{t('jogos::A seguir')}</Text>
   <Pressable accessibilityRole="button" onPress={()=>router.push('/my-sessions')} style={styles.link}>
    <Text style={styles.linkText}>{games.length>MAX_GAMES?t('Ver todos ({n})',{n:games.length}):t('Os meus jogos')}</Text>
   </Pressable>
  </View>
  {next.length?next.map(game=><Pressable key={game.id} accessibilityRole="button"
    accessibilityLabel={t('{sport} em {city}, {date}',{sport:sportName(game.sport),city:game.city,date:formatDate(game.gameDate)})}
    onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(game.id)}})} style={styles.game}>
    <View style={styles.gameIcon}><JynloIcon name="session" size={22} color={colors.accent}/></View>
    <View style={{flex:1,gap:2}}>
     <Text style={styles.gameTitle} numberOfLines={1}>{sportName(game.sport)} · {game.city}</Text>
     <Text style={styles.gameMeta} numberOfLines={1}>{t('{a} · {b}/{c} jogadores',{a:formatDate(game.gameDate),b:game.participantCount,c:game.maxParticipants})}</Text>
    </View>
    <JynloIcon name="chevron-right" size={22} color={colors.accent}/>
   </Pressable>)
   :<View style={styles.empty}>
    <Text style={styles.gameMeta}>{t('Ainda não tens jogos marcados.')}</Text>
    {openGames.length?<Text style={styles.subtitle}>{t('Jogos abertos com vagas')}</Text>:null}
    {openGames.map(game=><Pressable key={game.id} accessibilityRole="button"
      accessibilityLabel={t('{sport} em {city}, {date}',{sport:sportName(game.sport),city:game.city,date:formatDate(game.gameDate)})}
      onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(game.id)}})} style={styles.game}>
      <View style={styles.gameIcon}><JynloIcon name="session" size={22} color={colors.accent}/></View>
      <View style={{flex:1,gap:2}}>
       <Text style={styles.gameTitle} numberOfLines={1}>{sportName(game.sport)} · {game.city}</Text>
       <Text style={styles.news} numberOfLines={1}>{t('{a} · faltam {n}',{a:formatDate(game.gameDate),n:Math.max(0,game.maxParticipants-game.participantCount)})}</Text>
       <FriendsGoing sessionId={game.id}/>
      </View>
      <JynloIcon name="chevron-right" size={22} color={colors.accent}/>
     </Pressable>)}
    <Pressable accessibilityRole="button" onPress={()=>router.push('/(tabs)/explore')} style={styles.primary}>
     <Text style={styles.primaryText}>{t('Encontrar um jogo')}</Text>
    </Pressable>
   </View>}
  {communities.length?<View style={styles.communities}>
   <View style={styles.head}>
    <Text style={styles.subtitle}>{t('As tuas comunidades')}</Text>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/communities')} style={styles.link}>
     <Text style={styles.linkText}>{t('Ver todas')}</Text>
    </Pressable>
   </View>
   {communities.slice(0,MAX_COMMUNITIES).map(group=>{
    const news=communityNews(group,unread,games);
    const line=news.kind==='unread'?(news.count===1?t('1 mensagem nova'):t('{n} mensagens novas',{n:news.count}))
     :news.kind==='game'?t('Próximo jogo · {v}',{v:formatDate(news.gameDate)})
     :t('{n} membros',{n:news.count});
    return <Pressable key={group.id} accessibilityRole="button"
     accessibilityLabel={t('Abrir comunidade {v}',{v:group.name})+'. '+line}
     onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(group.id)}})} style={styles.community}>
     <View style={styles.communityAvatar}><Text style={styles.communityInitial}>{(group.name||'?').trim().charAt(0).toUpperCase()}</Text></View>
     <View style={{flex:1,gap:2}}>
      <Text style={styles.gameTitle} numberOfLines={1}>{group.name}</Text>
      <Text style={news.kind==='members'?styles.gameMeta:styles.news} numberOfLines={1}>{line}</Text>
     </View>
     <JynloIcon name="chevron-right" size={22} color={colors.accent}/>
    </Pressable>;
   })}
  </View>:null}
  {!communities.length&&suggested.length?<View style={styles.communities}>
   <View style={styles.head}>
    <Text style={styles.subtitle}>{t('Comunidades para te juntares')}</Text>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/communities')} style={styles.link}>
     <Text style={styles.linkText}>{t('Ver todas')}</Text>
    </Pressable>
   </View>
   {suggested.map(group=><Pressable key={group.id} accessibilityRole="button"
     accessibilityLabel={t('Abrir comunidade {v}',{v:group.name})}
     onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(group.id)}})} style={styles.community}>
     <View style={styles.communityAvatar}><Text style={styles.communityInitial}>{(group.name||'?').trim().charAt(0).toUpperCase()}</Text></View>
     <View style={{flex:1,gap:2}}>
      <Text style={styles.gameTitle} numberOfLines={1}>{group.name}</Text>
      {group.sport?<Text style={styles.gameMeta} numberOfLines={1}>{sportName(group.sport)}</Text>:null}
     </View>
     <JynloIcon name="chevron-right" size={22} color={colors.accent}/>
    </Pressable>)}
  </View>:null}
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
   {communities.length?null:<Pressable accessibilityRole="button" onPress={()=>router.push('/communities')} style={styles.chip}>
    <JynloIcon name="community" size={17} color={colors.accent}/><Text style={styles.chipText}>{t('Encontrar comunidades')}</Text>
   </Pressable>}
   <Pressable accessibilityRole="button" onPress={()=>router.push('/tournaments')} style={styles.chip}>
    <JynloIcon name="championship" size={17} color={colors.accent}/><Text style={styles.chipText}>{t('Torneios')}</Text>
   </Pressable>
  </ScrollView>
 </View>;
}

const styles=StyleSheet.create({
 card:{gap:10,padding:15,borderRadius:MobileTheme.radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,marginBottom:14},
 head:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:10},
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
 communities:{gap:8},
 subtitle:{color:colors.text,fontSize:15,fontWeight:'900'},
 community:{minHeight:56,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:8,paddingHorizontal:11,borderRadius:MobileTheme.radius.md,backgroundColor:colors.raised},
 communityAvatar:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:colors.background,borderWidth:1,borderColor:colors.border},
 communityInitial:{color:colors.accent,fontSize:15,fontWeight:'900'},
 news:{color:colors.accent,fontSize:13,fontWeight:'700'},
 chips:{gap:8,paddingTop:2},
 chip:{minHeight:40,maxWidth:200,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,borderRadius:MobileTheme.radius.pill,borderWidth:1,borderColor:colors.border,backgroundColor:colors.background},
 chipText:{color:colors.text,fontSize:13,fontWeight:'800',flexShrink:1},
});
