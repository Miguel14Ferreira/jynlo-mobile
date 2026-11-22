import React,{useEffect,useMemo,useState} from 'react';
import {t} from '../src/lib/i18n';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {getFirstSteps,saveFirstSteps,skipFirstSteps,sportsCatalog} from '../src/lib/first-steps-api';
import {MAX_SPORTS,sportChoices,toggleSport} from '../src/lib/first-steps-core.cjs';
import {C,MobileTheme} from '../src/lib/theme';
import {sportName} from '../src/lib/sport-names.cjs';
import {myCommunities,searchCommunities,setCommunityFollow} from '../src/lib/community-api';
import type {CommunitySummary} from '../src/lib/types';
import {suggestedCommunities} from '../src/lib/first-steps-core.cjs';

/** Right after signing up: which sports and which city, so Explorar shows the right games. */
export default function FirstStepsScreen(){
 const auth=useAuth(),router=useRouter();
 const [catalog,setCatalog]=useState<string[]>([]),[selected,setSelected]=useState<string[]>([]);
 const [city,setCity]=useState(''),[filter,setFilter]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 // Second step: communities in the chosen sports, so the app is not empty on day one.
 const [suggestions,setSuggestions]=useState<CommunitySummary[]|null>(null);
 const [followed,setFollowed]=useState<number[]>([]),[followBusy,setFollowBusy]=useState<number|null>(null);
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
   const found=await loadSuggestions();
   if(found.length)setSuggestions(found);else finish();
  }
  catch(e){setError(e instanceof Error&&e.message?e.message:t('Não foi possível guardar. Tenta novamente.'));}
  finally{setBusy(false);}
 }
 function finish(){router.replace({pathname:'/(tabs)/explore',params:{sport:selected[0]??'',city:city.trim()}});}
 async function loadSuggestions():Promise<CommunitySummary[]>{
  if(!auth.token||!auth.username)return [];
  try{
   const [mine,...pages]=await Promise.all([myCommunities(auth.token,auth.username).catch(()=>[]),
    ...selected.slice(0,3).map(sport=>searchCommunities('',sport,0).catch(()=>({communities:[],page:0,hasMore:false})))]);
   return suggestedCommunities(pages.map(page=>page.communities),mine.map(group=>group.id),8);
  }catch{return [];}
 }
 async function toggleFollow(id:number){
  if(!auth.token||!auth.username||followBusy!==null)return;
  const next=!followed.includes(id);
  setFollowBusy(id);setError('');
  try{
   await setCommunityFollow(id,auth.token,auth.username,next);
   setFollowed(list=>next?[...list,id]:list.filter(item=>item!==id));
  }catch(e){setError(e instanceof Error&&e.message?e.message:t('Não foi possível seguir a comunidade. Tenta novamente.'));}
  finally{setFollowBusy(null);}
 }
 async function later(){if(auth.username)await skipFirstSteps(auth.username);leave();}
 if(loading)return <Page><Loader/></Page>;
 if(suggestions)return <Page>
  <Eyebrow>{t('PRIMEIROS PASSOS · 2 DE 2')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Comunidades para ti')}</Text>
  <Text style={styles.text}>{t('Segue as que te interessam para acompanhares as novidades delas. Para entrar, abre a página de cada uma.')}</Text>
  {error?<Message tone="error">{error}</Message>:null}
  {suggestions.map(group=>{const on=followed.includes(group.id);return <View key={group.id} style={styles.community}>
   <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir comunidade {v}',{v:group.name})} style={{flex:1,gap:3}}
    onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(group.id)}})}>
    <Text style={styles.communityName} numberOfLines={1}>{group.name}</Text>
    <Text style={styles.count} numberOfLines={2}>{[group.sport?sportName(group.sport):null,group.description].filter(Boolean).join(' · ')}</Text>
   </Pressable>
   <Pressable accessibilityRole="button" accessibilityState={{selected:on,busy:followBusy===group.id}} disabled={followBusy!==null}
    accessibilityLabel={on?t('Deixar de seguir {v}',{v:group.name}):t('Seguir {v}',{v:group.name})}
    onPress={()=>void toggleFollow(group.id)} style={[styles.chip,on&&styles.chipOn]}>
    <Text style={[styles.chipText,on&&styles.chipTextOn]}>{on?t('✓ A seguir'):t('Seguir')}</Text>
   </Pressable>
  </View>;})}
  <Button title={t('Concluir e explorar')} onPress={finish} disabled={followBusy!==null}/>
 </Page>;
 return <Page>
  <Eyebrow>{t('PRIMEIROS PASSOS')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('O que gostas de jogar?')}</Text>
  <Text style={styles.text}>{t('Escolhe até {max} modalidades e a tua cidade. Abrimos Explorar já com os teus jogos, e quem procura parceiros na tua modalidade passa a encontrar-te. Podes mudar tudo no perfil.',{max:MAX_SPORTS})}</Text>
  {error?<Message tone="error">{error}</Message>:null}
  <TextInput value={filter} onChangeText={setFilter} placeholder={t('Procurar outra modalidade…')} placeholderTextColor={C.muted}
   style={styles.input} accessibilityLabel={t('Procurar modalidade')} maxLength={40}/>
  <View style={styles.chips}>
   {choices.map(sport=>{const on=selected.includes(sport);return <Pressable key={sport} onPress={()=>setSelected(toggleSport(selected,sport))}
    accessibilityRole="checkbox" accessibilityState={{checked:on}} accessibilityLabel={sportName(sport)} style={[styles.chip,on&&styles.chipOn]}>
    <Text style={[styles.chipText,on&&styles.chipTextOn]}>{on?'✓ ':''}{sportName(sport)}</Text></Pressable>;})}
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
 community:{flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 communityName:{color:C.white,fontWeight:'800',fontSize:15},
});
