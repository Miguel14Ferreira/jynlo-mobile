import React,{useCallback,useRef,useState} from 'react';
import {StyleSheet,Switch,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {myNotificationPreferences,saveNotificationPreferences} from '../src/lib/notifications-api';
import {PREFERENCE_GROUPS,samePreferences,toggleType,type NotificationPreferences} from '../src/lib/notification-preferences-core.cjs';
import {C} from '../src/lib/theme';

/** "Gerir notificações": the same account preferences as the web; they also govern push. */
export default function NotificationSettingsScreen(){
 const auth=useAuth(),router=useRouter();
 const [saved,setSaved]=useState<NotificationPreferences|null>(null);
 const [draft,setDraft]=useState<NotificationPreferences|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const version=useRef(0),saving=useRef(false);
 const load=useCallback(async()=>{
  const request=++version.current;
  setLoading(true);setError('');setNotice('');setSaved(null);setDraft(null);
  if(!auth.token){setLoading(false);return;}
  try{
   const prefs=await myNotificationPreferences(auth.token);
   if(request===version.current){setSaved(prefs);setDraft(prefs);}
  }catch(e){if(request===version.current)setError(e instanceof Error?e.message:'Não foi possível carregar as preferências.');}
  finally{if(request===version.current)setLoading(false);}
 },[auth.token]);
 useFocusEffect(useCallback(()=>{void load();return()=>{version.current++;};},[load]));
 const dirty=!!draft&&!!saved&&!samePreferences(draft,saved);
 async function save(){
  if(!draft||!auth.token||saving.current||!dirty)return;
  const request=version.current;
  saving.current=true;setBusy(true);setError('');setNotice('');
  try{
   const next=await saveNotificationPreferences(draft,auth.token);
   if(request!==version.current)return;
   setSaved(next);setDraft(next);setNotice('Preferências guardadas. Aplicam-se também ao web e às notificações no telemóvel.');
  }catch(e){if(request===version.current)setError(e instanceof Error?e.message:'Não foi possível guardar. Tenta novamente.');}
  finally{saving.current=false;setBusy(false);}
 }
 const set=(patch:Partial<NotificationPreferences>)=>{setNotice('');setDraft(current=>current?{...current,...patch}:current);};
 return <Page><DemoBanner/><Eyebrow>NOTIFICAÇÕES</Eyebrow>
  <Text style={styles.title}>Gerir notificações</Text>
  <Text style={styles.sub}>Escolhe o que queres receber na aplicação (incluindo avisos no telemóvel) e por email.</Text>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error&&!draft&&auth.token?<Button secondary title="Tentar novamente" onPress={()=>{void load();}}/>:null}
  {draft?<>
   <View style={styles.panel}>
    <Row label="Avisos na aplicação e no telemóvel" value={draft.inAppEnabled} disabled={busy}
     onChange={value=>set({inAppEnabled:value})}/>
    <Row label="Emails opcionais" value={draft.emailEnabled} disabled={busy} onChange={value=>set({emailEnabled:value})}/>
    <Text style={styles.note}>Os emails de segurança, recuperação de conta e confirmação de endereço continuam sempre ativos.</Text>
   </View>
   <View style={styles.legend}><Text style={styles.legendText}>App</Text><Text style={styles.legendText}>Email</Text></View>
   {PREFERENCE_GROUPS.map(group=><View key={group.title} style={styles.panel}>
    <Text style={styles.heading}>{group.title}</Text>
    {group.types.map(item=>{
     const inApp=!draft.disabledInAppTypes.includes(item.type),email=!draft.disabledEmailTypes.includes(item.type);
     return <View key={item.type} style={styles.typeRow}>
      <Text style={[styles.typeLabel,!draft.inAppEnabled&&!draft.emailEnabled&&styles.dim]}>{item.label}</Text>
      <Switch value={inApp&&draft.inAppEnabled} disabled={busy||!draft.inAppEnabled}
       accessibilityLabel={item.label+' na aplicação'} onValueChange={value=>setDraft(current=>current?toggleType(current,'inApp',item.type,value):current)}/>
      <Switch value={email&&draft.emailEnabled} disabled={busy||!draft.emailEnabled}
       accessibilityLabel={item.label+' por email'} onValueChange={value=>setDraft(current=>current?toggleType(current,'email',item.type,value):current)}/>
     </View>;
    })}
   </View>)}
   {notice?<Message>{notice}</Message>:null}
   <Button title={busy?'A guardar…':dirty?'Guardar alterações':'Sem alterações'} disabled={busy||!dirty} onPress={()=>{void save();}}/>
   {dirty?<Button secondary title="Descartar alterações" disabled={busy} onPress={()=>{setDraft(saved);setNotice('');}}/>:null}
  </>:null}
  <Button secondary title="Voltar às notificações" onPress={()=>router.back()}/>
 </Page>;
}
function Row({label,value,disabled,onChange}:{label:string;value:boolean;disabled:boolean;onChange:(value:boolean)=>void}){
 return <View style={styles.row}>
  <Text style={styles.rowLabel}>{label}</Text>
  <Switch value={value} disabled={disabled} onValueChange={onChange} accessibilityLabel={label}/>
 </View>;
}
const styles=StyleSheet.create({
 title:{fontSize:27,fontWeight:'900',color:C.white},sub:{color:C.muted,fontSize:14,lineHeight:20},
 panel:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:18,padding:16,gap:12},
 heading:{color:C.white,fontSize:17,fontWeight:'900'},
 row:{flexDirection:'row',alignItems:'center',gap:12},rowLabel:{flex:1,color:C.white,fontSize:15,fontWeight:'800'},
 note:{color:C.muted,fontSize:12,lineHeight:18},
 legend:{flexDirection:'row',justifyContent:'flex-end',gap:26,paddingRight:22},
 legendText:{color:C.mint,fontSize:12,fontWeight:'900'},
 typeRow:{flexDirection:'row',alignItems:'center',gap:6,borderTopWidth:1,borderTopColor:C.border,paddingTop:10},
 typeLabel:{flex:1,color:C.white,fontSize:14,lineHeight:19},dim:{opacity:.5}
});
