import React,{useEffect,useState} from 'react';
import {t} from '../lib/i18n';
import {Alert,Linking,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import MapView,{Marker} from 'react-native-maps';
import {DEMO_MODE,request} from '../lib/api';
import {C} from '../lib/theme';
import {JynloIcon} from './JynloIcon';
import type {SessionDetail} from '../lib/types';

const {trustedGoogleMapsUrl,exactSessionMapPin,exactSessionMapsDestination}=require('../lib/session-maps.cjs');

type Props={session:SessionDetail;token:string|null;canEdit:boolean;onSaved:(value:SessionDetail)=>void};

export default function SessionLocationPanel({session,token,canEdit,onSaved}:Props){
 const [editing,setEditing]=useState(false);
 const [draft,setDraft]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 useEffect(()=>{setEditing(false);setError('');setNotice('');},[session.id]);
 const authorized=session.canSeeExactAddress===true;
 const pin=exactSessionMapPin(session) as {latitude:number;longitude:number}|null;
 const destination=exactSessionMapsDestination(session) as string|null;
 const saved=authorized?trustedGoogleMapsUrl(session.googleMapsUrl):null;
 const editable=authorized&&canEdit&&['OPEN','FULL'].includes(session.status)
   &&Number.isFinite(Date.parse(session.gameDate))&&Date.parse(session.gameDate)>Date.now();
 async function openExactLocation(){
  if(!destination)return;
  try{await Linking.openURL(destination);}
  catch{Alert.alert(t('Google Maps'),t('Não foi possível abrir a localização.'));}
 }
 async function save(){
  if(!editable||!token||DEMO_MODE||busy)return;
  const url=draft.trim();
  if(url&&!trustedGoogleMapsUrl(url)){setError(t('Cola um link HTTPS válido do Google Maps.'));return;}
  setBusy(true);setError('');setNotice('');
  try{
   const updated=await request<SessionDetail>(`/api/sessions/${session.id}/maps-link`,{
    token,method:'PATCH',body:{url:url||null}
   });
   if(updated?.id!==session.id)throw Error(t('O servidor não confirmou o jogo atualizado.'));
   onSaved(updated);setEditing(false);setNotice(t('Ligação Google Maps guardada.'));
  }catch(e){
   setError((e instanceof Error?e.message:t('Não foi possível guardar a localização.'))
      +' '+t('Verifica o estado antes de repetir.'));
  }finally{setBusy(false);}
 }
 return <View style={styles.panel}>
   <View style={styles.heading}><JynloIcon name="location" size={19} color={C.mint}/>
    <Text style={styles.title}>{t('RECINTO E ENCONTRO')}</Text></View>
   {authorized?<Text style={styles.address}>{session.address?.trim()||t('Localização no Google Maps')}</Text>:
    <Text style={styles.hint}>{t('A localização exata está reservada aos participantes autorizados.')}</Text>}
   {authorized&&session.meetingPointInstructions?.trim()?
    <Text style={styles.hint}>{session.meetingPointInstructions}</Text>:null}
   {pin&&authorized?<View style={styles.mapContainer}>
    <MapView key={session.id+'|'+pin.latitude+'|'+pin.longitude}
     style={styles.map} initialRegion={{...pin,latitudeDelta:.008,longitudeDelta:.008}}
     accessibilityLabel={t('Mapa do ponto GPS registado para o jogo')}>
     <Marker coordinate={pin} title={t('Ponto registado para este jogo')}/>
    </MapView>
    <Text style={styles.hint}>{t('Mapa do ponto GPS guardado. Confirma a entrada com o organizador.')}</Text>
   </View>:null}
   {saved&&!pin?<Text style={styles.hint}>{t('O ponto exato está no link Google Maps do organizador. Não mostramos um marcador aproximado diferente.')}</Text>:null}
   {destination?<Pressable style={styles.mapButton} accessibilityRole="link"
    accessibilityLabel={t('Abrir localização exata no Google Maps')} onPress={()=>void openExactLocation()}>
    <Text style={styles.mapButtonText}>{t('Abrir localização no Google Maps ↗')}</Text>
   </Pressable>:null}
   {editable&&!editing?<Pressable style={styles.secondary} accessibilityRole="button"
     onPress={()=>{setDraft(session.googleMapsUrl||'');setError('');setNotice('');setEditing(true);}}>
     <Text style={styles.secondaryText}>{t('Corrigir link do Google Maps')}</Text>
   </Pressable>:null}
   {editable&&editing?<View style={styles.editor}>
    <Text style={styles.hint}>{t('Cola o link partilhado do Google Maps. Esse será o destino aberto pelos participantes.')}</Text>
    <TextInput style={styles.input} value={draft} onChangeText={setDraft}
      editable={!busy} maxLength={512} autoCapitalize="none" keyboardType="url"
      placeholder={t('https://maps.app.goo.gl/...')} placeholderTextColor={C.muted}
      accessibilityLabel={t('Link exato Google Maps')}/>
    <View style={styles.actions}>
     <Pressable disabled={busy} style={styles.mapButton} onPress={()=>void save()}>
       <Text style={styles.mapButtonText}>{busy?t('A guardar…'):t('Guardar localização')}</Text>
     </Pressable>
     <Pressable disabled={busy} style={styles.secondary} onPress={()=>setEditing(false)}>
       <Text style={styles.secondaryText}>{t('Cancelar')}</Text>
     </Pressable>
    </View>
   </View>:null}
   {error?<Text style={styles.error} accessibilityRole="alert">{error}</Text>:null}
   {notice?<Text style={styles.hint}>{notice}</Text>:null}
  </View>;
}
const styles=StyleSheet.create({
 panel:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:17,padding:16,gap:10},
 heading:{flexDirection:'row',alignItems:'center',gap:8},
 title:{color:C.mint,fontWeight:'800',fontSize:12,letterSpacing:1},
 address:{fontSize:16,color:C.white,fontWeight:'700'},
 hint:{color:C.muted,fontSize:12,lineHeight:18},
 mapContainer:{gap:8,overflow:'hidden',borderRadius:13},
 map:{width:'100%',height:225,borderRadius:13},
 mapButton:{backgroundColor:C.mint,borderRadius:11,minHeight:42,paddingHorizontal:13,paddingVertical:10,alignItems:'center',justifyContent:'center'},
 mapButtonText:{color:'#062b30',fontWeight:'800'},
 secondary:{borderColor:C.border,borderWidth:1,borderRadius:11,minHeight:40,padding:10,alignItems:'center',justifyContent:'center'},
 secondaryText:{color:C.white,fontWeight:'700'},
 editor:{gap:9},
 input:{borderColor:C.border,borderWidth:1,borderRadius:10,padding:11,color:C.white,backgroundColor:C.background},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:9},
 error:{color:'#ffa2ad',fontSize:12}
});
