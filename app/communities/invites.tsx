import React,{useCallback,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {myCommunityInvites,respondCommunityInvite} from '../../src/lib/community-api';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import type {CommunityInvite} from '../../src/lib/types';
export default function CommunityInvitesScreen(){
  const router=useRouter();const auth=useAuth();
  const [invites,setInvites]=useState<CommunityInvite[]>([]);
  const [loading,setLoading]=useState(false);const [busyId,setBusyId]=useState<number|null>(null);
  const [error,setError]=useState('');const [message,setMessage]=useState('');
  const reload=useCallback(async()=>{
    if(!auth.token||!auth.username){setInvites([]);return;}
    setLoading(true);setError('');
    try{setInvites(await myCommunityInvites(auth.token,auth.username));}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar os convites.');}
    finally{setLoading(false);}
  },[auth.token,auth.username]);
  useFocusEffect(useCallback(()=>{void reload();},[reload]));
  async function respond(inviteId:number,action:'accept'|'reject'){
    if(busyId!==null||!auth.token||!auth.username)return;
    setBusyId(inviteId);setError('');setMessage('');
    try{
      const group=await respondCommunityInvite(inviteId,action,auth.token,auth.username);
      setMessage(action==='accept'?'Convite aceite. Bem-vindo à comunidade!':'Convite recusado.');
      await reload();
      if(action==='accept'&&group?.id)router.push({pathname:'/communities/[id]',params:{id:String(group.id)}});
    }catch(e){setError((e instanceof Error?e.message:'Não foi possível responder ao convite.')+' Verifica a lista antes de repetires.');}
    finally{setBusyId(null);}
  }
  return <Page><DemoBanner/><Eyebrow>COMUNIDADES</Eyebrow>
    <Text style={styles.title}>Os teus <Text style={{color:C.mint}}>convites.</Text></Text>
    <Text style={styles.sub}>Decide em que comunidades queres participar. Não entras automaticamente quando recebes um convite.</Text>
    {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push({pathname:'/login',params:{redirect:'/communities/invites'}})}/>:null}
    {loading?<Loader/>:null}
    {error?<Message tone="error">{error}</Message>:null}
    {message?<Message>{message}</Message>:null}
    {!loading&&auth.token&&invites.length===0?<View style={styles.empty}>
      <Text style={{fontSize:40}}>✉️</Text>
      <Text style={styles.emptyTitle}>Sem convites pendentes</Text>
      <Text style={styles.sub}>Quando alguém te convidar para uma comunidade, o convite aparecerá aqui.</Text>
    </View>:null}
    {invites.map(invite=><View key={invite.id} style={styles.card}>
      <Text style={styles.heading}>{invite.communityName}</Text>
      <Text style={styles.sub}>Convidado por @{invite.invitedByUsername}</Text>
      <View style={styles.buttons}>
        <View style={{flex:1}}><Button title={busyId===invite.id?'A processar…':'Aceitar'} disabled={busyId!==null} onPress={()=>{void respond(invite.id,'accept');}}/></View>
        <View style={{flex:1}}><Button secondary title="Recusar" disabled={busyId!==null} onPress={()=>{void respond(invite.id,'reject');}}/></View>
      </View>
    </View>)}
  </Page>;
}
const styles=StyleSheet.create({
  title:{fontSize:31,color:C.white,fontWeight:'900'},sub:{color:C.muted,fontSize:14,lineHeight:21},
  empty:{padding:22,gap:14,borderRadius:20,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,alignItems:'center'},
  emptyTitle:{color:C.white,fontSize:18,fontWeight:'800'},
  card:{padding:20,borderRadius:22,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,gap:13},
  heading:{color:C.white,fontSize:21,fontWeight:'900'},buttons:{flexDirection:'row',gap:10}
});
