import React,{useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {JynloIcon} from './JynloIcon';
import {C} from '../lib/theme';
import {chatMessageContext,searchChatMessages} from '../lib/chat-search-api';
import type {ChatSearchHit} from '../lib/chat-search-api';
import type {ChatReactionKind} from '../lib/chat-reactions-api';

export default function ChatSearchPanel({kind,conversationId,token,enabled=true}:{
 kind:ChatReactionKind;conversationId:string;token:string|null|undefined;enabled?:boolean;
}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[searched,setSearched]=useState('');
 const [hits,setHits]=useState<ChatSearchHit[]>([]),[context,setContext]=useState<ChatSearchHit[]>([]);
 const [selected,setSelected]=useState<number|null>(null),[hasMore,setHasMore]=useState(false),[page,setPage]=useState(0);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),working=useRef(false);
 const identity=kind+'|'+conversationId+'|'+(token||'');
 useEffect(()=>{
  generation.current++;working.current=false;
  setOpen(false);setQuery('');setSearched('');setHits([]);setContext([]);setSelected(null);setHasMore(false);setPage(0);setBusy(false);setError('');
 },[identity]);
 useEffect(()=>()=>{generation.current++;},[]);
 const run=async(nextPage:number,term:string)=>{
  if(!enabled||!token||working.current)return;
  const normalized=term.trim();
  if(normalized.length<2||normalized.length>80){setError('Escreve entre 2 e 80 caracteres.');return;}
  working.current=true;setBusy(true);setError('');
  const version=++generation.current;
  try{
   const response=await searchChatMessages(kind,conversationId,normalized,nextPage,token);
   if(version!==generation.current)return;
   setSearched(normalized);setPage(response.page);setHasMore(response.hasMore);
   setHits(previous=>nextPage===0?response.results:[
    ...previous,...response.results.filter(hit=>!previous.some(old=>old.id===hit.id))
   ]);
   if(nextPage===0){setSelected(null);setContext([]);}
  }catch(e){
   if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível pesquisar mensagens.');
  }finally{
   if(version===generation.current){setBusy(false);working.current=false;}
  }
 };
 const viewContext=async(messageId:number)=>{
  if(!enabled||!token||working.current)return;
  working.current=true;setBusy(true);setError('');
  const version=++generation.current;
  try{
   const around=await chatMessageContext(kind,conversationId,messageId,token);
   if(version!==generation.current)return;
   setSelected(messageId);setContext(around);
  }catch(e){
   if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível abrir a mensagem.');
  }finally{
   if(version===generation.current){setBusy(false);working.current=false;}
  }
 };
 if(!token||!enabled)return null;
 return <View style={styles.wrap}>
  <Pressable accessibilityRole="button" accessibilityLabel={open?'Fechar pesquisa de mensagens':'Pesquisar mensagens'}
   accessibilityState={{expanded:open}} onPress={()=>{generation.current++;working.current=false;setOpen(v=>!v);setBusy(false);setError('');}}
   style={[styles.toggle,open&&styles.toggleOpen]}><JynloIcon name="search" size={20} color={C.mint}/>{open?<Text style={styles.toggleText}>Fechar pesquisa</Text>:null}</Pressable>
  {open?<View style={styles.body}>
   <View style={styles.searchLine}>
    <TextInput value={query} onChangeText={setQuery} maxLength={80} editable={!busy} style={styles.input}
      placeholder="Pesquisar nesta conversa…" placeholderTextColor={C.muted}
      accessibilityLabel="Termo a pesquisar no chat" returnKeyType="search" onSubmitEditing={()=>{void run(0,query);}}/>
    <Pressable accessibilityRole="button" accessibilityLabel="Iniciar pesquisa" disabled={busy||query.trim().length<2}
     onPress={()=>{void run(0,query);}} style={styles.action}>
     <JynloIcon name="search" size={21} color={C.background}/>
    </Pressable>
   </View>
   {error?<Text style={styles.error}>{error}</Text>:null}
   {busy?<Text style={styles.note}>A consultar mensagens…</Text>:null}
   {!busy&&searched&&hits.length===0?<Text style={styles.note}>Não foram encontradas mensagens.</Text>:null}
   {hits.length>0?<ScrollView style={styles.results} nestedScrollEnabled keyboardShouldPersistTaps="handled">
    {hits.map(hit=><Pressable key={hit.id} accessibilityRole="button" accessibilityLabel={'Ver contexto da mensagem de '+hit.sender}
      onPress={()=>{void viewContext(hit.id);}} style={[styles.hit,selected===hit.id&&styles.selected]}>
      <Text style={styles.sender}>{hit.sender}</Text>
      <Text style={styles.message} numberOfLines={3}>{hit.text||'Mensagem com anexo'}</Text>
     </Pressable>)}
   </ScrollView>:null}
   {hasMore&&!busy?<Pressable accessibilityRole="button" accessibilityLabel="Carregar mais resultados"
     onPress={()=>{void run(page+1,searched);}} style={styles.more}><Text style={styles.moreText}>Ver mais resultados</Text></Pressable>:null}
   {selected!==null&&context.length>0?<View style={styles.context}>
    <View style={styles.contextHeader}><Text style={styles.heading}>Contexto da mensagem</Text>
     <Pressable accessibilityRole="button" accessibilityLabel="Fechar contexto" onPress={()=>{setSelected(null);setContext([]);}}>
      <JynloIcon name="close" size={20} color={C.mint}/>
     </Pressable>
    </View>
    <ScrollView style={styles.contextScroll} nestedScrollEnabled>
    {context.map(hit=><View key={hit.id} style={[styles.hit,hit.id===selected&&styles.selected]}>
     <Text style={styles.sender}>{hit.sender}</Text>
     <Text style={styles.message}>{hit.text||'Mensagem com anexo'}</Text>
    </View>)}
    </ScrollView>
   </View>:null}
  </View>:null}
 </View>;
}
const styles=StyleSheet.create({
 wrap:{gap:8,alignSelf:'stretch'},toggle:{width:44,minHeight:44,flexDirection:'row',alignItems:'center',gap:7},
 toggleOpen:{width:'auto',paddingRight:10},toggleText:{color:C.mint,fontSize:12,fontWeight:'800'},body:{gap:9,padding:10,backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:14},
 searchLine:{flexDirection:'row',alignItems:'center',gap:7},input:{flex:1,minHeight:44,borderWidth:1,borderColor:C.border,borderRadius:10,paddingHorizontal:12,color:C.white,fontSize:14},
 action:{width:44,height:44,borderRadius:11,backgroundColor:C.mint,justifyContent:'center',alignItems:'center'},
 error:{color:C.danger,fontSize:12},note:{color:C.muted,fontSize:12},
 results:{maxHeight:205},hit:{paddingVertical:8,paddingHorizontal:9,borderBottomWidth:1,borderBottomColor:C.border,gap:3},
 selected:{backgroundColor:C.surface2,borderRadius:8},sender:{fontSize:12,fontWeight:'800',color:C.mint},
 message:{fontSize:13,color:C.white},more:{padding:10,alignItems:'center'},moreText:{color:C.mint,fontSize:13,fontWeight:'700'},
 context:{gap:7},contextHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 heading:{color:C.white,fontWeight:'800',fontSize:13},contextScroll:{maxHeight:200}
});
