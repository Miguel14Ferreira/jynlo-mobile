import React,{useCallback,useRef,useState} from 'react';
import {Alert,AppState,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {C} from '../lib/theme';
import {teamContentHistory,searchTeamContent,sendTeamContent,editTeamContent,deleteTeamContent,teamReactionSummaries,setTeamReaction,removeTeamReaction,type TeamReactionState,type TeamContentEntry,type TeamContentKind} from '../lib/sports-team-content-api';

type Props={teamId:number;kind:TeamContentKind;token:string;username:string};
export default function SportsTeamContentPanel({teamId,kind,token,username}:Props){
 const [entries,setEntries]=useState<TeamContentEntry[]>([]);
 const [draft,setDraft]=useState('');
 const [loading,setLoading]=useState(true);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const [syncWarning,setSyncWarning]=useState('');
 const [replyTo,setReplyTo]=useState<number|null>(null);
 const [editingId,setEditingId]=useState<number|null>(null);
 const [editDraft,setEditDraft]=useState('');
 const [searchTerm,setSearchTerm]=useState('');
 const [searchResults,setSearchResults]=useState<TeamContentEntry[]>([]);
 const [searchActive,setSearchActive]=useState(false);
 const [searching,setSearching]=useState(false);
 const searchVersion=useRef(0);
 const reactionVersion=useRef(0);
 const [reactions,setReactions]=useState<Record<number,TeamReactionState>>({});
 const [reactionBusyId,setReactionBusyId]=useState<number|null>(null);
 const emojis=['👍','❤️','😂','🔥','👏'];
 const loadReactions=useCallback(async(items:TeamContentEntry[])=>{
  const ids=items.filter(item=>!item.deleted).slice(-100).map(item=>item.id);
  if(!ids.length)return;
  const current=++reactionVersion.current;
  try{
   const updated=await teamReactionSummaries(teamId,kind,ids,token);
   if(current===reactionVersion.current)setReactions(previous=>({...previous,...updated}));
  }catch{
   // Reaction counts are supplementary; never prevent reading the conversation.
  }
 },[teamId,kind,token,loadReactions]);
 const version=useRef(0),reading=useRef(false),sendingNow=useRef(false);
 const refresh=useCallback(async(quiet=false,expected=version.current)=>{
  if(reading.current||sendingNow.current)return;
  reading.current=true;
  if(!quiet){setLoading(true);setError('');}
  try{
   const history=await teamContentHistory(teamId,kind,token);
   if(expected!==version.current)return;
   setEntries(history);setSyncWarning('');void loadReactions(history);
  }catch(e){
   if(expected!==version.current)return;
   const message=e instanceof Error?e.message:'Não foi possível carregar as mensagens.';
   if(quiet)setSyncWarning('A sincronização falhou. As mensagens podem estar desatualizadas.');
   else setError(message);
  }finally{
   reading.current=false;
   if(!quiet&&expected===version.current)setLoading(false);
  }
 },[teamId,kind,token]);
 useFocusEffect(useCallback(()=>{
  const current=++version.current;
  setEntries([]);setDraft('');setError('');setSyncWarning('');setReplyTo(null);setEditingId(null);
  searchVersion.current++;setSearchTerm('');setSearchResults([]);setSearchActive(false);
  reactionVersion.current++;setReactions({});
  void refresh(false,current);
  const timer=setInterval(()=>{
   if(AppState.currentState==='active')void refresh(true,current);
  },10000);
  const resume=AppState.addEventListener('change',state=>{
   if(state==='active')void refresh(true,current);
  });
  return()=>{clearInterval(timer);resume.remove();version.current++;searchVersion.current++;reactionVersion.current++;};
 },[refresh]));
 const send=async()=>{
  const message=draft.trim();
  if(!message||sendingNow.current||!token)return;
  sendingNow.current=true;setSending(true);setError('');
  const current=version.current;
  try{
   const saved=await sendTeamContent(teamId,kind,message,token,replyTo);
   if(current!==version.current)return;
   setEntries(previous=>previous.some(item=>item.id===saved.id)?previous:[...previous,saved].sort((a,b)=>a.id-b.id));
   setDraft(previous=>previous===draft?'':previous);setReplyTo(null);
  }catch(e){
   if(current===version.current)
    setError((e instanceof Error?e.message:'Envio não confirmado.')+
      ' Consulta o histórico antes de repetires a operação.');
  }finally{
   sendingNow.current=false;
   if(current===version.current){setSending(false);void refresh(true,current);}
  }
 };
 const search=async()=>{
  const term=searchTerm.trim();
  if(term.length<2||term.length>80||searching)return;
  const current=++searchVersion.current;
  setSearchActive(true);setSearching(true);setError('');
  try{
   const results=await searchTeamContent(teamId,kind,term,token);
   if(current===searchVersion.current){setSearchResults(results);void loadReactions(results);}
  }catch{
   if(current===searchVersion.current)setError('Não foi possível pesquisar as mensagens.');
  }finally{
   if(current===searchVersion.current)setSearching(false);
  }
 };
 const clearSearch=()=>{
  searchVersion.current++;setSearchActive(false);setSearching(false);setSearchResults([]);
 };
 const react=async(item:TeamContentEntry,emoji:string)=>{
  if(item.deleted||reactionBusyId!==null)return;
  setReactionBusyId(item.id);setError('');
  const current=version.current;
  try{
   if(reactions[item.id]?.mine===emoji)
    await removeTeamReaction(teamId,kind,item.id,token);
   else await setTeamReaction(teamId,kind,item.id,emoji,token);
  }catch{
   if(current===version.current)setError('Reação não confirmada. Consulta o histórico antes de repetir.');
  }finally{
   if(current===version.current){setReactionBusyId(null);void loadReactions([item]);}
  }
 };
 const update=async()=>{
  const body=editDraft.trim();
  if(!editingId||!body||sendingNow.current)return;
  sendingNow.current=true;setSending(true);setError('');
  const current=version.current;
  try{
   const updated=await editTeamContent(teamId,kind,editingId,body,token);
   if(current===version.current){
    setEntries(previous=>previous.map(item=>item.id===updated.id?updated:item));
    setEditingId(null);setEditDraft('');
   }
  }catch(e){
   if(current===version.current)setError('Edição não confirmada. Consulta o histórico antes de repetir.');
  }finally{
   sendingNow.current=false;setSending(false);
   if(current===version.current)void refresh(true,current);
  }
 };
 const remove=(item:TeamContentEntry)=>{
  if(sendingNow.current||!item.canManage||item.deleted)return;
  Alert.alert('Eliminar conteúdo','Queres eliminar esta mensagem da equipa?',[
   {text:'Cancelar',style:'cancel'},
   {text:'Eliminar',style:'destructive',onPress:()=>{void (async()=>{
    sendingNow.current=true;setSending(true);setError('');
    const current=version.current;
    try{
     await deleteTeamContent(teamId,kind,item.id,token);
     if(current===version.current)
      setEntries(previous=>previous.map(entry=>entry.id===item.id?{...entry,body:'',deleted:true}:entry));
    }catch{
     if(current===version.current)setError('Eliminação não confirmada. Consulta o histórico antes de repetir.');
    }finally{
     sendingNow.current=false;setSending(false);
     if(current===version.current)void refresh(true,current);
    }
   })();}}
  ]);
 };
 return <View style={styles.panel}>
  <Text style={styles.title}>{kind==='chat'?'Conversa da equipa':'Publicações da equipa'}</Text>
  <Text style={styles.sub}>Apenas o responsável e membros confirmados podem participar.</Text>
  <View style={styles.searchRow}>
   <TextInput style={styles.searchInput} value={searchTerm} onChangeText={setSearchTerm}
    maxLength={80} placeholder="Pesquisar nesta conversa…" placeholderTextColor={C.muted}
    accessibilityLabel="Pesquisar mensagens da equipa"/>
   <Pressable disabled={searching||searchTerm.trim().length<2} onPress={()=>void search()}
    style={styles.searchButton}><Text style={styles.actionText}>Pesquisar</Text></Pressable>
   {searchActive?<Pressable onPress={clearSearch} style={styles.searchButton}>
    <Text style={styles.actionText}>Voltar</Text></Pressable>:null}
  </View>
  {searchActive?<Text style={styles.sub}>{searching?'A pesquisar…':searchResults.length+' resultados encontrados'}</Text>:null}
  {loading&&!searchActive?<Text style={styles.sub}>A carregar…</Text>:null}
  {error?<Text style={styles.error} accessibilityRole="alert">{error}</Text>:null}
  {syncWarning?<Text style={styles.sub}>{syncWarning}</Text>:null}
  {!searchActive&&!loading&&!entries.length?<Text style={styles.empty}>
   {kind==='chat'?'Ainda não existem mensagens. Começa a conversa!':'Ainda não há publicações nesta equipa.'}
  </Text>:null}
  {(searchActive?searchResults:entries).map(item=><View key={item.id} style={[styles.entry,item.username===username&&styles.ownEntry]}>
   <Text style={styles.author}>@{item.username} · {new Date(item.createdAt).toLocaleString('pt-PT')}</Text>
   {item.replyToId?<Text style={styles.sub}>↳ Resposta à mensagem #{item.replyToId}</Text>:null}
   <Text style={styles.body}>{item.deleted?'Mensagem eliminada':item.body}</Text>
   {item.editedAt&&!item.deleted?<Text style={styles.sub}>Editada</Text>:null}
   {!item.deleted?<View style={styles.reactionRow}>
    {emojis.map(emoji=><Pressable key={emoji} accessibilityRole="button"
      accessibilityLabel={'Reagir com '+emoji}
      accessibilityState={{selected:reactions[item.id]?.mine===emoji,disabled:reactionBusyId===item.id}}
      disabled={reactionBusyId===item.id} onPress={()=>void react(item,emoji)}
      style={[styles.reactionButton,reactions[item.id]?.mine===emoji&&styles.reactionSelected]}>
      <Text style={styles.reactionLabel}>{emoji} {reactions[item.id]?.counts?.[emoji]||''}</Text>
    </Pressable>)}
   </View>:null}
   {!item.deleted?<View style={styles.actions}>
    <Pressable disabled={sending} onPress={()=>setReplyTo(item.id)}><Text style={styles.actionText}>Responder</Text></Pressable>
    {item.canEdit?<Pressable disabled={sending} onPress={()=>{setEditingId(item.id);setEditDraft(item.body);}}><Text style={styles.actionText}>Editar</Text></Pressable>:null}
    {item.canManage?<Pressable disabled={sending} onPress={()=>remove(item)}><Text style={styles.actionText}>Eliminar</Text></Pressable>:null}
   </View>:null}
   {editingId===item.id?<View style={styles.editBox}>
    <TextInput multiline maxLength={2000} style={styles.input} value={editDraft} onChangeText={setEditDraft} editable={!sending} accessibilityLabel="Editar mensagem"/>
    <Pressable disabled={sending||!editDraft.trim()} onPress={()=>void update()}><Text style={styles.actionText}>Guardar alteração</Text></Pressable>
    <Pressable onPress={()=>setEditingId(null)}><Text style={styles.actionText}>Cancelar</Text></Pressable>
   </View>:null}
  </View>)}
  {replyTo?<View style={styles.actions}><Text style={styles.sub}>A responder à mensagem #{replyTo}</Text>
   <Pressable onPress={()=>setReplyTo(null)}><Text style={styles.actionText}>Cancelar</Text></Pressable></View>:null}
  <TextInput multiline style={styles.input} value={draft} onChangeText={setDraft}
   maxLength={2000} placeholder={kind==='chat'?'Escreve uma mensagem…':'Partilha uma novidade com o plantel…'}
   placeholderTextColor={C.muted} editable={!sending} accessibilityLabel="Texto da mensagem"/>
  <Pressable accessibilityRole="button" accessibilityState={{disabled:sending||!draft.trim()}}
   disabled={sending||!draft.trim()} onPress={()=>void send()} style={styles.button}>
   <Text style={styles.buttonText}>{sending?'A enviar…':kind==='chat'?'Enviar mensagem':'Publicar'}</Text>
  </Pressable>
 </View>;
}
const styles=StyleSheet.create({
 panel:{borderColor:C.border,borderWidth:1,borderRadius:16,padding:15,gap:10,backgroundColor:C.surface},
 title:{fontSize:18,color:C.white,fontWeight:'800'},sub:{fontSize:12,color:C.muted,lineHeight:18},
 empty:{padding:18,textAlign:'center',color:C.muted},error:{color:C.danger,fontSize:12},
 entry:{borderWidth:1,borderColor:C.border,borderRadius:11,padding:11,gap:5},
 ownEntry:{backgroundColor:'#103B43'},author:{fontSize:11,fontWeight:'800',color:C.mint},
 body:{fontSize:14,lineHeight:20,color:C.white},
 input:{minHeight:78,borderWidth:1,borderColor:C.border,borderRadius:11,padding:10,color:C.white,textAlignVertical:'top'},
 button:{backgroundColor:C.mint,borderRadius:11,padding:12,alignItems:'center'},
 buttonText:{color:'#062A30',fontWeight:'800'},
 actions:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:14,paddingTop:6},
 actionText:{color:C.mint,fontSize:12,fontWeight:'800'},
 editBox:{gap:10},
 searchRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
 searchInput:{flexGrow:1,flexBasis:160,minWidth:0,borderWidth:1,borderColor:C.border,borderRadius:10,padding:9,color:C.white},
 searchButton:{padding:8,borderWidth:1,borderColor:C.border,borderRadius:9},
 reactionRow:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:6},
 reactionButton:{borderWidth:1,borderColor:C.border,borderRadius:20,paddingHorizontal:9,paddingVertical:6},
 reactionSelected:{borderColor:C.mint,backgroundColor:'#104D50'},
 reactionLabel:{color:C.white,fontSize:12}
});