import React,{useCallback,useState} from 'react';
import {t} from '../lib/i18n';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {C,MobileTheme} from '../lib/theme';
import {myProfilePrivacy,myPrivateMediaReadiness,pendingFollowRequests,updateProfilePrivacy,decideFollowRequest,
 type PendingFollowRequest,type ProfilePrivacyStatus,type PrivateMediaReadiness} from '../lib/profile-privacy-api';

export default function ProfilePrivacySettings({token}:{token:string}){
 const [privacy,setPrivacy]=useState<ProfilePrivacyStatus|null>(null);
 const [pending,setPending]=useState<PendingFollowRequest[]>([]);
 const [media,setMedia]=useState<PrivateMediaReadiness|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [detailsOpen,setDetailsOpen]=useState(false);
 const [error,setError]=useState('');
 useFocusEffect(useCallback(()=>{
   let active=true;
   setPrivacy(null);setPending([]);setMedia(null);setError('');setLoading(true);
   // A failed follow-request fetch must not hide the privacy setting itself.
   void Promise.allSettled([myProfilePrivacy(token),pendingFollowRequests(token)])
    .then(([status,requests])=>{
     if(!active)return;
     if(status.status==='fulfilled')setPrivacy(status.value);
     else setError(t('Não foi possível consultar a privacidade.'));
     if(requests.status==='fulfilled')setPending(requests.value);
    })
    .finally(()=>{if(active)setLoading(false);});
   void myPrivateMediaReadiness(token).then(result=>{if(active)setMedia(result);}).catch(()=>{});
   return()=>{active=false;};
 },[token]));
 const setPrivate=(value:boolean)=>{
   if(!privacy?.privateModeAvailable||busy)return;
   Alert.alert(value?t('Tornar perfil privado?'):t('Tornar perfil público?'),
    value?t('Só seguidores aprovados poderão ver as tuas publicações e stories. Os seguidores atuais mantêm acesso. As tuas fotografias e vídeos passam para um armazenamento protegido; pode demorar um pouco.'):
     t('Todas as pessoas na Jynlo poderão ver as tuas publicações e stories.'),[
      {text:t('Cancelar'),style:'cancel'},
      {text:t('Confirmar'),onPress:()=>{void (async()=>{
       setBusy(true);setError('');
       try{setPrivacy(await updateProfilePrivacy(token,value));}
       catch{setError(t('Não foi possível confirmar a alteração. Atualiza a página antes de tentares novamente.'));}
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
    .catch(()=>setError(t('Não foi possível confirmar a decisão. Sai e volta ao perfil para atualizar os pedidos.')))
    .finally(()=>setBusy(false));
 };
 return <View style={styles.box}>
   <Pressable accessibilityRole="button" accessibilityLabel={t('Mostrar detalhes de privacidade do perfil')} accessibilityState={{expanded:detailsOpen}} onPress={()=>setDetailsOpen(open=>!open)} style={styles.headingRow}>
     <Text style={styles.title}>{t('Privacidade do perfil')}</Text><Text style={styles.disclosure}>{detailsOpen?t('Ocultar'):t('Detalhes')} {detailsOpen?'⌃':'⌄'}</Text>
   </Pressable>
   {loading?<Text style={styles.muted}>{t('A verificar a privacidade…')}</Text>:null}
   {privacy?<>
    <View style={styles.statusRow}>
      <View style={styles.statusCopy}>
       <Text style={styles.state}>{t('Perfil {a}',{a:privacy.privateProfile?'privado':'público'})}</Text>
       <Text style={styles.muted}>{privacy.privateProfile?t('Apenas seguidores aprovados veem as tuas publicações e stories.'):t('Controla quem pode seguir-te e ver os teus conteúdos.')}</Text>
      </View>
      {privacy.privateModeAvailable?<Pressable accessibilityRole="button" accessibilityLabel={privacy.privateProfile?t('Tornar o perfil público'):t('Tornar o perfil privado')} disabled={busy}
       onPress={()=>setPrivate(!privacy.privateProfile)} style={[styles.action,busy&&styles.disabled]}>
       <Text style={styles.actionText}>{busy?t('A preparar…'):privacy.privateProfile?t('Tornar público'):t('Tornar privado')}</Text>
      </Pressable>:null}
    </View>
    {!privacy.privateModeAvailable?<View style={styles.readiness}>
     <Text style={styles.readinessTitle}>{t('Proteção privada ainda não disponível')}</Text>
     <Text style={styles.muted}>{t('A Jynlo tem de proteger os ficheiros e os links antigos antes de ativar perfis privados. Não basta esconder as publicações no ecrã.')}</Text>
     {media?<Text style={styles.muted}>{media.publicReferences>0
      ?t('O teu perfil ainda tem {a} referência(s) de multimédia sem proteção. É necessária uma migração segura antes de ativar a privacidade.',{a:media.publicReferences})
      :t('O teu perfil não tem referências públicas por migrar; falta validar a segurança e ativar esta funcionalidade no servidor.')}</Text>:null}
     <Text style={styles.muted}>{t('A opção ficará disponível quando o servidor confirmar a migração segura dos conteúdos.')}</Text>
    </View>:null}
    {detailsOpen?<View style={styles.details}>
     <Text style={styles.description}>{privacy.privateProfile
      ?t('As tuas publicações e stories pessoais são visíveis apenas a ti e aos seguidores que aprovaste.')
      :t('Neste momento, qualquer utilizador da Jynlo pode ver as tuas publicações e stories pessoais.')}</Text>
     <Text style={styles.muted}>{privacy.privateProfile
      ?t('Os novos seguidores precisam da tua aprovação. Os seguidores existentes mantêm acesso.')
      :t('Quando ativares a privacidade, os novos seguidores terão de enviar um pedido.')}</Text>
    </View>:null}
   </>:null}
   {pending.length>0?<View style={styles.requests}><Text style={styles.title}>{t('Pedidos para seguir ({a})',{a:pending.length})}</Text>
     {pending.map(item=><View key={item.id} style={styles.request}>
       <Text style={styles.username}>@{item.username}</Text>
       <View style={styles.actions}>
         <Pressable accessibilityRole="button" accessibilityLabel={t('Aceitar pedido de {a}',{a:item.username})}
           disabled={busy} onPress={()=>decide(item.id,true)} style={styles.smallAction}><Text style={styles.actionText}>{t('Aceitar')}</Text></Pressable>
         <Pressable accessibilityRole="button" accessibilityLabel={t('Recusar pedido de {a}',{a:item.username})}
           disabled={busy} onPress={()=>decide(item.id,false)} style={styles.smallAction}><Text style={styles.actionText}>{t('Recusar')}</Text></Pressable>
       </View>
     </View>)}
   </View>:null}
   {error?<Text accessibilityRole="alert" style={styles.error}>{error}</Text>:null}
 </View>;
}
const styles=StyleSheet.create({
 box:{gap:9,padding:14,borderRadius:MobileTheme.radius.xl,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 headingRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,minHeight:44},
 disclosure:{color:C.mint,fontWeight:'800',fontSize:12},
 title:{fontWeight:'900',fontSize:16,color:C.white},
 state:{fontWeight:'800',fontSize:13,color:C.mint},
 statusRow:{flexDirection:'row',alignItems:'center',gap:10,justifyContent:'space-between'},
 statusCopy:{flex:1,gap:5},
 readiness:{gap:7,padding:12,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.background},
 readinessTitle:{color:C.white,fontSize:13,fontWeight:'900'},
 details:{gap:8,paddingTop:4},
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
