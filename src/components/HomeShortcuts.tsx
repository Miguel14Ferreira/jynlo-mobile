import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {t} from '../lib/i18n';
import {useAuth} from '../lib/auth';
import {C} from '../lib/theme';
import {JynloIcon,type JynloIconName} from './JynloIcon';
import {managedVenues,type ManagedVenue} from '../lib/venue-jynlo-api';
import {useBookingsOpen} from '../lib/use-bookings-open';
import {MAX_SHORTCUTS,SHORTCUT_CATALOG,availableShortcutIds,moveShortcut,resolveShortcuts} from '../lib/home-shortcuts.cjs';

function storageKey(username:string){return 'jynlo.home-shortcuts.v1.'+username.toLowerCase().replace(/[^a-z0-9_.-]/g,'_');}
async function readSaved(username:string):Promise<string[]|null>{
 try{const raw=await SecureStore.getItemAsync(storageKey(username));const v:unknown=raw?JSON.parse(raw):null;
  return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):null;}catch{return null;}
}
async function writeSaved(username:string,ids:string[]|null){
 try{if(ids)await SecureStore.setItemAsync(storageKey(username),JSON.stringify(ids));else await SecureStore.deleteItemAsync(storageKey(username));}catch{/* keeps working for this session */}
}

/** Início: a row of shortcuts each person picks and orders; the tab bar stays the same for everyone. */
export function HomeShortcuts(){
 const auth=useAuth();
 const router=useRouter();
 const bookingsOpen=useBookingsOpen();
 const [managed,setManaged]=useState<ManagedVenue[]>([]);
 const [saved,setSaved]=useState<string[]|null>(null);
 const [loaded,setLoaded]=useState(false);
 const [editing,setEditing]=useState(false);
 const [draft,setDraft]=useState<string[]>([]);

 useEffect(()=>{
  let alive=true;
  if(!auth.username){setLoaded(true);return;}
  void readSaved(auth.username).then(v=>{if(alive){setSaved(v);setLoaded(true);}});
  return()=>{alive=false;};
 },[auth.username]);

 useFocusEffect(useCallback(()=>{
  let alive=true;
  if(auth.token)managedVenues(auth.token).then(list=>{if(alive)setManaged(list||[]);}).catch(()=>{/* not a manager, or offline */});
  return()=>{alive=false;};
 },[auth.token]));

 const manager=managed.length>0;
 const available=useMemo(()=>availableShortcutIds(manager,bookingsOpen),[manager,bookingsOpen]);
 const ids=resolveShortcuts(saved,available,manager);
 const pending=managed.reduce((n,v)=>n+(v.pendingRequests||0),0);
 const byId=(id:string)=>SHORTCUT_CATALOG.find(s=>s.id===id);

 if(!loaded||!auth.token)return null;

 const open=(id:string)=>{
  if(id==='my-venues'&&managed.length===1){router.push({pathname:'/venues/[id]/manage',params:{id:String(managed[0]!.venueId)}} as never);return;}
  const s=byId(id);if(s)router.push(s.href as never);
 };
 const save=(next:string[]|null)=>{setSaved(next);setEditing(false);if(auth.username)void writeSaved(auth.username,next);};

 return <View style={styles.box}>
  <View style={styles.head}>
   <Text style={styles.title}>{t('Os teus atalhos')}</Text>
   <Pressable accessibilityRole="button" onPress={()=>{if(editing)setEditing(false);else{setDraft(ids);setEditing(true);}}}>
    <Text style={styles.link}>{editing?t('Cancelar'):t('Personalizar')}</Text></Pressable>
  </View>
  {!editing?<View style={styles.row}>
   {ids.map(id=>{const s=byId(id);if(!s)return null;
    return <Pressable key={id} accessibilityRole="button" accessibilityLabel={t(s.label)} style={styles.item} onPress={()=>open(id)}>
     <JynloIcon name={s.icon as JynloIconName} size={18} color={C.mint}/>
     <Text style={styles.itemText}>{t(s.label)}</Text>
     {id==='my-venues'&&pending>0?<View style={styles.badge}><Text style={styles.badgeText}>{pending}</Text></View>:null}
    </Pressable>;})}
  </View>:<>
   <Text style={styles.muted}>{t('Escolhe até 6 atalhos e põe-nos pela ordem que preferires.')}</Text>
   {draft.map((id,i)=>{const s=byId(id);if(!s)return null;
    return <View key={id} style={styles.line}>
     <Text style={styles.itemText}>{t(s.label)}</Text>
     <View style={styles.tools}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Subir')} disabled={i===0} style={[styles.tool,i===0&&styles.off]} onPress={()=>setDraft(d=>moveShortcut(d,i,-1))}><Text style={styles.itemText}>↑</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Descer')} disabled={i===draft.length-1} style={[styles.tool,i===draft.length-1&&styles.off]} onPress={()=>setDraft(d=>moveShortcut(d,i,1))}><Text style={styles.itemText}>↓</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Remover')} style={styles.tool} onPress={()=>setDraft(d=>d.filter(x=>x!==id))}><Text style={styles.itemText}>✕</Text></Pressable>
     </View>
    </View>;})}
   {available.filter(id=>!draft.includes(id)).length?<Text style={styles.muted}>{t('Adicionar')}</Text>:null}
   <View style={styles.row}>
    {available.filter(id=>!draft.includes(id)).map(id=>{const s=byId(id);if(!s)return null;const full=draft.length>=MAX_SHORTCUTS;
     return <Pressable key={id} accessibilityRole="button" disabled={full} style={[styles.item,styles.add,full&&styles.off]} onPress={()=>setDraft(d=>[...d,id])}>
      <JynloIcon name={s.icon as JynloIconName} size={16} color={C.mint}/><Text style={styles.itemText}>{t(s.label)}</Text></Pressable>;})}
   </View>
   <View style={styles.row}>
    <Pressable accessibilityRole="button" style={styles.primary} onPress={()=>save(draft)}><Text style={styles.primaryText}>{t('Guardar')}</Text></Pressable>
    <Pressable accessibilityRole="button" style={styles.item} onPress={()=>save(null)}><Text style={styles.itemText}>{t('Repor os atalhos iniciais')}</Text></Pressable>
   </View>
  </>}
 </View>;
}

const styles=StyleSheet.create({
 box:{gap:10,padding:14,marginHorizontal:16,marginTop:12,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 head:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 title:{color:C.white,fontWeight:'800',fontSize:15},
 link:{color:'#62e6c4',fontWeight:'800'},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8},
 item:{flexDirection:'row',alignItems:'center',gap:6,minHeight:42,paddingHorizontal:12,borderRadius:14,borderWidth:1,borderColor:C.border},
 add:{borderStyle:'dashed'},
 off:{opacity:0.4},
 itemText:{color:C.white,fontWeight:'700'},
 badge:{minWidth:20,height:20,paddingHorizontal:5,borderRadius:10,backgroundColor:'#62e6c4',alignItems:'center',justifyContent:'center'},
 badgeText:{color:'#04212b',fontSize:11,fontWeight:'900'},
 muted:{color:C.muted,fontSize:13},
 line:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:6,paddingHorizontal:10,borderRadius:12,backgroundColor:'rgba(4,24,33,0.6)'},
 tools:{flexDirection:'row',gap:6},
 tool:{width:36,height:36,borderRadius:10,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
 primary:{minHeight:42,paddingHorizontal:16,borderRadius:14,backgroundColor:'#62e6c4',justifyContent:'center'},
 primaryText:{color:'#04212b',fontWeight:'900'},
});
