import React,{useCallback,useState} from 'react';
import {t} from '../src/lib/i18n';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {request} from '../src/lib/api';
import {C} from '../src/lib/theme';

type BlockedPerson={username:string;fullName?:string|null};

/** Who I blocked, with an unblock button each. */
export default function BlockedPeopleScreen(){
 const router=useRouter(),auth=useAuth();
 const [people,setPeople]=useState<BlockedPerson[]|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState<string|null>(null);
 useFocusEffect(useCallback(()=>{
  let alive=true;setError('');
  if(!auth.token){setPeople([]);return;}
  request<BlockedPerson[]>('/api/blocks/users',{token:auth.token})
   .then(list=>{if(alive)setPeople(Array.isArray(list)?list:[]);})
   .catch(()=>{if(alive){setPeople([]);setError(t('Não foi possível carregar as pessoas bloqueadas.'));}});
  return()=>{alive=false;};
 },[auth.token]));
 async function unblock(p:BlockedPerson){
  if(busy||!auth.token)return;
  setBusy(p.username);setError('');
  try{
   await request('/api/blocks/users/'+encodeURIComponent(p.username),{token:auth.token,method:'DELETE'});
   setPeople(list=>(list||[]).filter(x=>x.username!==p.username));
  }catch{setError(t('Não foi possível desbloquear. Tenta novamente.'));}
  finally{setBusy(null);}
 }
 return <Page>
  <Eyebrow>{t('PRIVACIDADE')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Pessoas bloqueadas')}</Text>
  {error?<Message tone="error">{error}</Message>:null}
  {people===null?<Loader/>:people.length===0&&!error?<Text style={styles.hint}>{t('Não bloqueaste ninguém.')}</Text>:null}
  {(people||[]).map(p=><View key={p.username} style={styles.row}>
   <Pressable accessibilityRole="button" style={{flex:1}} onPress={()=>router.push({pathname:'/social/[username]',params:{username:p.username}})}>
    <Text style={styles.name} numberOfLines={1}>{p.fullName||p.username}</Text>
    <Text style={styles.hint}>@{p.username}</Text>
   </Pressable>
   <Button title={busy===p.username?t('A desbloquear…'):t('Desbloquear')} secondary disabled={!!busy} onPress={()=>{void unblock(p);}}/>
  </View>)}
  <Button title={t('Voltar ao perfil')} secondary onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontSize:28,fontWeight:'900'},
 hint:{color:C.muted,fontSize:13},
 name:{color:C.white,fontSize:16,fontWeight:'800'},
 row:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.border}
});
