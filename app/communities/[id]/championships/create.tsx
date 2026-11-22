import React,{useEffect,useState} from 'react';
import {t} from '../../../../src/lib/i18n';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {communityDetails} from '../../../../src/lib/community-api';
import {createCommunityChampionship} from '../../../../src/lib/championship-api';
import {C} from '../../../../src/lib/theme';
import type {CommunityGroup,CommunitySummary} from '../../../../src/lib/types';

export default function CreateChampionship(){
 const {id}=useLocalSearchParams<{id:string}>();
 const communityId=Number(id),router=useRouter(),auth=useAuth();
 const [community,setCommunity]=useState<CommunityGroup|CommunitySummary|null>(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [name,setName]=useState(''),[sport,setSport]=useState(''),[seasonLabel,setSeasonLabel]=useState('');
 useEffect(()=>{
  let active=true;
  setLoading(true);setError('');setCommunity(null);
  if(!auth.token||!auth.username||!Number.isSafeInteger(communityId)||communityId<=0){
   setError(t('Inicia sessão e seleciona uma comunidade válida.'));setLoading(false);return()=>{active=false;};
  }
  void communityDetails(communityId,auth.token,auth.username).then(data=>{
   if(!active)return;
   setCommunity(data);
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:t('Não foi possível verificar a comunidade.'));})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[communityId,auth.token,auth.username]);
 const role=community&&'myRole' in community?community.myRole:null;
 const organizer=role==='OWNER'||role==='ADMIN';
 const sports=community?Array.from(new Set([
  ...('sports' in community&&Array.isArray(community.sports)?community.sports:[]),
  ...('sport' in community&&typeof community.sport==='string'?[community.sport]:[])
 ].filter((item):item is string=>typeof item==='string'&&item.trim().length>0))):[];
 async function submit(){
  if(saving||!organizer||!auth.token)return;
  setSaving(true);setError('');
  try{
   const result=await createCommunityChampionship(communityId,auth.token,{name,sport,seasonLabel});
   router.replace({pathname:'/communities/[id]/championships/[championshipId]',params:{id:String(communityId),championshipId:String(result.id)}});
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível criar o campeonato.'));}
  finally{setSaving(false);}
 }
 return <Page><DemoBanner/><Eyebrow>{t('NOVO CAMPEONATO')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.heading}>{t('Criar campeonato')}</Text>
  <Text style={styles.hint}>{t('Reúne várias provas da mesma modalidade numa época, com classificação geral.')}</Text>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {!loading&&!organizer&&community?<Message tone="error">{t('Só a organização da comunidade pode criar campeonatos.')}</Message>:null}
  {!loading&&organizer?<View style={styles.form}>
   <Text style={styles.label}>{t('Nome do campeonato')}</Text>
   <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={120} editable={!saving} placeholder={t('Ex.: Campeonato da comunidade')} placeholderTextColor={C.muted}/>
   <Text style={styles.label}>{t('Época')}</Text>
   <TextInput style={styles.input} value={seasonLabel} onChangeText={setSeasonLabel} maxLength={50} editable={!saving} placeholder={t('Ex.: 2026/2027')} placeholderTextColor={C.muted}/>
   <Text style={styles.label}>{t('Modalidade da comunidade')}</Text>
   {sports.length===0?<Message tone="error">{t('Esta comunidade não tem modalidades disponíveis para criar campeonatos.')}</Message>:null}
   {sports.map(item=><Pressable key={item} accessibilityRole="radio" accessibilityState={{selected:sport===item}} onPress={()=>setSport(item)} disabled={saving} style={[styles.choice,sport===item&&styles.selected]}>
    <Text style={styles.choiceText}>{sport===item?'● ':'○ '}{item}</Text>
   </Pressable>)}
   <Button title={saving?t('A criar…'):t('Criar campeonato')} disabled={saving||!name.trim()||!seasonLabel.trim()||!sport} onPress={()=>{void submit();}}/>
  </View>:null}
  <Button secondary title={t('Voltar às competições')} onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 heading:{fontSize:27,fontWeight:'900',color:C.white},
 hint:{fontSize:13,lineHeight:19,color:C.muted},
 form:{gap:12,padding:16,borderRadius:18,backgroundColor:C.surface,borderWidth:1,borderColor:C.border},
 label:{fontSize:13,fontWeight:'800',color:C.white},
 input:{borderWidth:1,borderColor:C.border,borderRadius:12,padding:13,color:C.white,backgroundColor:C.surface2,fontSize:15},
 choice:{padding:12,borderRadius:12,backgroundColor:C.surface2,borderWidth:1,borderColor:C.border},
 selected:{borderColor:C.mint},
 choiceText:{color:C.white,fontWeight:'700'}
});
