import React,{useCallback,useRef,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {myStoryReplies,type PrivateStoryReply} from '../../src/lib/social-feed-api';
import {MobileTheme} from '../../src/lib/theme';
import {storyReplyKind} from '../../src/lib/story-reply-display.cjs';

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
   const results=await myStoryReplies(auth.token,requestedPage,auth.username);
   if(version!==generation.current||identity!==currentAccount.current)return;
   setItems(previous=>requestedPage===0?results:[...previous,...results.filter(reply=>!previous.some(old=>old.id===reply.id))]);
   page.current=requestedPage+1;
   setHasMore(results.length===20);
  }catch(e){
   if(version===generation.current&&identity===currentAccount.current)
    setError(e instanceof Error?e.message:t('Não foi possível consultar as respostas.'));
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
  <Text style={styles.title}>{t('Reações às tuas Stories')}</Text>
  <Text style={styles.note}>{t('As reações e respostas são privadas. Continuam guardadas depois de as Stories expirarem.')}</Text>
  {!auth.token?<Button title={t('Iniciar sessão')} onPress={()=>router.push('/login')}/>:null}
  {sameAccount?items.map(reply=>{
   const isReaction=storyReplyKind(reply.content)==='reaction';
   return <View key={reply.id} style={styles.card}>
    <View style={styles.senderRow}>
     <View style={styles.avatar}><Text style={styles.avatarLetter}>{reply.senderUsername.charAt(0).toUpperCase()||'J'}</Text></View>
     <View style={styles.senderCopy}>
      <Text style={styles.sender}>@{reply.senderUsername}</Text>
      <Text style={styles.note}>{Number.isFinite(Date.parse(reply.createdAt))?new Date(reply.createdAt).toLocaleString('pt-PT'):t('Resposta recebida')}</Text>
     </View>
     <View style={styles.kindBadge}><Text style={styles.kindText}>{isReaction?t('Reação'):t('Resposta')}</Text></View>
    </View>
    <View style={styles.storyContext}>
     <Text style={styles.storyContextIcon}>◉</Text>
     <View style={{flex:1,gap:3}}>
      <Text style={styles.storyContextTitle}>{t('À tua Story')}</Text>
      <Text style={styles.storyContextSubtitle}>{t('Conteúdo original · Story #{a}',{a:reply.storyId})}</Text>
     </View>
     <Text style={styles.storyContextArrow}>↗</Text>
    </View>
    {isReaction?<View style={styles.reactionBubble}><Text maxFontSizeMultiplier={1.3} style={styles.reactionEmoji}>{reply.content}</Text><Text style={styles.reactionLabel}>{t('Reagiu à tua Story')}</Text></View>:
     <Text style={styles.message}>{reply.content}</Text>}
    <View style={styles.actions}>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir conversa privada com {v}',{v:reply.senderUsername})}
      style={styles.primaryAction} onPress={()=>router.push({pathname:'/messages/[peer]',params:{peer:reply.senderUsername}})}>
      <Text style={styles.primaryText}>{t('Abrir conversa')}</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Ver Story original, se disponível')}
      style={styles.secondaryAction} onPress={()=>router.push({pathname:'/',params:{storyId:String(reply.storyId)}})}>
      <Text style={styles.secondaryText}>{t('Ver Story')}</Text>
     </Pressable>
    </View>
   </View>;
  }):null}
  {sameAccount&&!loading&&!error&&items.length===0?<Text style={styles.note}>{t('Ainda não recebeste respostas privadas às tuas Stories.')}</Text>:null}
  {sameAccount&&error?<Message tone="error">{error}</Message>:null}
  {loading?<Loader/>:null}
  {sameAccount&&!loading&&(hasMore||!!error)?
   <Button secondary title={error?t('Tentar novamente'):t('Ver respostas anteriores')} onPress={()=>void load(generation.current)}/>:null}
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:25,fontWeight:'900',color:T.text},note:{fontSize:12,lineHeight:19,color:T.muted},
 card:{backgroundColor:T.surface,borderColor:T.border,borderWidth:1,borderRadius:18,padding:15,gap:13},
 senderRow:{flexDirection:'row',alignItems:'center',gap:10},
 avatar:{width:43,height:43,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:T.raised,borderWidth:1,borderColor:T.border},
 avatarLetter:{fontSize:18,fontWeight:'900',color:T.accent},
 senderCopy:{flex:1,gap:2},sender:{fontSize:15,color:T.text,fontWeight:'900'},
 kindBadge:{borderRadius:30,backgroundColor:T.raised,borderWidth:1,borderColor:T.border,paddingHorizontal:10,paddingVertical:6},
 kindText:{fontSize:11,color:T.accent,fontWeight:'800'},
 storyContext:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:T.raised,borderRadius:12,padding:11,borderLeftColor:T.accent,borderLeftWidth:3},
 storyContextIcon:{fontSize:23,color:T.accent},storyContextTitle:{color:T.text,fontWeight:'800',fontSize:13},
 storyContextSubtitle:{color:T.muted,fontSize:11},storyContextArrow:{color:T.accent,fontSize:20},
 reactionBubble:{flexDirection:'row',alignItems:'center',gap:13,alignSelf:'flex-start',borderRadius:16,paddingHorizontal:14,paddingVertical:11,backgroundColor:T.raised},
 reactionEmoji:{fontSize:34},reactionLabel:{fontSize:13,color:T.text,fontWeight:'700'},
 message:{fontSize:15,lineHeight:22,color:T.text,backgroundColor:T.raised,borderRadius:15,padding:14},
 actions:{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'},
 primaryAction:{minHeight:44,justifyContent:'center',borderRadius:12,backgroundColor:T.accent,paddingHorizontal:17},
 primaryText:{fontSize:13,color:T.background,fontWeight:'900'},
 secondaryAction:{minHeight:44,justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:T.border,paddingHorizontal:14},
 secondaryText:{fontSize:13,color:T.accent,fontWeight:'800'}
});
