import React,{useEffect,useRef,useState} from 'react';
import {Share,StyleSheet,Switch,Text,View} from 'react-native';
import {Button} from './UI';
import {publicShareSetting,updatePublicShare,type PublicShareSetting,type PublicShareTarget} from '../lib/public-share-api';
import {publicShareUrl,shareMessage} from '../lib/public-share-core.cjs';
import {C} from '../lib/theme';

/** Public page link: Owner/Admin turns it on; then any member can share it (WhatsApp, etc.). */
export function PublicShareCard({target,name,token,canManage}:{target:PublicShareTarget;name:string;token:string;canManage:boolean}){
 const [setting,setSetting]=useState<PublicShareSetting|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const key=target.kind+':'+target.communityId+':'+(target.kind==='TOURNAMENT'?target.tournamentId:'');
 const current=useRef(key);
 useEffect(()=>{
  current.current=key;setSetting(null);setError('');
  if(!token)return;
  publicShareSetting(target,token).then(s=>{if(current.current===key)setSetting(s);}).catch(()=>{if(current.current===key)setSetting(null);});
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,token]);
 if(!setting||(!setting.enabled&&!canManage))return null;
 const isTournament=target.kind==='TOURNAMENT';
 async function toggle(enabled:boolean){
  if(busy)return;
  setBusy(true);setError('');
  try{const next=await updatePublicShare(target,enabled,token);if(current.current===key)setSetting(next);}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar.');}
  finally{setBusy(false);}
 }
 async function share(){
  try{
   const url=publicShareUrl(setting!.path);
   await Share.share({message:shareMessage(target.kind,name,url),url});
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível partilhar.');}
 }
 return <View style={styles.card}>
  <View style={styles.row}>
   <View style={{flex:1,gap:4}}>
    <Text style={styles.title}>🔗 {isTournament?'Página pública do torneio':'Classificação pública'}</Text>
    <Text style={styles.meta}>{setting.enabled
     ?'Qualquer pessoa com a ligação vê '+(isTournament?'a classificação e os jogos':'a tabela da época')+', sem conta. Só aparecem alcunhas ou nomes de utilizador.'
     :'Desligada. Ativa para partilhar '+(isTournament?'o torneio':'a tabela')+' com quem não está na Jynlo.'}</Text>
   </View>
   {canManage?<Switch value={setting.enabled} disabled={busy} onValueChange={v=>{void toggle(v);}}
    accessibilityLabel={isTournament?'Página pública do torneio':'Classificação pública'}/>:null}
  </View>
  {setting.enabled?<Button title="Partilhar ligação" disabled={busy} onPress={()=>{void share();}}/>:null}
  {error?<Text style={styles.error}>{error}</Text>:null}
 </View>;
}
const styles=StyleSheet.create({
 card:{gap:10,padding:15,borderRadius:18,borderWidth:1,borderColor:'#3DC4B04D',backgroundColor:'#082B3A'},
 row:{flexDirection:'row',alignItems:'center',gap:10},
 title:{color:C.white,fontSize:15,fontWeight:'900'},meta:{color:'#ACCAD2',fontSize:12,lineHeight:17},
 error:{color:C.danger,fontSize:12}
});
