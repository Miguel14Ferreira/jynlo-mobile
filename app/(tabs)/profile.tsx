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
import {followStatus,publicSportsActivity,type PublicSportsActivity,type FollowStatus} from '../../src/lib/social-relations-api';
import {joinedSportsTeams,type SportsTeam} from '../../src/lib/sports-teams-api';
import {myCommunities} from '../../src/lib/community-api';
import type {CommunityGroup} from '../../src/lib/types';
const achievementLabels:Record<string,string>={
 FIRST_ACTIVITY:'🏅 Primeira atividade',TEN_ACTIVITIES:'🔥 10 atividades',
 EXPLORER:'🌍 Explorador',ORGANIZER:'👥 Organizador',
 COMMUNITY_BUILDER:'🤝 Criador de comunidades',REGULAR:'📅 Regular'
};
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
  const [activity,setActivity]=useState<PublicSportsActivity|null>(null);
  const [showAllAchievements,setShowAllAchievements]=useState(false);
  const [verifiedTeams,setVerifiedTeams]=useState<SportsTeam[]>([]);
  const [verifiedCommunities,setVerifiedCommunities]=useState<CommunityGroup[]>([]);
  const [membershipsLoading,setMembershipsLoading]=useState(false);
  const [membershipsError,setMembershipsError]=useState(false);
  useFocusEffect(useCallback(()=>{
    // Clear private profile details on account change and screen transitions.
    setProfile(null);setProfileError(false);setSocialCounts(null);setActivity(null);setShowAllAchievements(false);
    setVerifiedTeams([]);setVerifiedCommunities([]);setMembershipsError(false);setMembershipsLoading(false);
    if(!auth.token||DEMO_MODE){setProfileLoading(false);return;}
    let active=true;setProfileLoading(true);
    if(auth.username){
      void followStatus(auth.username,auth.token).then(counts=>{if(active)setSocialCounts(counts);}).catch(()=>{});
      void publicSportsActivity(auth.username,auth.token).then(stats=>{if(active)setActivity(stats);})
        .catch(()=>{/* Never display guessed stats or achievements. */});
    }
    if(auth.username){
      setMembershipsLoading(true);
      void Promise.allSettled([joinedSportsTeams(auth.token),myCommunities(auth.token,auth.username)])
        .then(([teams,communities])=>{
          if(!active)return;
          if(teams.status==='fulfilled')setVerifiedTeams(teams.value.filter(t=>Number.isSafeInteger(t.id)&&t.id>0));
          if(communities.status==='fulfilled')setVerifiedCommunities(communities.value.filter(g=>Number.isSafeInteger(g.id)&&g.id>0&&g.myRole!==null));
          setMembershipsError(teams.status==='rejected'||communities.status==='rejected');
        }).finally(()=>{if(active)setMembershipsLoading(false);});
    }
    void request<ProfilePresentation>('/api/profile/me/mobile',{token:auth.token})
      .then(result=>{if(active)setProfile(result);})
      .catch(()=>{if(active)setProfileError(true);})
      .finally(()=>{if(active)setProfileLoading(false);});
    return()=>{active=false;};
  },[auth.token,auth.username]));
  const favoriteSports=parseFavoriteSports(profile?.favoriteSports).slice(0,8);
  const earnedAchievements=(activity?.achievements||[]).filter(code=>Object.prototype.hasOwnProperty.call(achievementLabels,code));
  const displayName=profile?.nickname?.trim()||profile?.fullName?.trim()||auth.username||'Visitante';
  const location=[profile?.location?.trim(),profile?.country?.trim()].filter(Boolean).join(' · ');
  const [showDelete,setShowDelete]=useState(false);
  const [moreOptionsOpen,setMoreOptionsOpen]=useState(false);
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
    {auth.token&&auth.username&&!DEMO_MODE&&activity?<View style={styles.history}>
      <Text style={styles.historyTitle}>O meu histórico desportivo</Text>
      <Text style={styles.historyHint}>Resultados e conquistas registados na Jynlo.</Text>
      <View style={styles.historyGrid}>
       {([
        [activity.activitiesCompleted,'Atividades realizadas'],
        [activity.peoplePlayedWith,'Pessoas com quem joguei'],
        [activity.sportsPractised,'Modalidades'],
        [activity.eventsCreated,'Eventos criados'],
        [activity.participantsMobilized,'Participantes mobilizados'],
        [activity.communitiesJoined,'Comunidades']
       ] as const).map(([value,label])=><View style={styles.historyStat} key={label}>
        <Text style={styles.historyValue}>{Math.max(0,Number(value)||0)}</Text>
        <Text style={styles.historyHint}>{label}</Text>
       </View>)}
      </View>
      {earnedAchievements.length>0?<View style={styles.historyTrophies}>
       <Text style={styles.historyTitle}>Conquistas</Text>
       <View style={styles.historyBadges}>
        {(showAllAchievements?earnedAchievements:earnedAchievements.slice(0,3)).map(code=>
         <Text key={code} style={styles.historyBadge}>{achievementLabels[code]}</Text>)}
       </View>
       {earnedAchievements.length>3?<Pressable accessibilityRole="button"
         accessibilityLabel={showAllAchievements?'Mostrar menos conquistas':'Ver todas as conquistas'}
         accessibilityState={{expanded:showAllAchievements}}
         style={styles.showAchievements} onPress={()=>setShowAllAchievements(value=>!value)}>
         <Text style={styles.showAchievementsText}>{showAllAchievements?'Mostrar menos':'Ver todas as conquistas'} ({earnedAchievements.length})</Text>
       </Pressable>:null}
      </View>:null}
    </View>:null}
    {auth.token&&auth.username&&!DEMO_MODE?<View style={styles.memberships}>
      <Text style={styles.membershipsTitle}>As minhas equipas e comunidades</Text>
      <Text style={styles.membershipsHint}>Associações confirmadas pela tua conta Jynlo.</Text>
      {membershipsLoading?<Text style={styles.membershipsHint}>A verificar associações…</Text>:<>
        {verifiedTeams.length>0?<View style={styles.membershipList}>
          <Text style={styles.membershipsGroupTitle}>EQUIPAS</Text>
          {verifiedTeams.map(team=><Pressable key={'team-'+team.id} accessibilityRole="button"
            accessibilityLabel={'Abrir equipa '+team.name}
            onPress={()=>router.push({pathname:'/teams/[id]',params:{id:String(team.id)}})}
            style={styles.membershipCard}>
            <Text style={styles.membershipName}>{team.name}</Text>
            <Text style={styles.membershipsHint}>{team.sport||'Equipa desportiva'}</Text>
          </Pressable>)}
        </View>:null}
        {verifiedCommunities.length>0?<View style={styles.membershipList}>
          <Text style={styles.membershipsGroupTitle}>COMUNIDADES</Text>
          {verifiedCommunities.map(group=><Pressable key={'community-'+group.id} accessibilityRole="button"
            accessibilityLabel={'Abrir comunidade '+group.name}
            onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(group.id)}})}
            style={styles.membershipCard}>
            <Text style={styles.membershipName}>{group.name}</Text>
            <Text style={styles.membershipsHint}>{group.sport||'Comunidade desportiva'}</Text>
          </Pressable>)}
        </View>:null}
        {!verifiedTeams.length&&!verifiedCommunities.length&&!membershipsError?
          <Text style={styles.membershipsHint}>Ainda não tens associações confirmadas.</Text>:null}
        {membershipsError?<Text style={styles.membershipsHint}>Não foi possível verificar todas as associações.</Text>:null}
      </>}
    </View>:null}
    {auth.token&&!DEMO_MODE?<ProfilePrivacySettings token={auth.token}/>:null}
    {auth.username&&auth.token?<ProfilePosts username={auth.username} token={auth.token}/>:null}
    <Pressable accessibilityRole="button" accessibilityLabel="Mostrar mais opções do perfil" accessibilityState={{expanded:moreOptionsOpen}}
      onPress={()=>setMoreOptionsOpen(open=>!open)} style={styles.moreOptionsAction}>
      <View style={styles.moreOptionsLabel}><JynloIcon name="settings" size={20} color={C.mint}/><Text style={styles.moreOptionsText}>Mais opções</Text></View>
      <JynloIcon name={moreOptionsOpen?'chevron-up':'chevron-down'} size={21} color={C.mint}/>
    </Pressable>
    {moreOptionsOpen?<>
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
    </>:null}
  </Page>;
}
const styles=StyleSheet.create({
  history:{padding:16,gap:10,borderWidth:1,borderColor:C.border,borderRadius:MobileTheme.radius.xl,backgroundColor:C.surface},
  historyTitle:{fontSize:16,fontWeight:'900',color:C.white},
  historyHint:{fontSize:12,color:C.muted,lineHeight:17},
  historyGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},
  historyStat:{flexBasis:'46%',flexGrow:1,minHeight:84,justifyContent:'center',gap:4,borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.raised,padding:12},
  historyValue:{fontSize:23,fontWeight:'900',color:C.mint},
  historyTrophies:{gap:9,marginTop:7},
  showAchievements:{minHeight:44,justifyContent:'center',alignSelf:'flex-start',paddingHorizontal:4},
  showAchievementsText:{color:C.mint,fontSize:13,fontWeight:'800'},
  historyBadges:{flexDirection:'row',flexWrap:'wrap',gap:8},
  historyBadge:{color:C.white,fontSize:12,fontWeight:'800',backgroundColor:C.raised,borderWidth:1,borderColor:C.border,padding:10,borderRadius:10},
  memberships:{padding:16,gap:10,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:MobileTheme.radius.xl},
  membershipsTitle:{fontSize:17,fontWeight:'900',color:C.white},
  membershipsHint:{fontSize:12,lineHeight:18,color:C.muted},
  membershipsGroupTitle:{fontSize:12,fontWeight:'900',color:C.mint,letterSpacing:.7},
  membershipList:{gap:8},
  membershipCard:{minHeight:55,padding:12,justifyContent:'center',gap:3,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.raised},
  membershipName:{fontSize:14,fontWeight:'800',color:C.white},
 moreOptionsAction:{minHeight:MobileTheme.touchTarget,paddingHorizontal:14,paddingVertical:12,borderWidth:1,borderColor:C.border,borderRadius:MobileTheme.radius.lg,backgroundColor:C.surface,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 moreOptionsLabel:{flexDirection:'row',alignItems:'center',gap:9},
 moreOptionsText:{fontSize:14,fontWeight:'800',color:C.white},
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
 socialActionHint:{color:MobileTheme.colors.accent,fontWeight:'700',fontSize:13},
 favoriteSection:{gap:8,borderTopWidth:1,borderTopColor:MobileTheme.colors.border,paddingTop:10},
 favoriteHeading:{color:MobileTheme.colors.muted,fontSize:12,letterSpacing:1,fontWeight:'900'},
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
