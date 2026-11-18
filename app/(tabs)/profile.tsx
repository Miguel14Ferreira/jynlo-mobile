import React,{useCallback,useState} from 'react';
import {Alert,Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {DEMO_MODE,ApiError,request} from '../../src/lib/api';
import {C,MobileTheme} from '../../src/lib/theme';
import {parseFavoriteSports} from '../../src/lib/favorite-sports.cjs';
import ProfilePosts from '../../src/components/ProfilePosts';
import ProfilePrivacySettings from '../../src/components/ProfilePrivacySettings';
import {JynloIcon} from '../../src/components/JynloIcon';
import {followStatus,type FollowStatus} from '../../src/lib/social-relations-api';
type ProfilePresentation={
  profilePicUrl?:string|null;fullName?:string|null;nickname?:string|null;
  bio?:string|null;location?:string|null;country?:string|null;
  favoriteSports?:string|null;skillLevel?:string|null;
};
export default function ProfileScreen(){
  const router=useRouter();const auth=useAuth();
  const [confirmUsername,setConfirmUsername]=useState('');
  const [profile,setProfile]=useState<ProfilePresentation|null>(null);
  const [profileLoading,setProfileLoading]=useState(false);
  const [profileError,setProfileError]=useState(false);
  const [socialCounts,setSocialCounts]=useState<FollowStatus|null>(null);
  useFocusEffect(useCallback(()=>{
    // Clear private profile details on account change and screen transitions.
    setProfile(null);setProfileError(false);setSocialCounts(null);
    if(!auth.token||DEMO_MODE){setProfileLoading(false);return;}
    let active=true;setProfileLoading(true);
    if(auth.username)void followStatus(auth.username,auth.token).then(counts=>{if(active)setSocialCounts(counts);}).catch(()=>{});
    void request<ProfilePresentation>('/api/profile/me/mobile',{token:auth.token})
      .then(result=>{if(active)setProfile(result);})
      .catch(()=>{if(active)setProfileError(true);})
      .finally(()=>{if(active)setProfileLoading(false);});
    return()=>{active=false;};
  },[auth.token,auth.username]));
  const favoriteSports=parseFavoriteSports(profile?.favoriteSports).slice(0,8);
  const displayName=profile?.nickname?.trim()||profile?.fullName?.trim()||auth.username||'Visitante';
  const location=[profile?.location?.trim(),profile?.country?.trim()].filter(Boolean).join(' · ');
  const [showDelete,setShowDelete]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const canDelete=Boolean(!DEMO_MODE&&auth.username&&auth.token&&confirmUsername.trim()===auth.username&&!deleting);
  const deleteAccount=()=>{
    if(!canDelete||!auth.token)return;
    Alert.alert('Eliminar a tua conta?', 'Esta ação é irreversível. Os dados pessoais serão apagados ou anonimizados. Se tens comunidades próprias, transfere primeiro a propriedade.', [
      {text:'Manter a conta',style:'cancel'},
      {text:'Eliminar definitivamente',style:'destructive',onPress:()=>{void (async()=>{
        setDeleting(true);
        try{
          await request<void>('/api/profile/me',{token:auth.token,method:'DELETE'});
        }catch(e){
          // No automatic retry: a timeout can happen AFTER the server has deleted the account.
          const detail=e instanceof ApiError&&[403,409].includes(e.status)
            ?'O servidor não autorizou a eliminação. Se tens comunidades próprias, transfere primeiro a propriedade.'
            :e instanceof ApiError&&e.status===401
            ?'A sessão expirou. Inicia sessão novamente para verificares o estado da conta.'
            :'Não foi possível confirmar a resposta do servidor. Verifica se a conta ainda existe antes de repetires o pedido.';
          Alert.alert('Eliminação não confirmada',detail);
          setDeleting(false);
          return;
        }
        // Server deletion is confirmed; a subsequent logout/storage error must not undo that result.
        try{
          await auth.logout();
          router.replace('/welcome');
          Alert.alert('Conta eliminada','A tua conta foi eliminada e a sessão foi terminada.');
        }catch{
          router.replace('/welcome');
          Alert.alert('Conta eliminada','O servidor confirmou a eliminação, mas não foi possível concluir a limpeza local. Fecha a aplicação antes de a voltar a utilizar.');
        }finally{setDeleting(false);}
      })();}}
    ]);
  };
  return <Page><Brand subtitle="A TUA JYNLO"/><DemoBanner/><Eyebrow>PERFIL</Eyebrow>
    <View style={styles.profile}>
      <View style={styles.profileTop}>
        <View style={styles.avatar}>{profile?.profilePicUrl?<Image source={{uri:profile.profilePicUrl}} style={styles.avatarImage}/>:
          <Text style={styles.avatarLetter}>{auth.username?.charAt(0).toUpperCase()||'?'}</Text>}</View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={2}>{displayName}</Text>
          {auth.username?<Text style={styles.handle}>@{auth.username}</Text>:null}
          <Text style={styles.sub}>{auth.username?'Perfil desportivo':'Entra para participares nas atividades'}</Text>
        </View>
      </View>
      {profileLoading?<Text style={styles.profileHint}>A carregar o teu perfil…</Text>:null}
      {profileError?<Text style={styles.profileHint}>Não foi possível carregar os detalhes do perfil. Podes tentar novamente ao regressar a este ecrã.</Text>:null}
      {profile?.bio?.trim()?<Text style={styles.bio}>{profile.bio.trim()}</Text>:null}
      {location?<View style={{flexDirection:'row',alignItems:'center',gap:5}}><JynloIcon name="location" size={16} color={C.muted}/><Text style={styles.location}>{location}</Text></View>:null}
      {favoriteSports.length>0?<View style={styles.favoriteSection}>
        <Text style={styles.favoriteHeading}>MODALIDADES FAVORITAS</Text>
        <View style={styles.sportTags}>{favoriteSports.map(sport=><View key={sport} style={styles.sportTag}><Text style={styles.sportTagText}>{sport}</Text></View>)}</View>
      </View>:null}
      {auth.username?<View style={styles.socialNav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver os meus seguidores" onPress={()=>router.push({pathname:'/social/[username]/[kind]',params:{username:auth.username!,kind:'followers'}})} style={styles.socialAction}><Text style={styles.socialActionTitle}>{socialCounts?socialCounts.followers.toLocaleString('pt-PT'):'—'}</Text><Text style={styles.socialActionHint}>Seguidores</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver quem sigo" onPress={()=>router.push({pathname:'/social/[username]/[kind]',params:{username:auth.username!,kind:'following'}})} style={styles.socialAction}><Text style={styles.socialActionTitle}>{socialCounts?socialCounts.following.toLocaleString('pt-PT'):'—'}</Text><Text style={styles.socialActionHint}>A seguir</Text></Pressable>
      </View>:null}
      {auth.token&&!DEMO_MODE?<Pressable accessibilityRole="button" accessibilityLabel="Editar o meu perfil desportivo" onPress={()=>router.push('/edit-profile')} style={styles.editProfileAction}>
        <Text style={styles.editProfileText}>Editar perfil</Text><JynloIcon name="chevron-right" size={21} color={C.mint}/>
      </Pressable>:null}
    </View>
    {auth.token&&!DEMO_MODE?<ProfilePrivacySettings token={auth.token}/>:null}
    {auth.username&&auth.token?<ProfilePosts username={auth.username} token={auth.token}/>:null}
    <Eyebrow>EXPLORAR A JYNLO</Eyebrow>
    <Button title="Feed" secondary onPress={()=>router.push('/feed')}/>
    <Button title="Recintos desportivos" secondary onPress={()=>router.push('/venues')}/>
    <Button title="As minhas sessões" secondary onPress={()=>router.push('/my-sessions')}/>
    <Button title="As minhas equipas" secondary onPress={()=>router.push('/teams')}/>
    {!auth.username?<><Button title={DEMO_MODE?'Experimentar conta de demonstração':'Iniciar sessão'} onPress={()=>router.push('/login')}/><Button title="Voltar às boas-vindas" secondary onPress={()=>router.push('/welcome')}/></>:
      <Button title="Terminar sessão" secondary onPress={()=>{void auth.logout().then(
        ()=>router.replace('/welcome'),
        error=>{
          router.replace('/welcome');
          Alert.alert('Verifica a sessão',error instanceof Error?error.message:
            'Não foi possível confirmar a remoção das credenciais. Verifica a sessão antes de partilhares o telemóvel.');
        }
      );}}/>}
    {auth.username&&!DEMO_MODE?<><Eyebrow>GESTÃO DA CONTA</Eyebrow>

    <Button title="Alterar palavra-passe" secondary onPress={()=>router.push('/change-password')}/>
    <Button title={showDelete?'Ocultar eliminação de conta':'Eliminar a minha conta'} secondary onPress={()=>{setShowDelete(v=>!v);setConfirmUsername('');}}/>
    {showDelete?<View style={styles.deleteBox}>
      <Text style={styles.deleteWarning}>A eliminação é definitiva. As tuas publicações e os teus dados pessoais são apagados ou anonimizados. Se és proprietário de comunidades, transfere primeiro a propriedade.</Text>
      <Text style={styles.deleteHint}>Para confirmar, escreve exatamente: {auth.username}</Text>
      <TextInput style={styles.deleteInput} value={confirmUsername} onChangeText={setConfirmUsername} autoCapitalize="none" autoCorrect={false} placeholder="Nome de utilizador" placeholderTextColor={C.muted} accessibilityLabel="Confirmação do nome de utilizador para eliminar a conta"/>
      <Button title={deleting?'A eliminar conta…':'Eliminar definitivamente'} danger disabled={!canDelete} onPress={deleteAccount}/>
    </View>:null}
    </>:null}
    <Eyebrow>INFORMAÇÃO LEGAL</Eyebrow>
    <Button title="Política de Privacidade" secondary onPress={()=>router.push({pathname:'/legal',params:{document:'privacy'}})}/>
    <Button title="Termos de Utilização" secondary onPress={()=>router.push({pathname:'/legal',params:{document:'terms'}})}/>
    <Button title="Como pedir a eliminação da conta" secondary onPress={()=>router.push({pathname:'/legal',params:{document:'delete'}})}/>
    {!auth.username?<Message>Inicia sessão para participares nas atividades desportivas.</Message>:null}
    {DEMO_MODE?<Message>Modo de demonstração: as contas Tiago e André são fictícias. Não há ligação à produção.</Message>:null}
  </Page>;
}
const styles=StyleSheet.create({
 profile:{padding:16,borderWidth:1,borderColor:MobileTheme.colors.border,backgroundColor:MobileTheme.colors.surface,borderRadius:MobileTheme.radius.xl,gap:12},
 profileTop:{flexDirection:'row',alignItems:'center',gap:14},
 avatar:{width:80,height:80,borderRadius:40,backgroundColor:MobileTheme.colors.raised,alignItems:'center',justifyContent:'center',overflow:'hidden',borderWidth:2,borderColor:MobileTheme.colors.accent},
 avatarImage:{width:'100%',height:'100%'},
 avatarLetter:{fontSize:31,fontWeight:'900',color:MobileTheme.colors.accent},
 identity:{flex:1,gap:4},
 name:{color:MobileTheme.colors.text,fontSize:23,fontWeight:'900'},
 handle:{color:MobileTheme.colors.accent,fontSize:12,fontWeight:'800'},
 sub:{color:MobileTheme.colors.muted,fontSize:12},
 bio:{color:MobileTheme.colors.text,fontSize:14,lineHeight:21},
 location:{color:MobileTheme.colors.muted,fontSize:12},
 profileHint:{color:MobileTheme.colors.muted,fontSize:12,lineHeight:18},
 socialNav:{flexDirection:'row',gap:10},
 socialAction:{flex:1,minHeight:MobileTheme.touchTarget+5,borderRadius:MobileTheme.radius.md,backgroundColor:MobileTheme.colors.raised,alignItems:'center',justifyContent:'center',gap:4,padding:9},
 socialActionTitle:{color:MobileTheme.colors.text,fontWeight:'900',fontSize:14},
 socialActionHint:{color:MobileTheme.colors.accent,fontWeight:'700',fontSize:11},
 favoriteSection:{gap:8,borderTopWidth:1,borderTopColor:MobileTheme.colors.border,paddingTop:10},
 favoriteHeading:{color:MobileTheme.colors.muted,fontSize:10,letterSpacing:1,fontWeight:'900'},
 sportTags:{flexDirection:'row',flexWrap:'wrap',gap:8},
 sportTag:{backgroundColor:MobileTheme.colors.raised,borderRadius:MobileTheme.radius.pill,paddingHorizontal:11,paddingVertical:7},
 sportTagText:{color:MobileTheme.colors.accent,fontSize:12,fontWeight:'800'},
 editProfileAction:{minHeight:MobileTheme.touchTarget,borderTopWidth:1,borderTopColor:MobileTheme.colors.border,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 editProfileText:{color:MobileTheme.colors.accent,fontWeight:'900',fontSize:13},
 editProfileArrow:{color:MobileTheme.colors.accent,fontSize:19},
  deleteBox:{gap:12,padding:16,borderWidth:1,borderColor:C.danger,borderRadius:16,backgroundColor:C.surface},
 deleteWarning:{fontSize:13,lineHeight:19,color:C.white},
 deleteHint:{fontSize:13,color:C.muted},
 deleteInput:{borderWidth:1,borderColor:C.border,borderRadius:12,padding:14,color:C.white,backgroundColor:C.background,fontSize:15},
});
