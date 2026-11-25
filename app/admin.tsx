import React,{useCallback,useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {t} from '../src/lib/i18n';
import {useAuth} from '../src/lib/auth';
import {C} from '../src/lib/theme';
import {Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {closeReport,hasAdminAccess,moderatePlayer,openReports,recentAccounts,searchPlayers,
 type AdminPlayer,type AdminReport,type RecentAccount} from '../src/lib/admin-api';

const FLAG:Record<string,string>={EMAIL_PADRAO_ALEATORIO:'Email com números aleatórios',EMAIL_NAO_CONFIRMADO:'Email por confirmar',
 SEM_FOTO:'Sem foto',NUNCA_ENTROU:'Nunca entrou',VARIOS_REGISTOS_SEGUIDOS:'Vários registos seguidos'};
const STRONG=new Set(['EMAIL_PADRAO_ALEATORIO','VARIOS_REGISTOS_SEGUIDOS']);
type Tab='reports'|'recent'|'players';
const when=(v:string|null|undefined)=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';

/** Short admin for emergencies on the phone: reports, new accounts and suspensions. The rest stays on the website. */
export default function AdminScreen(){
 const auth=useAuth(),router=useRouter();
 const [allowed,setAllowed]=useState<boolean|null>(null);
 const [tab,setTab]=useState<Tab>('reports');
 const [reports,setReports]=useState<AdminReport[]>([]);
 const [recent,setRecent]=useState<RecentAccount[]>([]);
 const [query,setQuery]=useState('');const [found,setFound]=useState<AdminPlayer[]>([]);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState('');
 const [confirm,setConfirm]=useState<{id:number;username:string;suspended:boolean}|null>(null);const [reason,setReason]=useState('');
 const token=auth.token;
 useEffect(()=>{if(!token){setAllowed(false);return;}void hasAdminAccess(token).then(setAllowed);},[token]);
 const load=useCallback(async()=>{
  if(!token||!allowed)return;setLoading(true);setError('');
  try{
   if(tab==='reports')setReports(await openReports(token)||[]);
   if(tab==='recent')setRecent(await recentAccounts(7,token)||[]);
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível carregar.'));}
  finally{setLoading(false);}
 },[token,allowed,tab]);
 useEffect(()=>{void load();},[load]);
 async function search(){
  if(!token||!query.trim())return;setLoading(true);setError('');
  try{setFound((await searchPlayers(query,token)).players||[]);}catch(e){setError(e instanceof Error?e.message:t('Não foi possível pesquisar.'));}
  finally{setLoading(false);}
 }
 async function decideReport(r:AdminReport,status:'REVIEWED'|'DISMISSED'){
  if(!token||busy)return;setBusy(true);setError('');
  try{await closeReport(r.id,status,token);setReports(list=>list.filter(x=>x.id!==r.id));setInfo(status==='REVIEWED'?t('Report marcado como revisto.'):t('Report dispensado.'));}
  catch(e){setError(e instanceof Error?e.message:t('A ação não foi confirmada.'));}finally{setBusy(false);}
 }
 async function moderate(){
  if(!token||!confirm||busy)return;
  const suspend=!confirm.suspended;const why=suspend?reason.trim():t('Revista pela administração');
  if(suspend&&!why)return;
  setBusy(true);setError('');
  try{
   const r=await moderatePlayer(confirm.id,suspend?'SUSPEND':'REINSTATE',confirm.username,confirm.suspended,why,token);
   setRecent(list=>list.map(a=>a.id===confirm.id?{...a,suspendedAt:r.moderationSuspendedAt}:a));
   setFound(list=>list.map(p=>p.id===confirm.id?{...p,moderationSuspendedAt:r.moderationSuspendedAt}:p));
   setInfo(suspend?t('@{v} foi suspenso.',{v:confirm.username}):t('@{v} foi reativado.',{v:confirm.username}));setConfirm(null);
  }catch(e){setError(e instanceof Error?e.message:t('A ação não foi confirmada. Atualiza antes de repetir.'));}
  finally{setBusy(false);}
 }
 const moderationBox=(id:number,username:string,suspended:boolean)=>confirm?.id===id?<View style={styles.confirm}>
   {!suspended?<TextInput value={reason} onChangeText={setReason} maxLength={300} placeholder={t('Motivo da suspensão')} placeholderTextColor={C.muted} style={styles.input} accessibilityLabel={t('Motivo da suspensão')}/>:null}
   <View style={styles.row}>
    <Button title={busy?t('A guardar…'):suspended?t('Confirmar reativação'):t('Confirmar suspensão')} disabled={busy||(!suspended&&!reason.trim())} onPress={()=>{void moderate();}}/>
    <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>setConfirm(null)}/>
   </View>
  </View>:<Button secondary title={suspended?t('Reativar'):t('Suspender')} onPress={()=>{setConfirm({id,username,suspended});setReason(t('Conta suspeita de ser falsa'));}}/>;
 if(allowed===null)return <Page><Loader/></Page>;
 if(!allowed)return <Page><Message tone="error">{t('Esta área é só para a administração da Jynlo.')}</Message></Page>;
 return <Page>
  <Eyebrow>{t('ADMINISTRAÇÃO')}</Eyebrow>
  <Text style={styles.title}>{t('Moderação rápida')}</Text>
  <Text style={styles.note}>{t('O resto da administração está no site, no computador.')}</Text>
  <View style={styles.tabs}>
   {([['reports',t('Reports')],['recent',t('Contas novas')],['players',t('Jogadores')]] as [Tab,string][]).map(([k,label])=>
    <Pressable key={k} accessibilityRole="tab" accessibilityState={{selected:tab===k}} onPress={()=>{setTab(k);setInfo('');setConfirm(null);}} style={[styles.tab,tab===k&&styles.tabOn]}>
     <Text style={[styles.tabText,tab===k&&styles.tabTextOn]}>{label}</Text></Pressable>)}
  </View>
  {error?<Message tone="error">{error}</Message>:null}{info?<Message>{info}</Message>:null}
  {loading?<Loader/>:null}
  {tab==='reports'?<>
   {!loading&&!reports.length?<Message>{t('Não há reports abertos.')}</Message>:null}
   {reports.map(r=><View key={r.id} style={styles.card}>
    <Text style={styles.strong}>@{r.reportedUsername}</Text>
    <Text style={styles.note}>{t('Denunciado por @{a} · {b}',{a:r.reporterUsername,b:when(r.createdAt)})}</Text>
    <Text style={styles.body}>“{r.reason}”</Text>
    <View style={styles.row}>
     <Button secondary title={t('Ver perfil')} onPress={()=>router.push({pathname:'/social/[username]',params:{username:r.reportedUsername}})}/>
     <Button secondary title={t('Revisto')} disabled={busy} onPress={()=>{void decideReport(r,'REVIEWED');}}/>
     <Button secondary title={t('Dispensar')} disabled={busy} onPress={()=>{void decideReport(r,'DISMISSED');}}/>
    </View>
   </View>)}
  </>:null}
  {tab==='recent'?<>
   {!loading&&!recent.length?<Message>{t('Nenhuma conta nos últimos 7 dias.')}</Message>:null}
   {recent.map(a=>{const strong=a.flags.some(f=>STRONG.has(f));return <View key={a.id} style={[styles.card,strong&&styles.cardStrong]}>
    <Text style={styles.strong}>@{a.username}{a.suspendedAt?' · '+t('Suspensa'):''}</Text>
    <Text style={styles.note}>{a.fullName||'—'} · {a.email}</Text>
    <Text style={styles.note}>{t('Registo {a}',{a:when(a.joinedAt)})}</Text>
    <View style={styles.flags}>{a.flags.map(f=><Text key={f} style={[styles.flag,STRONG.has(f)&&styles.flagStrong]}>{t(FLAG[f]||f)}</Text>)}</View>
    {moderationBox(a.id,a.username,!!a.suspendedAt)}
   </View>;})}
  </>:null}
  {tab==='players'?<>
   <View style={styles.row}>
    <TextInput value={query} onChangeText={setQuery} onSubmitEditing={()=>{void search();}} returnKeyType="search" placeholder={t('Nome ou username')} placeholderTextColor={C.muted} style={[styles.input,{flex:1}]} accessibilityLabel={t('Pesquisar jogador')}/>
    <Button title={t('Pesquisar')} disabled={!query.trim()||loading} onPress={()=>{void search();}}/>
   </View>
   {found.map(p=><View key={p.id} style={styles.card}>
    <Text style={styles.strong}>@{p.username}{p.moderationSuspendedAt?' · '+t('Suspensa'):''}</Text>
    <Text style={styles.note}>{p.fullName||'—'}</Text>
    {moderationBox(p.id,p.username,!!p.moderationSuspendedAt)}
   </View>)}
  </>:null}
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontSize:24,fontWeight:'900'},
 note:{color:C.muted,fontSize:12,lineHeight:17},
 body:{color:C.white,fontSize:14,lineHeight:20},
 strong:{color:C.white,fontSize:15,fontWeight:'800'},
 tabs:{flexDirection:'row',gap:8},
 tab:{flex:1,minHeight:40,borderRadius:12,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
 tabOn:{backgroundColor:C.mint,borderColor:C.mint},
 tabText:{color:C.white,fontWeight:'800',fontSize:12},tabTextOn:{color:'#062B2E'},
 card:{gap:6,padding:12,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 cardStrong:{borderColor:'#C9874A',backgroundColor:'#2A2219'},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 flags:{flexDirection:'row',flexWrap:'wrap',gap:6},
 flag:{fontSize:11,color:'#BFE9DF',backgroundColor:'#163F4D',borderRadius:999,paddingHorizontal:8,paddingVertical:3,overflow:'hidden'},
 flagStrong:{backgroundColor:'#6B3D16',color:'#FFE2C4'},
 confirm:{gap:8},
 input:{minHeight:44,borderRadius:11,borderWidth:1,borderColor:C.border,color:C.white,backgroundColor:C.surface2,paddingHorizontal:11},
});
