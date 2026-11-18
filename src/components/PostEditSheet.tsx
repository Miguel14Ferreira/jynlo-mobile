import React,{useEffect,useRef,useState} from 'react';
import {Alert,Image,Keyboard,KeyboardAvoidingView,Modal,Platform,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {ScrollViewInstance} from 'react-native';
import type {FeedItem,MobileMedia} from '../lib/types';
import {editPost,replacePostMedia} from '../lib/social-feed-api';
import {pickerMediaMime} from '../lib/picker-media-format.cjs';
import {albumError} from '../lib/post-album.cjs';
import {postMediaItems} from '../lib/post-album.cjs';
import {MobileTheme} from '../lib/theme';
import {CloseIconButton} from './CloseIconButton';

const C=MobileTheme.colors;
type Props={
 post:FeedItem|null;
 token:string|null;
 username:string|null;
 onClose:()=>void;
 onSaved:(updated:FeedItem,mediaReplaced:boolean)=>void;
};
/** Update the post's text/location without re-uploading or replacing existing media. */
export default function PostEditSheet({post,token,username,onClose,onSaved}:Props){
 const [text,setText]=useState('');
 const [location,setLocation]=useState('');
 const [replacementMedia,setReplacementMedia]=useState<MobileMedia[]>([]);
 const [picking,setPicking]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const lock=useRef(false);
 const editorScrollRef=useRef<ScrollViewInstance|null>(null);
 const generation=useRef(0);
 const currentIdentity=post&&token&&username&&post.authorUsername.toLowerCase()===username.toLowerCase()?
   String(post.postId)+'|'+username.toLowerCase()+'|'+token:null;
 useEffect(()=>{
   generation.current++;
   lock.current=false;setBusy(false);setError('');
   setText(post?.content||'');setLocation(post?.location||'');setReplacementMedia([]);setPicking(false);
   return ()=>{generation.current++;};
 },[post?.postId,token,username]);
 const visible=Boolean(currentIdentity&&post?.type==='POST'&&Number.isSafeInteger(post?.postId)&&(post?.postId??0)>0);
 const replacing=replacementMedia.length>0;
 const changed=Boolean(post&&(text.trim()!==(post.content||'').trim()||location.trim()!==(post.location||'').trim()||replacing));
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
     Alert.alert('Descartar alterações?','As alterações à publicação e aos ficheiros selecionados serão perdidas.',[
       {text:'Continuar a editar',style:'cancel'},
       {text:'Descartar',style:'destructive',onPress:onClose}
     ]);
   }else onClose();
 }
 async function pickReplacement(){
   if(!visible||busy||picking||!token)return;
   const version=generation.current,identity=currentIdentity;
   setPicking(true);setError('');
   try{
     const picker=await import('expo-image-picker');
     const selected=await picker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:.86,
       allowsMultipleSelection:true,selectionLimit:6});
     if(version!==generation.current||identity!==currentIdentity||selected.canceled)return;
     const files:MobileMedia[]=[];
     for(const asset of selected.assets){
       const mime=pickerMediaMime(asset);
       if(!mime)throw Error('Formato não suportado. Escolhe JPG, PNG, WebP, MP4 ou WebM.');
       const kind=asset.type==='video'?'video':'image';
       let size=asset.fileSize||0;
       if(size===0){try{const {File}=await import('expo-file-system');const source=new File(asset.uri);if(source.exists)size=source.size;}catch{}}
       files.push({uri:asset.uri,type:kind,mimeType:mime,
        fileName:asset.fileName||'media.'+(kind==='video'?'mp4':'jpg'),fileSize:size});
     }
     const validation=albumError(files,true);
     if(validation)throw Error(validation);
     if(version===generation.current&&identity===currentIdentity)setReplacementMedia(files);
   }catch(e){if(version===generation.current&&identity===currentIdentity)
     setError(e instanceof Error?e.message:'Não foi possível escolher fotografias ou vídeos.');}
   finally{if(version===generation.current)setPicking(false);}
 }
 async function save(){
   if(replacing){
     Alert.alert('Substituir multimédia?','As fotografias e vídeos atuais serão substituídos pelos novos. Os gostos e comentários mantêm-se.',[
       {text:'Manter os ficheiros atuais',style:'cancel'},
       {text:'Substituir',style:'destructive',onPress:()=>{void persist();}}
     ]);
     return;
   }
   await persist();
 }
 async function persist(){
   if(!visible||!post||!token||!username||lock.current||!changed)return;
   const initialIdentity=currentIdentity,version=generation.current;
   if(!text.trim()&&!replacing&&postMediaItems(post).length===0){
     setError('Uma publicação sem fotografias ou vídeos precisa de uma descrição.');return;
   }
   lock.current=true;setBusy(true);setError('');
   try{
     const result=replacing
      ?await replacePostMedia(post.postId!,replacementMedia,text,location,token,username)
      :await editPost(post.postId!,text,location,token,username);
     if(version===generation.current&&currentIdentity===initialIdentity)onSaved(result,replacing);
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
    <Text style={styles.hint}>Podes alterar a descrição e localização. Para trocar fotografias ou vídeos, escolhe novos ficheiros e confirma a substituição.</Text>
    <Text style={styles.label}>Descrição (opcional com fotografias ou vídeos)</Text>
    <TextInput onFocus={event=>editorScrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(event.target!,28,true)} accessibilityLabel="Editar descrição da publicação" multiline maxLength={1000}
     value={text} onChangeText={setText} editable={!busy} placeholder="O que queres partilhar?"
     placeholderTextColor={C.muted} style={[styles.input,styles.description]}/>
    <Text style={styles.counter}>{text.length}/1000</Text>
    <Text style={styles.label}>Localização opcional</Text>
    <TextInput onFocus={event=>editorScrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(event.target!,28,true)} accessibilityLabel="Editar localização da publicação" maxLength={160} editable={!busy}
     value={location} onChangeText={setLocation} placeholder="Ex.: Campo do Bairro, Lisboa"
     placeholderTextColor={C.muted} style={styles.input}/>
    <Text style={styles.counter}>{location.length}/160</Text>
    <Text style={styles.label}>Fotografias e vídeos</Text>
    <Text style={styles.hint}>Atualmente: {post?postMediaItems(post).length:0} ficheiro(s). Seleciona entre 1 e 6 novos ficheiros para substituir todos os existentes.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Escolher novas fotografias ou vídeos" disabled={busy||picking}
      onPress={()=>void pickReplacement()} style={styles.mediaButton}>
      <Text style={styles.mediaButtonText}>{picking?'A abrir galeria…':'Escolher novos ficheiros'}</Text>
    </Pressable>
    {replacing?<View style={styles.replacement}>
     <Text style={styles.replacementLabel}>{replacementMedia.length} novo(s) ficheiro(s) selecionado(s)</Text>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaPreviewRow}>
      {replacementMedia.map((file,index)=><View key={file.uri+'-'+index} style={styles.mediaPreview}>
       {file.type==='image'?<Image source={{uri:file.uri}} style={styles.mediaImage} resizeMode="cover"
        accessibilityLabel={'Fotografia nova '+(index+1)}/>:<View style={styles.mediaVideo}>
        <Text style={styles.mediaVideoText}>Vídeo {index+1}</Text></View>}
       <Text style={styles.previewName} numberOfLines={2}>{file.fileName}</Text>
      </View>)}
     </ScrollView>
     <Pressable accessibilityRole="button" accessibilityLabel="Manter fotografias e vídeos atuais" disabled={busy}
       onPress={()=>setReplacementMedia([])} style={styles.mediaButton}>
       <Text style={styles.mediaButtonText}>Manter multimédia atual</Text>
     </Pressable>
    </View>:null}
    {error?<Text style={styles.error}>{error}</Text>:null}
   </ScrollView>
   <Pressable accessibilityRole="button" accessibilityLabel="Guardar alterações da publicação" onPress={()=>void save()}
    disabled={!changed||busy||picking} style={[styles.save,(!changed||busy||picking)&&styles.disabled]}>
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
 saveText:{color:C.background,fontWeight:'900',fontSize:15},disabled:{opacity:.45},
 mediaButton:{minHeight:44,borderRadius:11,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,padding:12,justifyContent:'center'},
 mediaButtonText:{color:C.accent,fontSize:13,fontWeight:'800'},
 replacement:{gap:8,padding:12,borderRadius:12,backgroundColor:C.raised},
 replacementLabel:{color:C.text,fontWeight:'900',fontSize:13},
 mediaPreviewRow:{gap:9,paddingBottom:4},
 mediaPreview:{width:104,gap:5},
 mediaImage:{width:104,height:104,borderRadius:10,backgroundColor:C.surface},
 mediaVideo:{width:104,height:104,borderRadius:10,backgroundColor:C.surface,alignItems:'center',justifyContent:'center'},
 mediaVideoText:{color:C.accent,fontWeight:'900',fontSize:13},
 previewName:{color:C.muted,fontSize:11,lineHeight:16}
});
