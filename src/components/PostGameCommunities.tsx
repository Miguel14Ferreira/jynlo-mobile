import React,{useEffect,useState} from 'react';
import {t} from '../lib/i18n';
import {StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Button,Message} from './UI';
import {C} from '../lib/theme';
import {ApiError} from '../lib/api';
import {postGameCommunities,joinAfterGame,wasDismissed,dismiss,type PostGameCommunity} from '../lib/post-game-communities-api';

/** After a completed game, players marked present can join the communities that organised it. Optional. */
export function PostGameCommunities({sessionId,token,username}:{sessionId:number;token:string;username:string}){
 const router=useRouter();
 const [groups,setGroups]=useState<PostGameCommunity[]>([]);
 const [busy,setBusy]=useState<number|null>(null);
 const [notice,setNotice]=useState<{text:string;communityId?:number}|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;
  postGameCommunities(sessionId,token).then(async list=>{
   const keep:PostGameCommunity[]=[];
   for(const g of list)if(!(await wasDismissed(username,g.id)))keep.push(g);
   if(live)setGroups(keep);
  }).catch(()=>{if(live)setGroups([]);}); // Not eligible: show nothing, no red error.
  return()=>{live=false;};
 },[sessionId,token,username]);
 async function join(g:PostGameCommunity){
  if(busy!==null)return;
  setBusy(g.id);setError('');setNotice(null);
  try{
   const state=await joinAfterGame(sessionId,g.id,token);
   setGroups(prev=>prev.filter(x=>x.id!==g.id));
   setNotice(state==='REQUESTED'?{text:t('Pedido enviado. A comunidade decidirá sobre a adesão.')}
    :{text:t('Já fazes parte da comunidade! Descobre os próximos jogos.'),communityId:g.id});
  }catch(e){
   if(e instanceof ApiError&&(e.status===403||e.status===409))setGroups(prev=>prev.filter(x=>x.id!==g.id));
   setError(t('Não foi possível concluir a adesão. Tenta novamente.'));
  }finally{setBusy(null);}
 }
 if(!groups.length&&!notice&&!error)return null;
 return <View style={styles.panel}>
  {groups.length?<>
   <Text style={styles.kicker}>{t('DEPOIS DO JOGO')}</Text>
   <Text style={styles.title}>{t('Gostaste de jogar com esta malta?')}</Text>
   <Text style={styles.help}>{t('Se quiseres, junta-te às comunidades que organizaram este jogo e descobre as próximas sessões. É totalmente opcional.')}</Text>
   {groups.map(g=><View key={g.id} style={styles.option}>
    <Text style={styles.name}>{g.name}</Text>
    <Text style={styles.help}>{g.requiresApproval?t('A adesão requer aprovação de um administrador.'):t('Comunidade aberta a novos membros.')}</Text>
    <Button title={busy===g.id?t('A enviar…'):g.requiresApproval?t('Pedir para aderir'):t('Juntar-me à comunidade')} disabled={busy!==null} onPress={()=>{void join(g);}}/>
    <Button secondary title={t('Agora não')} disabled={busy!==null} onPress={()=>{void dismiss(username,g.id);setGroups(prev=>prev.filter(x=>x.id!==g.id));}}/>
   </View>)}
  </>:null}
  {notice?<Message>{notice.text}</Message>:null}
  {notice?.communityId?<Button secondary title={t('Abrir comunidade')} onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(notice.communityId)}})}/>:null}
  {error?<Message tone="error">{error}</Message>:null}
 </View>;
}
const styles=StyleSheet.create({
 panel:{gap:10,padding:16,borderRadius:18,borderWidth:1,borderColor:C.mint,backgroundColor:'#0D2A35'},
 kicker:{color:C.mint,fontSize:12,fontWeight:'900',letterSpacing:1.2},
 title:{color:C.white,fontSize:20,fontWeight:'900'},help:{color:C.muted,fontSize:14,lineHeight:20},
 option:{gap:8,padding:12,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 name:{color:C.white,fontSize:16,fontWeight:'800'}
});
