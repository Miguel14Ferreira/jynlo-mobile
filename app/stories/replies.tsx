import React,{useCallback,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {myStoryReplies,type PrivateStoryReply} from '../../src/lib/social-feed-api';
import {MobileTheme} from '../../src/lib/theme';

const T=MobileTheme.colors;

/** A reply stays private to its Story author even after the Story expires. */
export default function PrivateStoryReplies(){
 const auth=useAuth(),router=useRouter();
 const [items,setItems]=useState<PrivateStoryReply[]>([]);
 const [error,setError]=useState(''),[loading,setLoading]=useState(false),[hasMore,setHasMore]=useState(false);
 const currentAccount=useRef(''),generation=useRef(0),page=useRef(0),busy=useRef(false);
 const identity=(auth.username||'')+'|'+(auth.token||'');
 const sameAccount=Boolean(auth.token&&auth.username&&identity===currentAccount.current);
 const load=useCallback(async(version:number)=>{
  if(!auth.token||busy.current)return;
  busy.current=true;setLoading(true);setError('');
  const requestedPage=page.current;
  try{
   const results=await myStoryReplies(auth.token,requestedPage);
   if(version!==generation.current||identity!==currentAccount.current)return;
   setItems(previous=>requestedPage===0?results:[...previous,...results.filter(reply=>!previous.some(old=>old.id===reply.id))]);
   page.current=requestedPage+1;
   setHasMore(results.length===20);
  }catch(e){
   if(version===generation.current&&identity===currentAccount.current)
    setError(e instanceof Error?e.message:'Não foi possível consultar as respostas.');
  }finally{
   if(version===generation.current){busy.current=false;setLoading(false);}
  }
 },[auth.token,identity]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  currentAccount.current=identity;page.current=0;busy.current=false;
  setItems([]);setError('');setLoading(false);setHasMore(false);
  void load(version);
  return()=>{generation.current++;};
 },[identity,load]));
 return <Page>
  <Text style={styles.title}>Respostas às tuas Stories</Text>
  <Text style={styles.note}>Só tu podes consultar estas respostas. Continuam guardadas depois de as Stories expirarem.</Text>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {sameAccount?items.map(reply=><View key={reply.id} style={styles.card}>
   <Pressable accessibilityRole="button" accessibilityLabel={'Ver perfil de '+reply.senderUsername}
    onPress={()=>router.push({pathname:'/social/[username]',params:{username:reply.senderUsername}})}>
    <Text style={styles.sender}>@{reply.senderUsername}</Text>
   </Pressable>
   <Text style={styles.message}>{reply.content}</Text>
   <Text style={styles.note}>{Number.isFinite(Date.parse(reply.createdAt))?new Date(reply.createdAt).toLocaleString('pt-PT'):'Resposta recebida'}</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Ver Story original se ainda estiver ativa"
    onPress={()=>router.push({pathname:'/',params:{storyId:String(reply.storyId)}})}>
    <Text style={styles.link}>Ver Story, se ainda estiver disponível</Text>
   </Pressable>
  </View>):null}
  {sameAccount&&!loading&&!error&&items.length===0?<Text style={styles.note}>Ainda não recebeste respostas privadas às tuas Stories.</Text>:null}
  {sameAccount&&error?<Message tone="error">{error}</Message>:null}
  {loading?<Loader/>:null}
  {sameAccount&&!loading&&(hasMore||!!error)?
   <Button secondary title={error?'Tentar novamente':'Ver respostas anteriores'} onPress={()=>void load(generation.current)}/>:null}
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:23,fontWeight:'900',color:T.text},note:{fontSize:12,lineHeight:19,color:T.muted},
 card:{backgroundColor:T.surface,borderColor:T.border,borderWidth:1,borderRadius:16,padding:15,gap:10},
 sender:{fontSize:15,color:T.accent,fontWeight:'900'},message:{fontSize:14,lineHeight:21,color:T.text},
 link:{fontSize:12,color:T.accent,fontWeight:'800',paddingVertical:7}
});
