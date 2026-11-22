import React,{useCallback,useRef,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {FriendPicker} from '../../src/components/FriendPicker';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import {myGroups,createGroup} from '../../src/lib/private-groups-api';
import {membersLabel,validateGroupTitle,validateInvitees,MAX_MEMBERS,type PrivateGroup} from '../../src/lib/private-groups-core.cjs';

export default function GroupsScreen(){
 const auth=useAuth(),router=useRouter();
 const [groups,setGroups]=useState<PrivateGroup[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [creating,setCreating]=useState(false),[title,setTitle]=useState(''),[picked,setPicked]=useState<string[]>([]);
 const [busy,setBusy]=useState(false),[formError,setFormError]=useState('');
 const generation=useRef(0),inFlight=useRef(false);
 const load=useCallback(async()=>{
  const id=++generation.current;setError('');
  if(!auth.token){setGroups([]);setLoading(false);return;}
  setLoading(true);
  try{const list=await myGroups(auth.token);if(id===generation.current)setGroups(list);}
  catch{if(id===generation.current)setError(t('Não foi possível carregar os grupos.'));}
  finally{if(id===generation.current)setLoading(false);}
 },[auth.token]);
 useFocusEffect(useCallback(()=>{void load();return()=>{generation.current++;};},[load]));
 async function create(){
  if(inFlight.current||!auth.token||!auth.username)return;
  try{validateGroupTitle(title);validateInvitees(picked,auth.username,1);}
  catch(e){setFormError(e instanceof Error?e.message:t('Confirma os dados.'));return;}
  inFlight.current=true;setBusy(true);setFormError('');
  try{
   const g=await createGroup(title,picked,auth.username,auth.token);
   setCreating(false);setTitle('');setPicked([]);
   router.push({pathname:'/groups/[id]',params:{id:String(g.id),title:g.title}});
  }catch(e){setFormError((e instanceof Error?e.message:'')+' '+t('Não foi possível criar o grupo. Verifica as amizades e confirma a lista de grupos antes de tentar de novo.'));void load();}
  finally{inFlight.current=false;setBusy(false);}
 }
 return <Page>
  <Eyebrow>{t('CONVERSAS PRIVADAS')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.heading}>{t('Conversas de grupo')}</Text>
  <Text style={styles.sub}>{t('Conversa com os teus amigos num espaço privado, fora das comunidades.')}</Text>
  {!auth.token?<Button title={t('Iniciar sessão')} onPress={()=>router.push({pathname:'/login',params:{redirect:'/groups'}})}/>:null}
  {auth.token&&!creating?<Button title={t('＋ Criar grupo')} onPress={()=>{setCreating(true);setFormError('');}}/>:null}
  {auth.token&&creating?<View style={styles.panel}>
   <Text style={styles.panelTitle}>{t('Criar grupo')}</Text>
   <Text style={styles.sub}>{t('Cria um espaço só vosso para combinar jogos e conversar. Até {a} pessoas, contigo incluído.',{a:MAX_MEMBERS})}</Text>
   <Text style={styles.label}>{t('Nome do grupo')}</Text>
   <TextInput value={title} onChangeText={v=>{setTitle(v);setFormError('');}} maxLength={90} editable={!busy}
    placeholder={t('Ex.: Futebol de sábado')} placeholderTextColor={C.muted} style={styles.input} accessibilityLabel={t('Nome do grupo')}/>
   <FriendPicker token={auth.token} group={null} selected={picked} onChange={setPicked} disabled={busy} max={MAX_MEMBERS-1}/>
   {formError?<Message tone="error">{formError}</Message>:null}
   <Button title={busy?t('A criar…'):t('Criar grupo')} disabled={busy||title.trim().length<2||!picked.length} onPress={()=>{void create();}}/>
   <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>{setCreating(false);setFormError('');}}/>
  </View>:null}
  {loading?<Loader/>:null}
  {error?<><Message tone="error">{error}</Message><Button secondary title={t('Tentar novamente')} onPress={()=>{void load();}}/></>:null}
  {!loading&&!error&&auth.token&&!groups.length?<Message>{t('Ainda não tens grupos. Cria o primeiro!')}</Message>:null}
  {groups.map(g=><Pressable key={g.id} accessibilityRole="button" accessibilityLabel={t('Abrir grupo {v}',{v:g.title})}
   onPress={()=>router.push({pathname:'/groups/[id]',params:{id:String(g.id),title:g.title}})} style={styles.card}>
   <View style={styles.avatar}>{g.photoUrl?<Image source={{uri:g.photoUrl}} style={styles.avatarImg}/>:<Text style={{fontSize:22}}>👥</Text>}</View>
   <View style={{flex:1,gap:2}}><Text style={styles.name} numberOfLines={1}>{g.title}</Text>
    <Text style={styles.sub} numberOfLines={1}>{membersLabel(g.members.length)}{g.creatorUsername.toLowerCase()===String(auth.username).toLowerCase()?' · '+t('criaste este grupo'):''}</Text></View>
   <Text maxFontSizeMultiplier={1.3} style={styles.arrow}>›</Text>
  </Pressable>)}
 </Page>;
}
const styles=StyleSheet.create({
 heading:{color:C.white,fontSize:28,fontWeight:'900'},sub:{color:C.muted,fontSize:14,lineHeight:20},
 panel:{gap:10,padding:16,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:'#0D2A35'},
 panelTitle:{color:C.white,fontSize:19,fontWeight:'900'},label:{color:C.white,fontWeight:'800',fontSize:14},
 input:{minHeight:48,borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:12,color:C.white,backgroundColor:C.surface},
 card:{flexDirection:'row',alignItems:'center',gap:12,padding:12,minHeight:72,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 avatar:{width:48,height:48,borderRadius:24,backgroundColor:'#124B48',alignItems:'center',justifyContent:'center',overflow:'hidden'},
 avatarImg:{width:48,height:48},name:{color:C.white,fontSize:16,fontWeight:'800'},arrow:{color:C.mint,fontSize:26,fontWeight:'700'}
});
