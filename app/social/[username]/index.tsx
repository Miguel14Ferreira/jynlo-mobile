import React,{useCallback,useRef,useState} from 'react';
import {t} from '../../../src/lib/i18n';
import {Alert,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../../src/components/UI';
import PostImageLightbox,{type ExpandedPostPhotos} from '../../../src/components/PostImageLightbox';
import {useAuth} from '../../../src/lib/auth';
import {profileStories,resolveJynloMedia} from '../../../src/lib/social-feed-api';
import type {SocialStory} from '../../../src/lib/types';
import {reliabilitySummary} from '../../../src/lib/reliability-api';
import ProfilePosts from '../../../src/components/ProfilePosts';
import {changeFollow,followStatus,publicSportsProfile,publicProfileAffiliations,publicSportsActivity,publicIndividualTitles,publicCompletedParticipations,type PublicCompletedParticipation,type PublicIndividualTitle,type PublicSportsActivity,type PublicProfileAffiliations,type FollowStatus,type PublicSportsProfile} from '../../../src/lib/social-relations-api';
import {PlayerStatsRow} from '../../../src/components/PlayerHighlights';
import {ProfileMessageAction} from '../../../src/components/ProfileMessageAction';
import {parseFavoriteSports} from '../../../src/lib/favorite-sports.cjs';
import {profilePrivacyStatus,type ProfilePrivacyStatus} from '../../../src/lib/profile-privacy-api';
import {MobileTheme} from '../../../src/lib/theme';
import {ReportSheet} from '../../../src/components/ReportSheet';
import {blockUser,reportUser,unblockUser,userBlockStatus} from '../../../src/lib/user-safety-api';
import {sportName} from '../../../src/lib/sport-names.cjs';
const T=MobileTheme.colors;
export default function PublicSocialProfile(){
 const [zoomPhoto,setZoomPhoto]=useState<ExpandedPostPhotos|null>(null);
 const {username}=useLocalSearchParams<{username:string}>();
 const name=typeof username==='string'&&/^[a-zA-Z0-9_.@-]{1,128}$/.test(username)?username:'';
 const auth=useAuth(),router=useRouter();
 const [profile,setProfile]=useState<PublicSportsProfile|null>(null);
 const [status,setStatus]=useState<FollowStatus|null>(null);
 const [privacy,setPrivacy]=useState<ProfilePrivacyStatus|null>(null);
 const [stories,setStories]=useState<SocialStory[]>([]);
 // Attendance: shown once there are enough finished games to mean something.
 const [attendance,setAttendance]=useState<{rate:number;games:number}|null>(null);
 const [affiliations,setAffiliations]=useState<PublicProfileAffiliations|null>(null);
 const [activity,setActivity]=useState<PublicSportsActivity|null>(null);
 const [titles,setTitles]=useState<PublicIndividualTitle[]>([]);
 const [participations,setParticipations]=useState<PublicCompletedParticipation[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [blocked,setBlocked]=useState<boolean|null>(null),[safetyBusy,setSafetyBusy]=useState(false),[reporting,setReporting]=useState(false);
 const version=useRef(0),inFlight=useRef(false);
 const own=!!name&&name.toLowerCase()===auth.username?.toLowerCase();
 useFocusEffect(useCallback(()=>{
  const request=++version.current;setProfile(null);setStatus(null);setPrivacy(null);setStories([]);setAttendance(null);setAffiliations(null);setActivity(null);setTitles([]);setParticipations([]);setError('');setLoading(true);inFlight.current=false;setBusy(false);
  setBlocked(null);setReporting(false);
  if(!name||!auth.token){setLoading(false);return()=>{version.current++;};}
  if(!own)void userBlockStatus(name,auth.token).then(value=>{if(version.current===request)setBlocked(value);}).catch(()=>{});
  // The public identity is the critical path. Followers and private-content
  // permissions update separately so a slow endpoint cannot freeze the hero.
  void publicSportsProfile(name,auth.token).then(value=>{
   if(request===version.current)setProfile(value);
  }).catch(()=>{
   if(request===version.current)setError(t('Não foi possível carregar este perfil.'));
  }).finally(()=>{if(request===version.current)setLoading(false);});
  void followStatus(name,auth.token).then(value=>{
   if(request===version.current)setStatus(value);
  }).catch(()=>{/* Keep follow controls hidden until status is verified. */});
  void profilePrivacyStatus(auth.token,name).then(value=>{
   if(request!==version.current)return;
   setPrivacy(value);
   if(value.canViewContent)void profileStories(name,auth.token).then(list=>{
    if(request===version.current)setStories(list.filter(story=>Date.parse(story.expiresAt)>Date.now()));
   }).catch(()=>{if(request===version.current)setStories([]);});
   if(value.canViewContent)void reliabilitySummary(name,auth.token).then(summary=>{
    if(request===version.current&&summary&&Number.isFinite(summary.attendanceRate))
     setAttendance({rate:summary.attendanceRate,games:summary.completedSessions});
   }).catch(()=>{if(request===version.current)setAttendance(null);});
   if(value.canViewContent)void publicSportsActivity(name,auth.token).then(activityValue=>{
    if(request===version.current)setActivity(activityValue);
   }).catch(()=>{/* No inferred achievements when stats are unavailable. */});
  }).catch(()=>{/* Fail closed: do not reveal private posts or stats. */});
  void publicCompletedParticipations(name,auth.token).then(value=>{
   if(request===version.current&&Array.isArray(value))
    setParticipations(value.filter(t=>Number.isSafeInteger(t.tournamentId)&&t.tournamentId>0&&
     Number.isSafeInteger(t.communityId)&&t.communityId>0));
  }).catch(()=>{/* Missing final participation proof must not be guessed. */});
  void publicIndividualTitles(name,auth.token).then(value=>{
   if(request===version.current&&Array.isArray(value))
    setTitles(value.filter(t=>Number.isSafeInteger(t.tournamentId)&&t.tournamentId>0&&
     Number.isSafeInteger(t.communityId)&&t.communityId>0));
  }).catch(()=>{/* Missing proof must never imply a trophy. */});
  if(!own)void publicProfileAffiliations(name,auth.token).then(value=>{
   if(request===version.current)setAffiliations({
    teams:(value.teams||[]).filter(t=>Number.isSafeInteger(t.id)&&t.id>0),
    communities:(value.communities||[]).filter(g=>Number.isSafeInteger(g.id)&&g.id>0)
   });
  }).catch(()=>{/* No fallback to /joined or /mine: fail closed. */});
  return()=>{version.current++;setProfile(null);setStatus(null);setPrivacy(null);setAffiliations(null);setActivity(null);setTitles([]);setParticipations([]);};
 },[name,auth.token,auth.username]));
 async function toggle(){
  if(!name||own||!auth.token||!status||inFlight.current)return;
  const request=version.current,original=status.followedByMe;
  const shouldFollow=!(original || status.requestPending);
  inFlight.current=true;setBusy(true);setError('');
  try{
   const next=await changeFollow(name,shouldFollow,auth.token);
   if(request===version.current)setStatus(next);
  }catch{
   if(request===version.current)setError(t('Não foi possível confirmar a alteração. Verifica o estado antes de repetir.'));
  }finally{if(request===version.current){inFlight.current=false;setBusy(false);}}
 }
 if(!name)return <Page><Message tone="error">{t('Utilizador inválido.')}</Message></Page>;
 const displayName=profile?.nickname?.trim()||profile?.fullName?.trim()||name;
 const image=resolveJynloMedia(profile?.profilePicUrl);
 const sports=parseFavoriteSports(profile?.favoriteSports).slice(0,8);
 function toggleBlock(){
  if(!name||!auth.token||safetyBusy||blocked===null)return;
  const token=auth.token,wasBlocked=blocked,request=version.current;
  const run=async()=>{
   setSafetyBusy(true);
   try{const value=wasBlocked?await unblockUser(name,token):await blockUser(name,token);if(version.current===request)setBlocked(value);}
   catch(e){Alert.alert(t('Não foi possível concluir'),e instanceof Error?e.message:t('Tenta novamente.'));}
   finally{if(version.current===request)setSafetyBusy(false);}
  };
  if(wasBlocked){void run();return;}
  Alert.alert(t('Bloquear @{v}',{v:name})+'?',t('Deixas de ver o conteúdo desta pessoa e ela deixa de te poder contactar. Podes desbloquear aqui.'),[
   {text:t('Cancelar'),style:'cancel'},{text:t('Bloquear'),style:'destructive',onPress:()=>{void run();}}
  ]);
 }
 return <Page>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {!auth.token?<Button title={t('Entrar para ver este perfil')} onPress={()=>router.push('/login')}/>:null}
  {profile?<View style={styles.hero}>
   <View style={styles.identity}>
    <Pressable accessibilityRole="button" disabled={!stories.length&&!image}
     accessibilityLabel={stories.length?t('Ver stories de {v}',{v:name}):image?t('Ampliar fotografia'):t('Sem stories ativas')}
     onPress={()=>{const first=stories[0];if(first)router.push({pathname:'/(tabs)',params:{storyId:String(first.id)}});else if(image)setZoomPhoto({uris:[image],index:0});}}
     style={[styles.storyRing,stories.length>0&&styles.storyRingActive]}>
     <View style={styles.avatar}>{image?<Image source={{uri:image}} style={styles.photo}/>:<Text maxFontSizeMultiplier={1.3} style={styles.letter}>{name.charAt(0).toUpperCase()}</Text>}</View>
    </Pressable>
    <PostImageLightbox photos={zoomPhoto} onClose={()=>setZoomPhoto(null)}/>
    <View style={{flex:1,gap:5}}><Text style={styles.name}>{displayName}</Text><Text style={styles.handle}>@{name}</Text></View>
   </View>
   {profile.bio?.trim()?<Text style={styles.bio}>{profile.bio.trim()}</Text>:null}
   {[profile.location,profile.country].filter(Boolean).length?<Text style={styles.sub}>⌖  {[profile.location,profile.country].filter(Boolean).join(' · ')}</Text>:null}
   {sports.length?<View style={styles.tags}>{sports.map(s=><View key={s} style={styles.tag}><Text style={styles.tagLabel}>{sportName(s)}</Text></View>)}</View>:null}
   {status?<View style={styles.metrics}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Ver seguidores')} onPress={()=>router.push({pathname:'/social/[username]/[kind]',params:{username:name,kind:'followers'}})} style={styles.metric}>
     <Text style={styles.metricNum}>{status.followers}</Text><Text style={styles.sub}>{t('Seguidores')}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Ver pessoas seguidas')} onPress={()=>router.push({pathname:'/social/[username]/[kind]',params:{username:name,kind:'following'}})} style={styles.metric}>
     <Text style={styles.metricNum}>{status.following}</Text><Text style={styles.sub}>{t('A seguir')}</Text>
    </Pressable>
   </View>:null}
   {!own&&status?<Pressable accessibilityRole="button"
    accessibilityLabel={status.followedByMe?t('Deixar de seguir'):status.requestPending?t('Cancelar pedido para seguir'):status.privateProfile?t('Pedir para seguir'):t('Seguir utilizador')}
    disabled={busy} onPress={()=>{void toggle();}} style={[styles.follow,(status.followedByMe||status.requestPending)&&styles.unfollow,busy&&styles.disabled]}>
    <Text style={[styles.followText,(status.followedByMe||status.requestPending)&&styles.unfollowText]}>
     {busy?t('A confirmar…'):status.followedByMe?t('A seguir ✓'):status.requestPending?t('Pedido enviado ✓'):status.privateProfile?t('Pedir para seguir +'):t('Seguir +')}
    </Text>
   </Pressable>:!own?<Text style={styles.sub}>{t('Não foi possível confirmar a relação de seguimento.')}</Text>:null}
   <PlayerStatsRow username={name} token={auth.token}/>
   {!own&&auth.token?<ProfileMessageAction username={name} token={auth.token}/>:null}
   {!own&&auth.token?<View style={styles.safetyRow}>
    <Pressable accessibilityRole="button" disabled={safetyBusy||blocked===null} onPress={toggleBlock}
     accessibilityLabel={blocked?t('Desbloquear @{v}',{v:name}):t('Bloquear @{v}',{v:name})} style={[styles.safetyAction,(safetyBusy||blocked===null)&&styles.disabled]}>
     <Text style={styles.safetyText}>{safetyBusy?t('A confirmar…'):blocked?t('Desbloquear'):t('Bloquear')}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Denunciar perfil de @{v}',{v:name})} onPress={()=>setReporting(true)} style={styles.safetyAction}>
     <Text style={styles.safetyText}>{t('Denunciar')}</Text>
    </Pressable>
   </View>:null}
  </View>:null}
  {privacy?.privateProfile&&!privacy.canViewContent?<View style={styles.hero}>
    <Text style={styles.name}>{t('Perfil privado')}</Text>
    <Text style={styles.sub}>{t('Segue esta pessoa e aguarda a aprovação para veres as suas publicações e stories.')}</Text>
   </View>:null}
  {profile&&participations.length>0?<View style={styles.discovery}>
   <Text style={styles.discoveryTitle}>{t('Competições individuais concluídas')}</Text>
   <Text style={styles.discoveryHint}>{t('Participação confirmada em torneios públicos finalizados. Sem classificações presumidas.')}</Text>
   {participations.map(entry=><Pressable key={'competition-'+entry.tournamentId}
     accessibilityRole="button"
     accessibilityLabel={t('Ver competição {v}',{v:entry.tournamentName})}
     style={styles.competitionRow}
     onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(entry.communityId)}})}>
     <View style={styles.competitionBody}>
      <Text style={styles.titleName}>{entry.tournamentName}</Text>
      <Text style={styles.discoveryHint}>{entry.communityName}{entry.sport?' · '+sportName(entry.sport):''}</Text>
     </View>
     <View style={styles.competitionResult}>
      <Text style={styles.competitionStatus}>{entry.individualChampion?t('🏆 Campeão individual'):t('Participação confirmada')}</Text>
      {entry.wins!=null&&entry.draws!=null&&entry.losses!=null?<Text style={styles.competitionStatus}>{entry.wins}V · {entry.draws}E · {entry.losses}D</Text>:null}
      <Text style={styles.discoveryHint}>{entry.completedAt?.slice(0,7)||''}</Text>
     </View>
   </Pressable>)}
  </View>:null}
  {profile&&titles.length>0?<View style={styles.discovery}>
   <Text style={styles.discoveryTitle}>{t('Títulos individuais oficiais')}</Text>
   <Text style={styles.discoveryHint}>{t('Vitórias confirmadas em torneios concluídos de comunidades públicas.')}</Text>
   {titles.map(title=><Pressable key={title.tournamentId}
     accessibilityRole="button" accessibilityLabel={t('Ver torneio {v}',{v:title.tournamentName})}
     style={styles.titleCard}
     onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(title.communityId)}})}>
     <Text style={styles.titleIcon}>🏆</Text>
     <Text style={styles.titleName}>{title.tournamentName}</Text>
     <Text style={styles.discoveryHint}>{title.communityName}{title.sport?' · '+sportName(title.sport):''}</Text>
     <Text style={styles.discoveryHint}>{title.completedAt.slice(0,7)}</Text>
   </Pressable>)}
  </View>:null}
  {profile&&privacy?.canViewContent&&activity?<View style={styles.discovery}>
   <Text style={styles.discoveryTitle}>{t('Histórico desportivo')}</Text>
   <Text style={styles.discoveryHint}>{t('Estatísticas calculadas pela Jynlo.')}</Text>
   <View style={styles.activityGrid}>
    {([
     ...(attendance&&attendance.games>=3?[[Math.round(attendance.rate)+'%',t('Presença nos jogos')] as const]:[]),
     [activity.activitiesCompleted,t('Atividades')],
     [activity.peoplePlayedWith,t('Pessoas com quem jogou')],
     [activity.sportsPractised,t('Modalidades')],
     [activity.eventsCreated,t('Eventos organizados')],
     [activity.participantsMobilized,t('Participantes mobilizados')],
     [activity.communitiesJoined,t('Comunidades')]
    ] as const).map(([count,label])=><View key={label} style={styles.activityCard}>
     <Text style={styles.activityNumber}>{typeof count==='string'?count:Math.max(0,Number(count)||0)}</Text>
     <Text style={styles.activityLabel}>{label}</Text>
    </View>)}
   </View>
  </View>:null}
  {profile&&affiliations&&(affiliations.teams.length>0||affiliations.communities.length>0)?
   <View style={styles.discovery}>
    <Text style={styles.discoveryTitle}>{t('Equipas e comunidades públicas')}</Text>
    <Text style={styles.discoveryHint}>{t('Associações confirmadas e visíveis publicamente.')}</Text>
    {affiliations.teams.map(team=><Pressable key={'team-'+team.id}
     accessibilityRole="button" accessibilityLabel={t('Abrir equipa {v}',{v:team.name})}
     style={styles.discoveryLink} onPress={()=>router.push({pathname:'/teams/[id]',params:{id:String(team.id)}})}>
     <Text style={styles.discoveryLinkText}>{team.name}</Text>
     <Text style={styles.discoveryHint}>{sportName(team.sport)||t('Equipa desportiva')}</Text>
    </Pressable>)}
    {affiliations.communities.map(group=><Pressable key={'community-'+group.id}
     accessibilityRole="button" accessibilityLabel={t('Abrir comunidade {v}',{v:group.name})}
     style={styles.discoveryLink} onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(group.id)}})}>
     <Text style={styles.discoveryLinkText}>{group.name}</Text>
     <Text style={styles.discoveryHint}>{sportName(group.sport)||t('Comunidade desportiva')}</Text>
    </Pressable>)}
   </View>:null}
  {profile?<View style={styles.discovery}>
   <Text style={styles.discoveryTitle}>{t('Continuar a descobrir')}</Text>
   <Text style={styles.discoveryHint}>{t('Encontra sessões, equipas e comunidades na Jynlo.')}</Text>
   <View style={styles.discoveryLinks}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Procurar sessões desportivas')}
     style={styles.discoveryLink} onPress={()=>router.push('/explore')}>
     <Text style={styles.discoveryLinkText}>{t('⌖  Procurar sessões')}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Explorar equipas')}
     style={styles.discoveryLink} onPress={()=>router.push('/teams')}>
     <Text style={styles.discoveryLinkText}>{t('♜  Explorar equipas')}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Explorar comunidades')}
     style={styles.discoveryLink} onPress={()=>router.push('/communities')}>
     <Text style={styles.discoveryLinkText}>{t('♧  Explorar comunidades')}</Text>
    </Pressable>
   </View>
  </View>:null}
  {profile&&privacy?.canViewContent?<ProfilePosts username={name} token={auth.token}/>:null}
   <ReportSheet visible={reporting&&!!name} title={t('Denunciar perfil')} subject={t('Perfil de @{v}',{v:(name||'')})}
   onClose={()=>setReporting(false)}
   onSubmit={async reason=>{if(!name||!auth.token)return;await reportUser(name,reason,auth.token);}}/>
 </Page>;
}
const styles=StyleSheet.create({
 safetyRow:{flexDirection:'row',gap:10,flexWrap:'wrap'},
 safetyAction:{minHeight:40,paddingHorizontal:14,justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:'#7A3A3F',backgroundColor:'#2A161A'},
 safetyText:{color:'#FFB8B8',fontWeight:'800',fontSize:13},
 discovery:{padding:16,gap:8,borderWidth:1,borderColor:T.border,backgroundColor:T.surface,borderRadius:MobileTheme.radius.xl},
 activityGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},
 activityCard:{width:'47%',minWidth:120,flexGrow:1,minHeight:83,justifyContent:'center',gap:5,padding:12,borderWidth:1,borderColor:T.border,borderRadius:12,backgroundColor:T.raised},
 activityNumber:{color:T.accent,fontSize:23,fontWeight:'900'},
 activityLabel:{color:T.muted,fontSize:12,fontWeight:'700'},
 achievementSection:{gap:9,marginTop:9},
 showAchievements:{minHeight:44,justifyContent:'center',alignSelf:'flex-start',paddingHorizontal:4},
 showAchievementsText:{color:T.accent,fontSize:13,fontWeight:'800'},
 achievementList:{flexDirection:'row',flexWrap:'wrap',gap:8},
 achievementBadge:{borderWidth:1,borderColor:T.border,borderRadius:10,backgroundColor:T.raised,paddingHorizontal:10,paddingVertical:8},
 achievementLabel:{color:T.text,fontSize:12,fontWeight:'800'},
 discoveryTitle:{fontSize:16,fontWeight:'900',color:T.text},
 titleCard:{gap:5,padding:14,borderWidth:1,borderColor:T.border,borderRadius:12,backgroundColor:T.raised,minHeight:105},
 titleIcon:{fontSize:23},titleName:{fontSize:15,fontWeight:'900',color:T.text},
 competitionRow:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:10,padding:13,minHeight:75,borderRadius:12,borderWidth:1,borderColor:T.border,backgroundColor:T.raised},
 competitionBody:{flexGrow:1,flexShrink:1,minWidth:135,gap:5},
 competitionResult:{flexGrow:0,alignItems:'flex-start',gap:5},
 competitionStatus:{fontSize:12,fontWeight:'800',color:T.accent},
 discoveryHint:{fontSize:12,lineHeight:18,color:T.muted},
 discoveryLinks:{gap:8,marginTop:3},
 discoveryLink:{minHeight:48,justifyContent:'center',paddingHorizontal:14,backgroundColor:T.raised,borderRadius:12,borderWidth:1,borderColor:T.border},
 discoveryLinkText:{fontSize:14,fontWeight:'800',color:T.accent},
 hero:{padding:18,gap:17,borderWidth:1,borderColor:T.border,backgroundColor:T.surface,borderRadius:MobileTheme.radius.xl},
 identity:{flexDirection:'row',alignItems:'center',gap:14},storyRing:{padding:3,borderRadius:42,borderWidth:2,borderColor:'transparent'},storyRingActive:{borderColor:T.accent},avatar:{height:72,width:72,borderRadius:36,backgroundColor:T.raised,alignItems:'center',justifyContent:'center',overflow:'hidden'},
 photo:{width:'100%',height:'100%'},letter:{fontSize:27,fontWeight:'900',color:T.accent},
 name:{fontSize:22,fontWeight:'900',color:T.text},handle:{color:T.accent,fontSize:13},bio:{fontSize:14,lineHeight:21,color:T.text},sub:{fontSize:12,color:T.muted},
 tags:{flexDirection:'row',flexWrap:'wrap',gap:8},tag:{paddingHorizontal:11,paddingVertical:8,backgroundColor:T.raised,borderRadius:MobileTheme.radius.pill},tagLabel:{color:T.accent,fontWeight:'800',fontSize:12},
 metrics:{flexDirection:'row',gap:10},metric:{flex:1,alignItems:'center',minHeight:60,justifyContent:'center',backgroundColor:T.raised,borderRadius:MobileTheme.radius.md},
 metricNum:{color:T.text,fontSize:19,fontWeight:'900'},follow:{minHeight:MobileTheme.touchTarget,backgroundColor:T.accent,borderRadius:MobileTheme.radius.md,alignItems:'center',justifyContent:'center'},
 followText:{color:T.background,fontSize:14,fontWeight:'900'},unfollow:{backgroundColor:T.raised,borderWidth:1,borderColor:T.border},unfollowText:{color:T.text},disabled:{opacity:.5}
});
