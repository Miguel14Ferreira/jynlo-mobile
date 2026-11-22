import React,{useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {Alert,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {request} from '../lib/api';
import {C} from '../lib/theme';
import {guestReceiptStatusCategory} from '../lib/guest-receipt-status.cjs';

type GuestReceipt={receipt:string;status:string;playerName?:string|null;meetingPointInstructions?:string|null};
type Player={id:number;name:string};
const validSecret=(v:string)=>/^[A-Za-z0-9_-]{43}$/.test(v);
export default function GuestSessionRSVP({sessionId,guestToken,onConfirmed}:{sessionId:number;guestToken:string;onConfirmed:()=>void}){
 const [name,setName]=useState(''),[note,setNote]=useState(''),[playerId,setPlayerId]=useState<number|null>(null);
 const [players,setPlayers]=useState<Player[]>([]),[receipt,setReceipt]=useState<GuestReceipt|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [refreshId,setRefreshId]=useState(0),[statusUnknown,setStatusUnknown]=useState(false);
 const [editingIdentity,setEditingIdentity]=useState(false),[editName,setEditName]=useState(''),[editPlayerId,setEditPlayerId]=useState<number|null>(null);
 const pending=useRef(false),uncertainSubmission=useRef(false);
 useEffect(()=>{uncertainSubmission.current=false;},[sessionId,guestToken]);
 const key='jynlo-guest-rsvp-'+sessionId;
 useEffect(()=>{
  let alive=true;setLoading(true);setError('');setStatusUnknown(uncertainSubmission.current);setReceipt(null);setPlayers([]);setEditingIdentity(false);
  if(!validSecret(guestToken)){setError(t('Pede uma ligação de convite válida ao organizador.'));setLoading(false);return;}
  void (async()=>{
   try{
    const previous=await SecureStore.getItemAsync(key);
    if(previous&&validSecret(previous)){
     try{const state=await request<GuestReceipt>('/api/sessions/'+sessionId+'/guest-requests/status',{method:'POST',body:{receipt:previous}});
      if(alive){
        // A successful authoritative lookup resolves a previous status error.
        // Only clear the unknown state when the server actually confirmed a
        // known receipt; an uncertain new POST without a receipt stays blocked.
        if(guestReceiptStatusCategory(state.status)==='active'){
          setReceipt({...state,receipt:previous});
          uncertainSubmission.current=false;
          setStatusUnknown(false);
        }else if(guestReceiptStatusCategory(state.status)==='closed'){
          uncertainSubmission.current=false;
          setStatusUnknown(false);
          // The previous receipt is no longer actionable, so do not keep it
          // on this device or show an obsolete confirmed presence.
          try{await SecureStore.deleteItemAsync(key);}catch{}
        }else{
          setStatusUnknown(true);
          setError(t('O servidor devolveu um estado de presença desconhecido. Contacta o organizador antes de tentares novamente.'));
        }
      }
     }catch{if(alive){setStatusUnknown(true);setError(t('Não foi possível confirmar o estado da presença anterior. Verifica novamente antes de pedires outra vaga.'));}}
    }
    const data=await request<{players:Player[]}>('/api/sessions/'+sessionId+'/guest-roster',{method:'POST',body:{token:guestToken}});
    if(alive)setPlayers(Array.isArray(data.players)?data.players.filter(p=>Number.isSafeInteger(p.id)&&p.id>0&&typeof p.name==='string'):[]);
   }catch(e){if(alive)setError(e instanceof Error?e.message:t('Não foi possível abrir o convite.'));}
   finally{if(alive)setLoading(false);}
  })();
  return()=>{alive=false;};
 },[sessionId,guestToken,key,refreshId]);
 async function confirm(){
  if(pending.current||loading||statusUnknown||uncertainSubmission.current||receipt||(!playerId&&!name.trim()))return;
  pending.current=true;setBusy(true);setError('');
  try{
   const result=await request<GuestReceipt>('/api/sessions/'+sessionId+'/guest-requests',{
    method:'POST',body:{linkToken:guestToken,playerId:playerId||null,newName:playerId?null:name.trim(),note:note.trim()||null}});
   if(!validSecret(result.receipt)||!['APPROVED','LINKED','PENDING'].includes(result.status))
    throw Error(t('A inscrição não foi confirmada. Consulta os participantes antes de repetires.'));
   try{await SecureStore.setItemAsync(key,result.receipt);}
   catch{setError(t('Presença confirmada, mas não foi possível guardar o comprovativo neste dispositivo. Não desinstales a aplicação antes de confirmares o estado com o organizador.'));}
   uncertainSubmission.current=false;setReceipt(result);onConfirmed();
  }catch(e){
   const detail=e instanceof Error?e.message:t('Não foi possível confirmar a presença.');
   // A POST can succeed on the server even if Android loses the response.
   // A second POST would either overbook or return a misleading duplicate error.
   if(/ligação|tempo|servidor respondeu|confirmar|rede|timeout/i.test(detail)){
    uncertainSubmission.current=true;setStatusUnknown(true);
    setError(t('Não foi possível saber se a presença ficou confirmada. Não repitas a inscrição: consulta o organizador ou verifica o estado da sessão no browser.'));
   }else setError(detail);
  }
  finally{pending.current=false;setBusy(false);}
 }
 async function changeIdentity(){
  if(pending.current||busy||!receipt||!validSecret(receipt.receipt)||(!editPlayerId&&!editName.trim()))return;
  pending.current=true;setBusy(true);setError('');
  try{
   const updated=await request<GuestReceipt>('/api/sessions/'+sessionId+'/guest-requests/change-player',{
    method:'POST',body:{receipt:receipt.receipt,playerId:editPlayerId||null,newName:editPlayerId?null:editName.trim()}});
   if(updated.status!=='APPROVED'||!updated.playerName?.trim())throw Error(t('Não foi possível confirmar a alteração do jogador. Verifica a tua presença antes de repetir.'));
   setReceipt({...updated,receipt:receipt.receipt});setEditingIdentity(false);onConfirmed();
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível alterar o jogador.'));}
  finally{pending.current=false;setBusy(false);}
 }
 function cancel(){
  if(pending.current||!receipt||!validSecret(receipt.receipt))return;
  Alert.alert(t('Cancelar presença'),t('Queres mesmo cancelar a tua participação?'),[
   {text:t('Voltar'),style:'cancel'},
   {text:t('Cancelar'),style:'destructive',onPress:()=>void (async()=>{
    pending.current=true;setBusy(true);setError('');
    try{
     const result=await request<GuestReceipt>('/api/sessions/'+sessionId+'/guest-requests/cancel-self',{method:'POST',body:{receipt:receipt.receipt}});
     if(result.status!=='CANCELLED')throw Error(t('Cancelamento não confirmado pelo servidor.'));
     uncertainSubmission.current=false;setReceipt(null);onConfirmed();
     try{await SecureStore.deleteItemAsync(key);}
     catch{setError(t('Presença cancelada no servidor. Não foi possível limpar o comprovativo local; a inscrição já não está ativa.'));}
    }catch(e){setError(e instanceof Error?e.message:t('Não foi possível cancelar.'));}
    finally{pending.current=false;setBusy(false);}
   })()}
  ]);
 }
 return <View style={styles.panel}>
  <Text style={styles.heading}>{t('Confirmar presença sem conta')}</Text>
  {loading?<Text style={styles.hint}>{t('A verificar o convite…')}</Text>:null}
  {error?<Text style={styles.error}>{error}</Text>:null}
  {!loading&&!uncertainSubmission.current&&(statusUnknown||error&&!receipt)?<Pressable accessibilityRole="button" accessibilityLabel={t('Voltar a verificar o convite')} disabled={busy} style={styles.secondary} onPress={()=>setRefreshId(n=>n+1)}><Text style={styles.buttonText}>{t('Verificar novamente')}</Text></Pressable>:null}
  {uncertainSubmission.current?<Text style={styles.hint}>{t('Se o servidor recebeu a inscrição, o organizador conseguirá verificar a tua presença. Evita repetir o pedido.')}</Text>:null}
  {receipt?<><Text style={styles.ok}>{receipt.status==='APPROVED'||receipt.status==='LINKED'?t('✓ Presença confirmada'):t('Pedido registado')}</Text>
   <Text style={styles.hint}>{receipt.playerName||'Convidado'}</Text>
   {receipt.meetingPointInstructions?<Text style={styles.hint}>{t('Ponto de encontro: {a}',{a:receipt.meetingPointInstructions})}</Text>:null}
   {receipt.status==='APPROVED'?<><Pressable accessibilityRole="button" disabled={busy} style={styles.secondary}
     onPress={()=>{setEditName(receipt.playerName||'');setEditPlayerId(null);setEditingIdentity(open=>!open);}}>
    <Text style={styles.buttonText}>{editingIdentity?t('Fechar correção'):t('Enganei-me no nome')}</Text>
   </Pressable>
   {editingIdentity?<View style={styles.editBox}>
     <Text style={styles.hint}>{t('Corrige o teu nome sem perder a presença confirmada.')}</Text>
     {players.map(p=><Pressable key={p.id} accessibilityRole="radio" accessibilityState={{checked:editPlayerId===p.id}}
       style={[styles.secondary,editPlayerId===p.id&&styles.selected]} onPress={()=>{setEditPlayerId(p.id);setEditName('');}}>
       <Text style={styles.buttonText}>{editPlayerId===p.id?'✓ ':'○ '}{p.name}</Text></Pressable>)}
     {editPlayerId!==null?<Pressable accessibilityRole="button" style={styles.secondary} onPress={()=>setEditPlayerId(null)}>
       <Text style={styles.buttonText}>{t('Escrever outro nome')}</Text></Pressable>:null}
     {editPlayerId===null?<TextInput style={styles.input} value={editName} maxLength={80}
       onChangeText={setEditName} placeholder={t('Nome correto')} placeholderTextColor={C.muted}
       accessibilityLabel={t('Corrigir o nome do convidado')}/>:null}
     <Pressable accessibilityRole="button" disabled={busy||(!editPlayerId&&!editName.trim())}
       onPress={()=>void changeIdentity()} style={[styles.primary,(busy||(!editPlayerId&&!editName.trim()))&&{opacity:.5}]}>
       <Text style={styles.primaryText}>{busy?t('A guardar…'):t('Guardar nome correto')}</Text>
     </Pressable>
   </View>:null}</>:null}
   {receipt.status==='APPROVED'?<Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={cancel}><Text style={styles.buttonText}>{t('Cancelar presença')}</Text></Pressable>:null}
  </>:!loading&&!error&&!statusUnknown?<><Text style={styles.hint}>{t('Escolhe o teu nome na lista ou escreve um nome novo.')}</Text>
   {players.map(p=><Pressable key={p.id} accessibilityRole="radio" accessibilityState={{checked:playerId===p.id}}
    style={[styles.secondary,playerId===p.id&&styles.selected]} onPress={()=>{setPlayerId(p.id);setName('');}}>
    <Text style={styles.buttonText}>{playerId===p.id?'✓ ':'○ '}{p.name}</Text></Pressable>)}
   {playerId!==null?<Pressable accessibilityRole="button" style={styles.secondary} onPress={()=>setPlayerId(null)}><Text style={styles.buttonText}>{t('Não estou na lista')}</Text></Pressable>:null}
   {!playerId?<TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} placeholder={t('O teu nome')}
    accessibilityLabel={t('Nome do convidado')} placeholderTextColor={C.muted}/>:null}
   <TextInput style={styles.input} value={note} onChangeText={setNote} maxLength={160} placeholder={t('Nota opcional')}
    accessibilityLabel={t('Nota para o organizador')} placeholderTextColor={C.muted}/>
   <Pressable accessibilityRole="button" disabled={busy||statusUnknown||(!playerId&&!name.trim())} style={[styles.primary,(busy||(!playerId&&!name.trim()))&&{opacity:.5}]} onPress={()=>void confirm()}>
    <Text style={styles.primaryText}>{busy?t('A confirmar…'):t('Confirmar presença')}</Text></Pressable>
   <Text style={styles.hint}>{t('A presença é confirmada pelo servidor. O comprovativo fica guardado de forma segura neste dispositivo.')}</Text>
  </>:null}
 </View>;
}
const styles=StyleSheet.create({
 panel:{gap:10,padding:16,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 editBox:{gap:10,padding:10,borderRadius:12,backgroundColor:C.surface2},
 heading:{fontSize:17,fontWeight:'900',color:C.white},hint:{color:C.muted,fontSize:12,lineHeight:19},
 error:{color:'#FF9999',fontSize:13,lineHeight:19},ok:{color:C.mint,fontSize:16,fontWeight:'900'},
 input:{backgroundColor:C.surface2,color:C.white,borderWidth:1,borderColor:C.border,borderRadius:11,padding:12,minHeight:47},
 secondary:{padding:12,borderWidth:1,borderColor:C.border,borderRadius:11,minHeight:44,justifyContent:'center'},
 selected:{borderColor:C.mint},buttonText:{color:C.white,fontWeight:'700'},
 primary:{backgroundColor:C.mint,borderRadius:11,padding:15,minHeight:50,alignItems:'center'},
 primaryText:{color:C.background,fontWeight:'900'}
});
