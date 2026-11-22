import React,{useEffect,useMemo,useState} from 'react';
import {t} from '../src/lib/i18n';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {getFirstSteps,saveFirstSteps,skipFirstSteps,sportsCatalog} from '../src/lib/first-steps-api';
import {MAX_SPORTS,sportChoices,toggleSport} from '../src/lib/first-steps-core.cjs';
import {C,MobileTheme} from '../src/lib/theme';

/** Right after signing up: which sports and which city, so Explorar shows the right games. */
export default function FirstStepsScreen(){
 const auth=useAuth(),router=useRouter();
 const [catalog,setCatalog]=useState<string[]>([]),[selected,setSelected]=useState<string[]>([]);
 const [city,setCity]=useState(''),[filter,setFilter]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(!auth.token){setLoading(false);return;}
  let active=true;
  void Promise.all([sportsCatalog(auth.token),getFirstSteps(auth.token)]).then(([list,state])=>{
   if(!active)return;
   setCatalog(list);setSelected(state.favoriteSports.filter(s=>list.includes(s)));setCity(state.location||'');
  }).catch(()=>{if(active)setError(t('Não foi possível carregar as modalidades. Tenta mais tarde no teu perfil.'));})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[auth.token]);
 const choices=useMemo(()=>sportChoices(catalog,filter,selected),[catalog,filter,selected]);
 const leave=()=>{if(router.canGoBack())router.back();else router.replace('/(tabs)');};
 async function save(){
  if(!auth.token||busy)return;
  if(!selected.length){setError(t('Escolhe pelo menos uma modalidade.'));return;}
  setBusy(true);setError('');
  try{
   await saveFirstSteps(auth.token,selected,city.trim());
   router.replace({pathname:'/(tabs)/explore',params:{sport:selected[0]??'',city:city.trim()}});
  }
  catch(e){setError(e instanceof Error&&e.message?e.message:t('Não foi possível guardar. Tenta novamente.'));}
  finally{setBusy(false);}
 }
 async function later(){if(auth.username)await skipFirstSteps(auth.username);leave();}
 if(loading)return <Page><Loader/></Page>;
 return <Page>
  <Eyebrow>{t('PRIMEIROS PASSOS')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('O que gostas de jogar?')}</Text>
  <Text style={styles.text}>{t('Escolhe até {max} modalidades e a tua cidade. Abrimos Explorar já com os teus jogos, e quem procura parceiros na tua modalidade passa a encontrar-te. Podes mudar tudo no perfil.',{max:MAX_SPORTS})}</Text>
  {error?<Message tone="error">{error}</Message>:null}
  <TextInput value={filter} onChangeText={setFilter} placeholder={t('Procurar outra modalidade…')} placeholderTextColor={C.muted}
   style={styles.input} accessibilityLabel={t('Procurar modalidade')} maxLength={40}/>
  <View style={styles.chips}>
   {choices.map(sport=>{const on=selected.includes(sport);return <Pressable key={sport} onPress={()=>setSelected(toggleSport(selected,sport))}
    accessibilityRole="checkbox" accessibilityState={{checked:on}} accessibilityLabel={sport} style={[styles.chip,on&&styles.chipOn]}>
    <Text style={[styles.chipText,on&&styles.chipTextOn]}>{on?'✓ ':''}{sport}</Text></Pressable>;})}
   {!choices.length?<Text style={styles.text}>{t('Nenhuma modalidade encontrada.')}</Text>:null}
  </View>
  <Text style={styles.count}>{t('{count}/{max} escolhidas',{count:selected.length,max:MAX_SPORTS})}</Text>
  <Text style={styles.label}>{t('Cidade')}</Text>
  <TextInput value={city} onChangeText={setCity} placeholder={t('Ex.: Porto')} placeholderTextColor={C.muted} style={styles.input}
   accessibilityLabel={t('Cidade')} maxLength={120} autoCapitalize="words"/>
  <Button title={busy?t('A guardar…'):t('Guardar e explorar')} onPress={()=>void save()} disabled={busy||!selected.length}/>
  <Button title={t('Agora não')} secondary onPress={()=>void later()} disabled={busy}/>
 </Page>;
}

const styles=StyleSheet.create({
 title:{color:C.white,fontSize:26,lineHeight:32,fontWeight:'900'},
 text:{color:C.muted,fontSize:14,lineHeight:21},
 label:{color:C.white,fontWeight:'800',fontSize:15,marginTop:4},
 count:{color:C.muted,fontSize:12},
 input:{borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.surface,color:C.white,paddingHorizontal:14,minHeight:MobileTheme.touchTarget,fontSize:15},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:8},
 chip:{borderWidth:1,borderColor:C.border,borderRadius:999,paddingHorizontal:14,paddingVertical:10,minHeight:44,justifyContent:'center',backgroundColor:C.surface},
 chipOn:{borderColor:C.mint,backgroundColor:'rgba(42,224,202,0.16)'},
 chipText:{color:C.white,fontWeight:'700'},
 chipTextOn:{color:C.mint},
});
