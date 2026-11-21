import React,{useCallback,useRef,useState} from 'react';
import {Alert,StyleSheet,Text,View} from 'react-native';
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
  const [loaded,setLoaded]=useState(false);
  const generation=useRef(0);
  const responding=useRef(false);
  const reload=useCallback(async(version=generation.current)=>{
    if(!auth.token||!auth.username){
      if(version===generation.current){setInvites([]);setLoaded(false);setLoading(false);}
      return;
    }
    setLoading(true);setError('');
    try{
      const next=await myCommunityInvites(auth.token,auth.username);
      if(version!==generation.current)return;
      setInvites(next);setLoaded(true);
    }catch(e){
      if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar os convites.');
    }finally{if(version===generation.current)setLoading(false);}
  },[auth.token,auth.username]);
  useFocusEffect(useCallback(()=>{
    const version=++generation.current;
    responding.current=false;setBusyId(null);setInvites([]);setLoaded(false);
    setError('');setMessage('');
    void reload(version);
    return ()=>{generation.current++;responding.current=false;};
  },[reload]));
  async function respond(inviteId:number,action:'accept'|'reject'){
    if(responding.current||!auth.token||!auth.username)return;
    const version=generation.current;
    responding.current=true;setBusyId(inviteId);setError('');setMessage('');
    try{
      const group=await respondCommunityInvite(inviteId,action,auth.token,auth.username);
      if(version!==generation.current)return;
      // A resposta foi aceite pelo servidor; não mostrar este convite outra vez.
      setInvites(current=>current.filter(invite=>invite.id!==inviteId));
      setMessage(action==='accept'?'Convite aceite. Bem-vindo à comunidade!':'Convite recusado.');
      if(action==='accept'&&group?.id){
        router.push({pathname:'/communities/[id]',params:{id:String(group.id)}});
      }else{
        await reload(version);
        if(version===generation.current)setMessage(action==='accept'?'Convite aceite. Bem-vindo à comunidade!':'Convite recusado.');
      }
    }catch(e){
      if(version===generation.current)setError((e instanceof Error?e.message:'Não foi possível responder ao convite.')+' Verifica a lista antes de repetires.');
    }finally{
      if(version===generation.current){responding.current=false;setBusyId(null);}
    }
  }
  function confirmReject(inviteId:number,communityName:string){
    if(responding.current)return;
    Alert.alert('Recusar convite',`Queres recusar o convite para ${communityName}?`,[
      {text:'Voltar',style:'cancel'},
      {text:'Recusar',style:'destructive',onPress:()=>{void respond(inviteId,'reject');}}
    ]);
  }
  return <Page><DemoBanner/><Eyebrow>COMUNIDADES</Eyebrow>
    <Text maxFontSizeMultiplier={1.3} style={styles.title}>Os teus <Text style={{color:C.mint}}>convites.</Text></Text>
    <Text style={styles.sub}>Decide em que comunidades queres participar. Não entras automaticamente quando recebes um convite.</Text>
    {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push({pathname:'/login',params:{redirect:'/communities/invites'}})}/>:null}
    {loading?<Loader/>:null}
    {error?<Message tone="error">{error}</Message>:null}
    {error?<Button secondary title="Atualizar convites" disabled={loading||busyId!==null} onPress={()=>{void reload();}}/>:null}
    {message?<Message>{message}</Message>:null}
    {!loading&&loaded&&!error&&auth.token&&invites.length===0?<View style={styles.empty}>
      <Text style={{fontSize:40}}>✉️</Text>
      <Text style={styles.emptyTitle}>Sem convites pendentes</Text>
      <Text style={styles.sub}>Quando alguém te convidar para uma comunidade, o convite aparecerá aqui.</Text>
    </View>:null}
    {invites.map(invite=><View key={invite.id} style={styles.card}>
      <Text style={styles.heading}>{invite.communityName}</Text>
      <Text style={styles.sub}>Convidado por @{invite.invitedByUsername}</Text>
      <View style={styles.buttons}>
        <View style={{flex:1}}><Button title={busyId===invite.id?'A processar…':'Aceitar'} disabled={busyId!==null} onPress={()=>{void respond(invite.id,'accept');}}/></View>
        <View style={{flex:1}}><Button secondary title="Recusar" disabled={busyId!==null} onPress={()=>confirmReject(invite.id,invite.communityName)}/></View>
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
