import React,{useEffect,useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {t} from '../lib/i18n';
import {C} from '../lib/theme';
import {inviteToSession} from '../lib/api';
import {mySessions} from '../lib/parity-api';
import {inviteCommunityMember,myCommunities} from '../lib/community-api';
import {sportName} from '../lib/sport-names.cjs';
import type {CommunityGroup,SessionSummary} from '../lib/types';

/** "Convidar para jogo" from someone's profile: pick one of my upcoming games or communities. */
export function InviteToGameSheet({visible,onClose,username,token,me}:{visible:boolean;onClose:()=>void;username:string;token:string;me:string}){
 const [games,setGames]=useState<SessionSummary[]|null>(null);
 const [communities,setCommunities]=useState<CommunityGroup[]|null>(null);
 const [busy,setBusy]=useState<string|null>(null),[done,setDone]=useState<Set<string>>(new Set()),[error,setError]=useState('');
 useEffect(()=>{
  if(!visible)return;
  let alive=true;setError('');
  mySessions(token,me).then(r=>{
   if(!alive)return;
   const now=Date.now();
   const all=[...(r?.created??[]),...(r?.joined??[])].filter(s=>Date.parse(s.gameDate)>now&&String(s.status||'OPEN').toUpperCase()==='OPEN');
   setGames([...new Map(all.map(s=>[s.id,s])).values()].sort((a,b)=>Date.parse(a.gameDate)-Date.parse(b.gameDate)).slice(0,10));
  }).catch(()=>{if(alive)setGames([]);});
  myCommunities(token,me).then(r=>{if(alive)setCommunities(r.slice(0,10));}).catch(()=>{if(alive)setCommunities([]);});
  return()=>{alive=false;};
 },[visible,token,me]);
 async function invite(key:string,action:()=>Promise<unknown>){
  if(busy)return;
  setBusy(key);setError('');
  try{await action();setDone(d=>new Set(d).add(key));}
  catch(e){setError(e instanceof Error&&e.message?e.message:t('Não foi possível enviar o convite.'));}
  finally{setBusy(null);}
 }
 const row=(key:string,title:string,sub:string,action:()=>Promise<unknown>)=><View key={key} style={styles.row}>
  <View style={{flex:1,minWidth:0}}><Text style={styles.title} numberOfLines={1}>{title}</Text><Text style={styles.sub} numberOfLines={1}>{sub}</Text></View>
  <Pressable accessibilityRole="button" disabled={!!busy||done.has(key)} onPress={()=>{void invite(key,action);}} style={[styles.btn,done.has(key)&&styles.btnDone]}>
   <Text style={[styles.btnText,done.has(key)&&styles.btnDoneText]}>{done.has(key)?t('Convidado ✓'):busy===key?'…':t('Convidar')}</Text>
  </Pressable>
 </View>;
 return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
  <Pressable style={styles.backdrop} accessibilityLabel={t('Fechar')} onPress={onClose}>
   <Pressable style={styles.sheet} onPress={()=>{}}>
    <Text style={styles.head}>{t('Convidar @{u}',{u:username})}</Text>
    <ScrollView style={{maxHeight:460}} contentContainerStyle={{gap:6}}>
     <Text style={styles.label}>{t('Os teus próximos jogos')}</Text>
     {games===null?<Text style={styles.sub}>{t('A carregar…')}</Text>:games.length===0?<Text style={styles.sub}>{t('Não tens jogos abertos marcados.')}</Text>:
      games.map(g=>row('s'+g.id,sportName(g.sport)+' · '+(g.city||''),new Date(g.gameDate).toLocaleString(undefined,{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}),
       ()=>inviteToSession(g.id,username,token,me)))}
     <Text style={[styles.label,{marginTop:8}]}>{t('As tuas comunidades')}</Text>
     {communities===null?<Text style={styles.sub}>{t('A carregar…')}</Text>:communities.length===0?<Text style={styles.sub}>{t('Ainda não fazes parte de nenhuma comunidade.')}</Text>:
      communities.map(c=>row('c'+c.id,c.name,t('Comunidade'),()=>inviteCommunityMember(c.id,username,token,me)))}
    </ScrollView>
    {error?<Text style={styles.error}>{error}</Text>:null}
    <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><Text style={styles.closeText}>{t('Fechar')}</Text></Pressable>
   </Pressable>
  </Pressable>
 </Modal>;
}

const styles=StyleSheet.create({
 backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'flex-end'},
 sheet:{backgroundColor:'#10283a',borderTopLeftRadius:20,borderTopRightRadius:20,padding:16,paddingBottom:28,gap:10,borderWidth:1,borderColor:'#2c5568'},
 head:{color:C.white,fontSize:18,fontWeight:'900'},label:{color:C.muted,fontSize:12,fontWeight:'800',letterSpacing:.5},
 row:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,borderTopWidth:1,borderTopColor:'#1c3a4a'},
 title:{color:C.white,fontWeight:'800',fontSize:14},sub:{color:C.muted,fontSize:13},
 btn:{minHeight:38,paddingHorizontal:14,borderRadius:19,backgroundColor:C.mint,justifyContent:'center'},btnText:{color:C.background,fontWeight:'800',fontSize:13},
 btnDone:{backgroundColor:'transparent',borderWidth:1,borderColor:C.border},btnDoneText:{color:C.mint},
 error:{color:'#ffb4b4',fontSize:13},close:{minHeight:46,alignItems:'center',justifyContent:'center'},closeText:{color:C.muted,fontWeight:'700'},
});
