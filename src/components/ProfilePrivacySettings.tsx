import React,{useCallback,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {C,MobileTheme} from '../lib/theme';
import {myProfilePrivacy,pendingFollowRequests,updateProfilePrivacy,decideFollowRequest,
 type PendingFollowRequest,type ProfilePrivacyStatus} from '../lib/profile-privacy-api';

export default function ProfilePrivacySettings({token}:{token:string}){
 const [privacy,setPrivacy]=useState<ProfilePrivacyStatus|null>(null);
 const [pending,setPending]=useState<PendingFollowRequest[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useFocusEffect(useCallback(()=>{
   let active=true;
   setPrivacy(null);setPending([]);setError('');setLoading(true);
   void Promise.all([myProfilePrivacy(token),pendingFollowRequests(token)])
    .then(([status,requests])=>{if(active){setPrivacy(status);setPending(requests);}})
    .catch(()=>{if(active)setError('Não foi possível consultar a privacidade.');})
    .finally(()=>{if(active)setLoading(false);});
   return()=>{active=false;};
 },[token]));
 const setPrivate=(value:boolean)=>{
   if(!privacy?.privateModeAvailable||busy)return;
   Alert.alert(value?'Tornar perfil privado?':'Tornar perfil público?',
    value?'Só seguidores aprovados poderão ver as tuas publicações e stories. Os seguidores atuais mantêm acesso.':
     'Todas as pessoas na Jynlo poderão ver as tuas publicações e stories.',[
      {text:'Cancelar',style:'cancel'},
      {text:'Confirmar',onPress:()=>{void (async()=>{
       setBusy(true);setError('');
       try{setPrivacy(await updateProfilePrivacy(token,value));}
       catch{setError('Não foi possível confirmar a alteração. Atualiza a página antes de tentares novamente.');}
       finally{setBusy(false);}
      })();}}
    ]);
 };
 const decide=(id:number,accept:boolean)=>{
   if(busy)return;
   setBusy(true);setError('');
   // Do not retry this mutation after a timeout: refresh the authoritative state.
   void decideFollowRequest(token,id,accept)
    .then(()=>setPending(items=>items.filter(item=>item.id!==id)))
    .catch(()=>setError('Não foi possível confirmar a decisão. Sai e volta ao perfil para atualizar os pedidos.'))
    .finally(()=>setBusy(false));
 };
 return <View style={styles.box}>
   <Text style={styles.title}>Privacidade do perfil</Text>
   {loading?<Text style={styles.muted}>A verificar a privacidade…</Text>:null}
   {privacy?<><Text style={styles.state}>Perfil {privacy.privateProfile?'privado':'público'}</Text>
    <Text style={styles.description}>{privacy.privateProfile
      ?'As publicações e stories só são visíveis aos seguidores aprovados.'
      :'Qualquer utilizador da Jynlo pode ver as tuas publicações e stories, mesmo sem te seguir.'}</Text>
    <Text style={styles.muted}>{privacy.privateProfile
      ?'Os novos seguidores precisam da tua aprovação. Os seguidores existentes mantêm acesso.'
      :'Qualquer pessoa pode seguir-te imediatamente.'}</Text>
    {privacy.privateModeAvailable?<Pressable accessibilityRole="button" disabled={busy}
      onPress={()=>setPrivate(!privacy.privateProfile)} style={[styles.action,busy&&styles.disabled]}>
      <Text style={styles.actionText}>{busy?'A guardar…':privacy.privateProfile?'Tornar público':'Tornar privado'}</Text>
    </Pressable>:<><View style={[styles.action,styles.disabled]} accessibilityRole="text">
     <Text style={styles.actionText}>Tornar privado — indisponível</Text>
    </View><Text style={styles.muted}>A proteção do acesso direto a fotografias e vídeos está em preparação. O perfil continua público até essa proteção ficar concluída.</Text></>}
   </>:null}
   {pending.length>0?<View style={styles.requests}><Text style={styles.title}>Pedidos para seguir ({pending.length})</Text>
     {pending.map(item=><View key={item.id} style={styles.request}>
       <Text style={styles.username}>@{item.username}</Text>
       <View style={styles.actions}>
         <Pressable accessibilityRole="button" accessibilityLabel={`Aceitar pedido de ${item.username}`}
           disabled={busy} onPress={()=>decide(item.id,true)} style={styles.smallAction}><Text style={styles.actionText}>Aceitar</Text></Pressable>
         <Pressable accessibilityRole="button" accessibilityLabel={`Recusar pedido de ${item.username}`}
           disabled={busy} onPress={()=>decide(item.id,false)} style={styles.smallAction}><Text style={styles.actionText}>Recusar</Text></Pressable>
       </View>
     </View>)}
   </View>:null}
   {error?<Text accessibilityRole="alert" style={styles.error}>{error}</Text>:null}
 </View>;
}
const styles=StyleSheet.create({
 box:{gap:12,padding:16,borderRadius:MobileTheme.radius.xl,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 title:{fontWeight:'900',fontSize:16,color:C.white},
 state:{fontWeight:'800',fontSize:13,color:C.mint},
 description:{fontSize:13,lineHeight:19,color:C.white},
 muted:{fontSize:12,lineHeight:18,color:C.muted},
 error:{fontSize:12,color:C.danger},
 action:{minHeight:44,paddingHorizontal:16,paddingVertical:10,borderRadius:10,borderWidth:1,borderColor:C.mint,justifyContent:'center',alignItems:'center',alignSelf:'flex-start'},
 disabled:{opacity:.5,borderColor:C.border},
 actionText:{color:C.white,fontWeight:'800',fontSize:13},
 requests:{gap:12,marginTop:4},
 request:{gap:8,paddingTop:10,borderTopWidth:1,borderColor:C.border},
 username:{color:C.white,fontWeight:'700'},
 actions:{flexDirection:'row',gap:10},
 smallAction:{minHeight:44,padding:10,borderWidth:1,borderRadius:10,borderColor:C.mint,justifyContent:'center'}
});
