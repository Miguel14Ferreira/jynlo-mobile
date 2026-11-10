import React,{useCallback,useRef,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {resolveJynloMedia} from '../../../src/lib/social-feed-api';
import {changeFollow,followStatus,publicSportsProfile,type FollowStatus,type PublicSportsProfile} from '../../../src/lib/social-relations-api';
import {parseFavoriteSports} from '../../../src/lib/favorite-sports.cjs';
import {MobileTheme} from '../../../src/lib/theme';
const T=MobileTheme.colors;
export default function PublicSocialProfile(){
 const {username}=useLocalSearchParams<{username:string}>();
 const name=typeof username==='string'&&/^[a-zA-Z0-9_.@-]{1,128}$/.test(username)?username:'';
 const auth=useAuth(),router=useRouter();
 const [profile,setProfile]=useState<PublicSportsProfile|null>(null);
 const [status,setStatus]=useState<FollowStatus|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const version=useRef(0),inFlight=useRef(false);
 const own=!!name&&name.toLowerCase()===auth.username?.toLowerCase();
 useFocusEffect(useCallback(()=>{
  const request=++version.current;setProfile(null);setStatus(null);setError('');setLoading(true);inFlight.current=false;setBusy(false);
  if(!name||!auth.token){setLoading(false);return()=>{version.current++;};}
  void Promise.allSettled([publicSportsProfile(name,auth.token),followStatus(name,auth.token)]).then(([p,s])=>{
   if(request!==version.current)return;
   if(p.status==='fulfilled')setProfile(p.value);
   else setError('Não foi possível carregar este perfil.');
   if(s.status==='fulfilled')setStatus(s.value);
  }).finally(()=>{if(request===version.current)setLoading(false);});
  return()=>{version.current++;setProfile(null);setStatus(null);};
 },[name,auth.token,auth.username]));
 async function toggle(){
  if(!name||own||!auth.token||!status||inFlight.current)return;
  const request=version.current,original=status.followedByMe;
  inFlight.current=true;setBusy(true);setError('');
  try{
   const next=await changeFollow(name,!original,auth.token);
   if(request===version.current)setStatus(next);
  }catch{
   if(request===version.current)setError('Não foi possível confirmar a alteração. Verifica o estado antes de repetir.');
  }finally{inFlight.current=false;if(request===version.current)setBusy(false);}
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
   {!own&&status?<Pressable accessibilityRole="button" accessibilityLabel={status.followedByMe?'Deixar de seguir':'Seguir utilizador'} disabled={busy} onPress={()=>{void toggle();}} style={[styles.follow,status.followedByMe&&styles.unfollow,busy&&styles.disabled]}>
    <Text style={[styles.followText,status.followedByMe&&styles.unfollowText]}>{busy?'A confirmar…':status.followedByMe?'A seguir ✓':'Seguir +'}</Text>
   </Pressable>:!own?<Text style={styles.sub}>Não foi possível confirmar a relação de seguimento.</Text>:null}
  </View>:null}
 </Page>;
}
const styles=StyleSheet.create({
 hero:{padding:18,gap:17,borderWidth:1,borderColor:T.border,backgroundColor:T.surface,borderRadius:MobileTheme.radius.xl},
 identity:{flexDirection:'row',alignItems:'center',gap:14},avatar:{height:72,width:72,borderRadius:36,backgroundColor:T.raised,alignItems:'center',justifyContent:'center',overflow:'hidden'},
 photo:{width:'100%',height:'100%'},letter:{fontSize:27,fontWeight:'900',color:T.accent},
 name:{fontSize:22,fontWeight:'900',color:T.text},handle:{color:T.accent,fontSize:13},bio:{fontSize:14,lineHeight:21,color:T.text},sub:{fontSize:12,color:T.muted},
 tags:{flexDirection:'row',flexWrap:'wrap',gap:8},tag:{paddingHorizontal:11,paddingVertical:8,backgroundColor:T.raised,borderRadius:MobileTheme.radius.pill},tagLabel:{color:T.accent,fontWeight:'800',fontSize:12},
 metrics:{flexDirection:'row',gap:10},metric:{flex:1,alignItems:'center',minHeight:60,justifyContent:'center',backgroundColor:T.raised,borderRadius:MobileTheme.radius.md},
 metricNum:{color:T.text,fontSize:19,fontWeight:'900'},follow:{minHeight:MobileTheme.touchTarget,backgroundColor:T.accent,borderRadius:MobileTheme.radius.md,alignItems:'center',justifyContent:'center'},
 followText:{color:T.background,fontSize:14,fontWeight:'900'},unfollow:{backgroundColor:T.raised,borderWidth:1,borderColor:T.border},unfollowText:{color:T.text},disabled:{opacity:.5}
});
