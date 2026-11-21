import React,{useCallback,useRef,useState} from 'react';
import {Pressable,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {approximatePosition,myNearbyAlerts,saveNearbyAlerts} from '../src/lib/nearby-alerts-api';
import {PLACES,RADII_KM,MAX_SPORTS,problem,samePreference,sportSuggestions,toggleSport,type NearbyAlertPreference} from '../src/lib/nearby-alerts-core.cjs';
import {SPORTS} from '../src/lib/sports';
import {C,MobileTheme} from '../src/lib/theme';

/** "Novos jogos perto de ti": opt-in alerts for new public games near a chosen place. */
export default function NearbyAlertsScreen(){
 const auth=useAuth(),router=useRouter();
 const [saved,setSaved]=useState<NearbyAlertPreference|null>(null);
 const [draft,setDraft]=useState<NearbyAlertPreference|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[locating,setLocating]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[search,setSearch]=useState('');
 const version=useRef(0),saving=useRef(false);
 const load=useCallback(async()=>{
  const request=++version.current;
  setLoading(true);setError('');setNotice('');setSaved(null);setDraft(null);
  if(!auth.token){setLoading(false);return;}
  try{
   const value=await myNearbyAlerts(auth.token);
   if(request===version.current){setSaved(value);setDraft(value);}
  }catch(e){if(request===version.current)setError(e instanceof Error?e.message:'Não foi possível carregar os avisos.');}
  finally{if(request===version.current)setLoading(false);}
 },[auth.token]);
 useFocusEffect(useCallback(()=>{void load();return()=>{version.current++;};},[load]));
 const set=(patch:Partial<NearbyAlertPreference>)=>{setNotice('');setError('');setDraft(current=>current?{...current,...patch}:current);};
 const dirty=!!draft&&!!saved&&!samePreference(draft,saved);
 const issue=draft?problem(draft):'';
 async function useMyPosition(){
  if(locating)return;
  setLocating(true);setError('');
  try{const point=await approximatePosition();set({...point,placeLabel:'Perto de mim'});}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível obter a localização.');}
  finally{setLocating(false);}
 }
 async function save(){
  if(!draft||!auth.token||saving.current||!dirty||issue)return;
  const request=version.current;
  saving.current=true;setBusy(true);setError('');setNotice('');
  try{
   const next=await saveNearbyAlerts(draft,auth.token);
   if(request!==version.current)return;
   setSaved(next);setDraft(next);
   setNotice(next.enabled?'Guardado. Avisamos-te no máximo 2 vezes por dia.':'Guardado. Não vais receber avisos de novos jogos.');
  }catch(e){if(request===version.current)setError(e instanceof Error?e.message:'Não foi possível guardar. Tenta novamente.');}
  finally{saving.current=false;setBusy(false);}
 }
 const suggestions=draft?sportSuggestions(SPORTS,search,draft.sports):[];
 return <Page><DemoBanner/><Eyebrow>NOTIFICAÇÕES</Eyebrow>
  <Text style={styles.title}>Novos jogos perto de ti</Text>
  <Text style={styles.sub}>Recebe um aviso quando alguém cria um jogo público perto do local que escolheres. No máximo 2 por dia.</Text>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error&&!draft&&auth.token?<Button secondary title="Tentar novamente" onPress={()=>{void load();}}/>:null}
  {draft?<>
   <View style={styles.panel}>
    <View style={styles.row}>
     <Text style={styles.rowLabel}>Receber avisos</Text>
     <Switch value={draft.enabled} disabled={busy} onValueChange={value=>set({enabled:value})} accessibilityLabel="Receber avisos de novos jogos perto de ti"/>
    </View>
   </View>
   <View style={styles.panel}>
    <Text style={styles.heading}>Local</Text>
    <Text style={styles.note}>{draft.latitude===null?'Ainda não escolheste um local.':'Escolhido: '+(draft.placeLabel||'local guardado')+'.'} Guardamos só um ponto aproximado (cerca de 1 km), nunca a tua localização em tempo real.</Text>
    <View style={styles.chips}>
     {PLACES.map(place=>{const selected=draft.placeLabel===place.label&&draft.latitude===place.latitude;
      return <Chip key={place.label} label={place.label} selected={selected} disabled={busy}
       onPress={()=>set({latitude:place.latitude,longitude:place.longitude,placeLabel:place.label})}/>;})}
    </View>
    <Button secondary title={locating?'A obter localização…':'Usar a minha localização aproximada'} disabled={busy||locating} onPress={()=>{void useMyPosition();}}/>
   </View>
   <View style={styles.panel}>
    <Text style={styles.heading}>Distância máxima</Text>
    <View style={styles.chips}>
     {RADII_KM.map(km=><Chip key={km} label={km+' km'} selected={draft.radiusKm===km} disabled={busy} onPress={()=>set({radiusKm:km})}/>)}
    </View>
   </View>
   <View style={styles.panel}>
    <Text style={styles.heading}>Modalidades</Text>
    <Text style={styles.note}>{draft.sports.length?`Só estas (máximo ${MAX_SPORTS}). Toca para retirar.`:'Todas as modalidades. Escolhe algumas para receberes só essas.'}</Text>
    {draft.sports.length?<View style={styles.chips}>{draft.sports.map(sport=><Chip key={sport} label={sport+'  ×'} selected disabled={busy}
     onPress={()=>{setNotice('');setDraft(current=>current?toggleSport(current,sport):current);}}/>)}</View>:null}
    <TextInput style={styles.search} placeholder="Procurar modalidade…" placeholderTextColor={C.muted} value={search}
     onChangeText={setSearch} accessibilityLabel="Procurar modalidade" editable={!busy&&draft.sports.length<MAX_SPORTS}/>
    {suggestions.length?<View style={styles.chips}>{suggestions.map(sport=><Chip key={sport} label={sport} selected={false} disabled={busy}
     onPress={()=>{setNotice('');setSearch('');setDraft(current=>current?toggleSport(current,sport):current);}}/>)}</View>:null}
   </View>
   {issue?<Message tone="error">{issue}</Message>:null}
   {notice?<Message>{notice}</Message>:null}
   <Button title={busy?'A guardar…':dirty?'Guardar':'Sem alterações'} disabled={busy||!dirty||!!issue} onPress={()=>{void save();}}/>
   {dirty?<Button secondary title="Descartar alterações" disabled={busy} onPress={()=>{setDraft(saved);setNotice('');setError('');}}/>:null}
  </>:null}
  <Button secondary title="Voltar" onPress={()=>router.back()}/>
 </Page>;
}
function Chip({label,selected,disabled,onPress}:{label:string;selected:boolean;disabled:boolean;onPress:()=>void}){
 return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{selected,disabled}} accessibilityLabel={label}
  style={[styles.chip,selected&&styles.chipSelected,disabled&&styles.dim]}>
  <Text style={[styles.chipText,selected&&styles.chipTextSelected]}>{label}</Text>
 </Pressable>;
}
const styles=StyleSheet.create({
 title:{fontSize:27,fontWeight:'900',color:C.white},sub:{color:C.muted,fontSize:14,lineHeight:20},
 panel:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:18,padding:16,gap:12},
 heading:{color:C.white,fontSize:17,fontWeight:'900'},
 row:{flexDirection:'row',alignItems:'center',gap:12},rowLabel:{flex:1,color:C.white,fontSize:15,fontWeight:'800'},
 note:{color:C.muted,fontSize:12,lineHeight:18},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:8},
 chip:{minHeight:MobileTheme.touchTarget,justifyContent:'center',paddingHorizontal:14,borderRadius:MobileTheme.radius.pill,borderWidth:1,borderColor:C.border,backgroundColor:C.background},
 chipSelected:{backgroundColor:C.mint,borderColor:C.mint},
 chipText:{color:C.white,fontSize:14,fontWeight:'800'},chipTextSelected:{color:C.background},
 search:{color:C.white,borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.background,padding:13,minHeight:50},
 dim:{opacity:.5}
});
