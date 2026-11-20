import React,{useCallback,useRef,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {resolveJynloMedia} from '../../../src/lib/social-feed-api';
import ProfilePosts from '../../../src/components/ProfilePosts';
import {changeFollow,followStatus,publicSportsProfile,publicProfileAffiliations,publicSportsActivity,type PublicSportsActivity,type PublicProfileAffiliations,type FollowStatus,type PublicSportsProfile} from '../../../src/lib/social-relations-api';
import {parseFavoriteSports} from '../../../src/lib/favorite-sports.cjs';
import {profilePrivacyStatus,type ProfilePrivacyStatus} from '../../../src/lib/profile-privacy-api';
import {MobileTheme} from '../../../src/lib/theme';
const T=MobileTheme.colors;
const achievementLabels:Record<string,string>={
 FIRST_ACTIVITY:'🏅 Primeira atividade',
 TEN_ACTIVITIES:'🔥 10 atividades',
 EXPLORER:'🌍 Explorador',
 ORGANIZER:'👥 Organizador',
 COMMUNITY_BUILDER:'🤝 Criador de comunidades',
 REGULAR:'📅 Regular'
};
export default function PublicSocialProfile(){
 const {username}=useLocalSearchParams<{username:string}>();
 const name=typeof username==='string'&&/^[a-zA-Z0-9_.@-]{1,128}$/.test(username)?username:'';
 const auth=useAuth(),router=useRouter();
 const [profile,setProfile]=useState<PublicSportsProfile|null>(null);
 const [status,setStatus]=useState<FollowStatus|null>(null);
 const [privacy,setPrivacy]=useState<ProfilePrivacyStatus|null>(null);
 const [affiliations,setAffiliations]=useState<PublicProfileAffiliations|null>(null);
 const [activity,setActivity]=useState<PublicSportsActivity|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const version=useRef(0),inFlight=useRef(false);
 const own=!!name&&name.toLowerCase()===auth.username?.toLowerCase();
 useFocusEffect(useCallback(()=>{
  const request=++version.current;setProfile(null);setStatus(null);setPrivacy(null);setAffiliations(null);setActivity(null);setError('');setLoading(true);inFlight.current=false;setBusy(false);
  if(!name||!auth.token){setLoading(false);return()=>{version.current++;};}
  // The public identity is the critical path. Followers and private-content
  // permissions update separately so a slow endpoint cannot freeze the hero.
  void publicSportsProfile(name,auth.token).then(value=>{
   if(request===version.current)setProfile(value);
  }).catch(()=>{
   if(request===version.current)setError('Não foi possível carregar este perfil.');
  }).finally(()=>{if(request===version.current)setLoading(false);});
  void followStatus(name,auth.token).then(value=>{
   if(request===version.current)setStatus(value);
  }).catch(()=>{/* Keep follow controls hidden until status is verified. */});
  void profilePrivacyStatus(auth.token,name).then(value=>{
   if(request!==version.current)return;
   setPrivacy(value);
   if(value.canViewContent)void publicSportsActivity(name,auth.token).then(activityValue=>{
    if(request===version.current)setActivity(activityValue);
   }).catch(()=>{/* No inferred achievements when stats are unavailable. */});
  }).catch(()=>{/* Fail closed: do not reveal private posts or stats. */});
  if(!own)void publicProfileAffiliations(name,auth.token).then(value=>{
   if(request===version.current)setAffiliations({
    teams:(value.teams||[]).filter(t=>Number.isSafeInteger(t.id)&&t.id>0),
    communities:(value.communities||[]).filter(g=>Number.isSafeInteger(g.id)&&g.id>0)
   });
  }).catch(()=>{/* No fallback to /joined or /mine: fail closed. */});
  return()=>{version.current++;setProfile(null);setStatus(null);setPrivacy(null);setAffiliations(null);setActivity(null);};
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
   if(request===version.current)setError('Não foi possível confirmar a alteração. Verifica o estado antes de repetir.');
  }finally{if(request===version.current){inFlight.current=false;setBusy(false);}}
 }
 if(!name)return <Page><Message tone="error">Utilizador inválido.</Message></Page>;
 const displayName=profile?.nickname?.trim()||profile?.fullName?.trim()||name;
 const image=resolveJynloMedia(profile?.profilePicUrl);
 const sports=parseFavoriteSports(profile?.favoriteSports).slice(0,8);
 return <Page>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {!auth.token?<Button title="Entrar para ver este perfil" onPress={()=>router.push('/login')}/>:null}
  {profile?<View style={styles.hero}>
   <View style={styles.identity}>
    <View style={styles.avatar}>{image?<Image source={{uri:image}} style={styles.photo}/>:<Text style={styles.letter}>{name.charAt(0).toUpperCase()}</Text>}</View>
    <View style={{flex:1,gap:5}}><Text style={styles.name}>{displayName}</Text><Text style={styles.handle}>@{name}</Text></View>
   </View>
   {profile.bio?.trim()?<Text style={styles.bio}>{profile.bio.trim()}</Text>:null}
   {[profile.location,profile.country].filter(Boolean).length?<Text style={styles.sub}>⌖  {[profile.location,profile.country].filter(Boolean).join(' · ')}</Text>:null}
   {sports.length?<View style={styles.tags}>{sports.map(s=><View key={s} style={styles.tag}><Text style={styles.tagLabel}>{s}</Text></View>)}</View>:null}
   {status?<View style={styles.metrics}>
    <Pressable accessibilityRole="button" accessibilityLabel="Ver seguidores" onPress={()=>router.push({pathname:'/social/[username]/[kind]',params:{username:name,kind:'followers'}})} style={styles.metric}>
     <Text style={styles.metricNum}>{status.followers}</Text><Text style={styles.sub}>Seguidores</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Ver pessoas seguidas" onPress={()=>router.push({pathname:'/social/[username]/[kind]',params:{username:name,kind:'following'}})} style={styles.metric}>
     <Text style={styles.metricNum}>{status.following}</Text><Text style={styles.sub}>A seguir</Text>
    </Pressable>
   </View>:null}
   {!own&&status?<Pressable accessibilityRole="button"
    accessibilityLabel={status.followedByMe?'Deixar de seguir':status.requestPending?'Cancelar pedido para seguir':status.privateProfile?'Pedir para seguir':'Seguir utilizador'}
    disabled={busy} onPress={()=>{void toggle();}} style={[styles.follow,(status.followedByMe||status.requestPending)&&styles.unfollow,busy&&styles.disabled]}>
    <Text style={[styles.followText,(status.followedByMe||status.requestPending)&&styles.unfollowText]}>
     {busy?'A confirmar…':status.followedByMe?'A seguir ✓':status.requestPending?'Pedido enviado ✓':status.privateProfile?'Pedir para seguir +':'Seguir +'}
    </Text>
   </Pressable>:!own?<Text style={styles.sub}>Não foi possível confirmar a relação de seguimento.</Text>:null}
  </View>:null}
  {privacy?.privateProfile&&!privacy.canViewContent?<View style={styles.hero}>
    <Text style={styles.name}>Perfil privado</Text>
    <Text style={styles.sub}>Segue esta pessoa e aguarda a aprovação para veres as suas publicações e stories.</Text>
   </View>:null}
  {profile&&privacy?.canViewContent&&activity?<View style={styles.discovery}>
   <Text style={styles.discoveryTitle}>Histórico desportivo</Text>
   <Text style={styles.discoveryHint}>Estatísticas calculadas pela Jynlo.</Text>
   <View style={styles.activityGrid}>
    {([
     [activity.activitiesCompleted,'Atividades'],
     [activity.peoplePlayedWith,'Pessoas com quem jogou'],
     [activity.sportsPractised,'Modalidades'],
     [activity.eventsCreated,'Eventos organizados'],
     [activity.participantsMobilized,'Participantes mobilizados'],
     [activity.communitiesJoined,'Comunidades']
    ] as const).map(([count,label])=><View key={label} style={styles.activityCard}>
     <Text style={styles.activityNumber}>{Math.max(0,Number(count)||0)}</Text>
     <Text style={styles.activityLabel}>{label}</Text>
    </View>)}
   </View>
   {activity.achievements?.length>0?<View style={styles.achievementSection}>
    <Text style={styles.discoveryTitle}>Conquistas</Text>
    <View style={styles.achievementList}>
     {activity.achievements.filter(code=>Object.prototype.hasOwnProperty.call(achievementLabels,code)).map(code=>
      <View key={code} style={styles.achievementBadge}>
       <Text style={styles.achievementLabel}>{achievementLabels[code]}</Text>
      </View>)}
    </View>
   </View>:null}
  </View>:null}
  {profile&&affiliations&&(affiliations.teams.length>0||affiliations.communities.length>0)?
   <View style={styles.discovery}>
    <Text style={styles.discoveryTitle}>Equipas e comunidades públicas</Text>
    <Text style={styles.discoveryHint}>Associações confirmadas e visíveis publicamente.</Text>
    {affiliations.teams.map(team=><Pressable key={'team-'+team.id}
     accessibilityRole="button" accessibilityLabel={'Abrir equipa '+team.name}
     style={styles.discoveryLink} onPress={()=>router.push({pathname:'/teams/[id]',params:{id:String(team.id)}})}>
     <Text style={styles.discoveryLinkText}>{team.name}</Text>
     <Text style={styles.discoveryHint}>{team.sport||'Equipa desportiva'}</Text>
    </Pressable>)}
    {affiliations.communities.map(group=><Pressable key={'community-'+group.id}
     accessibilityRole="button" accessibilityLabel={'Abrir comunidade '+group.name}
     style={styles.discoveryLink} onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(group.id)}})}>
     <Text style={styles.discoveryLinkText}>{group.name}</Text>
     <Text style={styles.discoveryHint}>{group.sport||'Comunidade desportiva'}</Text>
    </Pressable>)}
   </View>:null}
  {profile?<View style={styles.discovery}>
   <Text style={styles.discoveryTitle}>Continuar a descobrir</Text>
   <Text style={styles.discoveryHint}>Encontra sessões, equipas e comunidades na Jynlo.</Text>
   <View style={styles.discoveryLinks}>
    <Pressable accessibilityRole="button" accessibilityLabel="Procurar sessões desportivas"
     style={styles.discoveryLink} onPress={()=>router.push('/explore')}>
     <Text style={styles.discoveryLinkText}>⌖  Procurar sessões</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Explorar equipas"
     style={styles.discoveryLink} onPress={()=>router.push('/teams')}>
     <Text style={styles.discoveryLinkText}>♜  Explorar equipas</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Explorar comunidades"
     style={styles.discoveryLink} onPress={()=>router.push('/communities')}>
     <Text style={styles.discoveryLinkText}>♧  Explorar comunidades</Text>
    </Pressable>
   </View>
  </View>:null}
  {profile&&privacy?.canViewContent?<ProfilePosts username={name} token={auth.token}/>:null}
 </Page>;
}
const styles=StyleSheet.create({
 discovery:{padding:16,gap:8,borderWidth:1,borderColor:T.border,backgroundColor:T.surface,borderRadius:MobileTheme.radius.xl},
 activityGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},
 activityCard:{width:'47%',minWidth:120,flexGrow:1,minHeight:83,justifyContent:'center',gap:5,padding:12,borderWidth:1,borderColor:T.border,borderRadius:12,backgroundColor:T.raised},
 activityNumber:{color:T.accent,fontSize:23,fontWeight:'900'},
 activityLabel:{color:T.muted,fontSize:12,fontWeight:'700'},
 achievementSection:{gap:9,marginTop:9},
 achievementList:{flexDirection:'row',flexWrap:'wrap',gap:8},
 achievementBadge:{borderWidth:1,borderColor:T.border,borderRadius:10,backgroundColor:T.raised,paddingHorizontal:10,paddingVertical:8},
 achievementLabel:{color:T.text,fontSize:12,fontWeight:'800'},
 discoveryTitle:{fontSize:16,fontWeight:'900',color:T.text},
 discoveryHint:{fontSize:12,lineHeight:18,color:T.muted},
 discoveryLinks:{gap:8,marginTop:3},
 discoveryLink:{minHeight:48,justifyContent:'center',paddingHorizontal:14,backgroundColor:T.raised,borderRadius:12,borderWidth:1,borderColor:T.border},
 discoveryLinkText:{fontSize:14,fontWeight:'800',color:T.accent},
 hero:{padding:18,gap:17,borderWidth:1,borderColor:T.border,backgroundColor:T.surface,borderRadius:MobileTheme.radius.xl},
 identity:{flexDirection:'row',alignItems:'center',gap:14},avatar:{height:72,width:72,borderRadius:36,backgroundColor:T.raised,alignItems:'center',justifyContent:'center',overflow:'hidden'},
 photo:{width:'100%',height:'100%'},letter:{fontSize:27,fontWeight:'900',color:T.accent},
 name:{fontSize:22,fontWeight:'900',color:T.text},handle:{color:T.accent,fontSize:13},bio:{fontSize:14,lineHeight:21,color:T.text},sub:{fontSize:12,color:T.muted},
 tags:{flexDirection:'row',flexWrap:'wrap',gap:8},tag:{paddingHorizontal:11,paddingVertical:8,backgroundColor:T.raised,borderRadius:MobileTheme.radius.pill},tagLabel:{color:T.accent,fontWeight:'800',fontSize:12},
 metrics:{flexDirection:'row',gap:10},metric:{flex:1,alignItems:'center',minHeight:60,justifyContent:'center',backgroundColor:T.raised,borderRadius:MobileTheme.radius.md},
 metricNum:{color:T.text,fontSize:19,fontWeight:'900'},follow:{minHeight:MobileTheme.touchTarget,backgroundColor:T.accent,borderRadius:MobileTheme.radius.md,alignItems:'center',justifyContent:'center'},
 followText:{color:T.background,fontSize:14,fontWeight:'900'},unfollow:{backgroundColor:T.raised,borderWidth:1,borderColor:T.border},unfollowText:{color:T.text},disabled:{opacity:.5}
});
