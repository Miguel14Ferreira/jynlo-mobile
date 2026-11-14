import React,{useEffect,useRef,useState} from 'react';
import {Alert,Keyboard,KeyboardAvoidingView,Modal,Platform,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {FeedItem} from '../lib/types';
import {editPost} from '../lib/social-feed-api';
import {postMediaItems} from '../lib/post-album.cjs';
import {MobileTheme} from '../lib/theme';
import {CloseIconButton} from './CloseIconButton';

const C=MobileTheme.colors;
type Props={
 post:FeedItem|null;
 token:string|null;
 username:string|null;
 onClose:()=>void;
 onSaved:(updated:FeedItem)=>void;
};
/** Update the post's text/location without re-uploading or replacing existing media. */
export default function PostEditSheet({post,token,username,onClose,onSaved}:Props){
 const [text,setText]=useState('');
 const [location,setLocation]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const lock=useRef(false);
 const editorScrollRef=useRef<ScrollView|null>(null);
 const generation=useRef(0);
 const currentIdentity=post&&token&&username&&post.authorUsername.toLowerCase()===username.toLowerCase()?
   String(post.postId)+'|'+username.toLowerCase()+'|'+token:null;
 useEffect(()=>{
   generation.current++;
   lock.current=false;setBusy(false);setError('');
   setText(post?.content||'');setLocation(post?.location||'');
   return ()=>{generation.current++;};
 },[post?.postId,token,username]);
 const visible=Boolean(currentIdentity&&post?.type==='POST'&&Number.isSafeInteger(post?.postId)&&(post?.postId??0)>0);
 const changed=Boolean(post&&(text.trim()!==(post.content||'').trim()||location.trim()!==(post.location||'').trim()));
 useEffect(()=>{
   if(!visible)return;
   const showEvent=Platform.OS==='ios'?'keyboardWillShow':'keyboardDidShow';
   const subscription=Keyboard.addListener(showEvent,()=>{
     const focused=TextInput.State.currentlyFocusedInput?.();
     if(focused)editorScrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(focused,28,true);
   });
   return()=>subscription.remove();
 },[visible]);
 function close(){
   if(lock.current)return;
   if(changed){
     Alert.alert('Descartar alterações?','As alterações à descrição e localização serão perdidas.',[
       {text:'Continuar a editar',style:'cancel'},
       {text:'Descartar',style:'destructive',onPress:onClose}
     ]);
   }else onClose();
 }
 async function save(){
   if(!visible||!post||!token||!username||lock.current||!changed)return;
   const initialIdentity=currentIdentity,version=generation.current;
   if(!text.trim()&&postMediaItems(post).length===0){
     setError('Uma publicação sem fotografias ou vídeos precisa de uma descrição.');return;
   }
   lock.current=true;setBusy(true);setError('');
   try{
     const result=await editPost(post.postId!,text,location,token,username);
     if(version===generation.current&&currentIdentity===initialIdentity)onSaved(result);
   }catch(e){
     if(version===generation.current&&currentIdentity===initialIdentity){
       setError(e instanceof Error?e.message:'Não foi possível guardar. Confirma a publicação antes de repetir.');
     }
   }finally{
     lock.current=false;
     if(version===generation.current)setBusy(false);
   }
 }
 return <Modal visible={visible} animationType="slide" onRequestClose={close}>
  <SafeAreaView style={styles.screen}>
  <KeyboardAvoidingView style={styles.keyboardFrame} behavior={Platform.OS==='ios'?'padding':'height'}>
   <View style={styles.header}>
    <Text style={styles.heading}>Editar publicação</Text>
    <CloseIconButton onPress={close} label="Fechar edição da publicação" disabled={busy} color={C.text}/>
   </View>
   <ScrollView ref={editorScrollRef} style={{flex:1}} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <Text style={styles.hint}>Podes alterar a descrição ou localização. As fotografias, vídeos, gostos e comentários mantêm-se.</Text>
    <Text style={styles.label}>Descrição (opcional com fotografias ou vídeos)</Text>
    <TextInput onFocus={event=>editorScrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(event.target,28,true)} accessibilityLabel="Editar descrição da publicação" multiline maxLength={1000}
     value={text} onChangeText={setText} editable={!busy} placeholder="O que queres partilhar?"
     placeholderTextColor={C.muted} style={[styles.input,styles.description]}/>
    <Text style={styles.counter}>{text.length}/1000</Text>
    <Text style={styles.label}>Localização opcional</Text>
    <TextInput onFocus={event=>editorScrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(event.target,28,true)} accessibilityLabel="Editar localização da publicação" maxLength={160} editable={!busy}
     value={location} onChangeText={setLocation} placeholder="Ex.: Campo do Bairro, Lisboa"
     placeholderTextColor={C.muted} style={styles.input}/>
    <Text style={styles.counter}>{location.length}/160</Text>
    {error?<Text style={styles.error}>{error}</Text>:null}
   </ScrollView>
   <Pressable accessibilityRole="button" accessibilityLabel="Guardar alterações da publicação" onPress={()=>void save()}
    disabled={!changed||busy} style={[styles.save,(!changed||busy)&&styles.disabled]}>
    <Text style={styles.saveText}>{busy?'A guardar…':'Guardar alterações'}</Text>
   </Pressable>
  </KeyboardAvoidingView>
  </SafeAreaView>
 </Modal>;
}
const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:C.background,padding:18},keyboardFrame:{flex:1,gap:14},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 heading:{color:C.text,fontSize:22,fontWeight:'900'},close:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'},
 closeText:{fontSize:24,fontWeight:'700',color:C.text},
 body:{gap:10,paddingBottom:22},hint:{color:C.muted,fontSize:13,lineHeight:20,marginBottom:12},
 label:{color:C.text,fontSize:13,fontWeight:'800'},input:{color:C.text,backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:14,padding:13,minHeight:52,fontSize:15},
 description:{height:170,textAlignVertical:'top'},counter:{color:C.muted,fontSize:11,textAlign:'right'},
 error:{color:C.danger,fontSize:13,lineHeight:19},
 save:{backgroundColor:C.accent,alignItems:'center',justifyContent:'center',minHeight:54,borderRadius:15,marginBottom:10},
 saveText:{color:C.background,fontWeight:'900',fontSize:15},disabled:{opacity:.45}
});
