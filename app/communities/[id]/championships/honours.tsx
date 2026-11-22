import React,{useCallback,useState} from 'react';
import {t} from '../../../../src/lib/i18n';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {championshipHonours,type ChampionshipHonours} from '../../../../src/lib/championship-api';
import {C} from '../../../../src/lib/theme';
import {sportName} from '../../../../src/lib/sport-names.cjs';

export default function ChampionshipHonoursScreen(){
 const {id}=useLocalSearchParams<{id:string}>();
 const communityId=Number(id),auth=useAuth(),router=useRouter();
 const [honours,setHonours]=useState<ChampionshipHonours|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useFocusEffect(useCallback(()=>{
  let active=true;
  setLoading(true);setError('');setHonours(null);
  async function load(){
   try{
    if(!auth.token||!Number.isSafeInteger(communityId)||communityId<=0)throw Error(t('Inicia sessão e seleciona uma comunidade válida.'));
    const result=await championshipHonours(communityId,auth.token);
    if(active)setHonours(result);
   }catch(e){if(active)setError(e instanceof Error?e.message:t('Não foi possível carregar o palmarés.'));}
   finally{if(active)setLoading(false);}
  }
  void load();return()=>{active=false;};
 },[communityId,auth.token,retry]));
 return <Page><DemoBanner/><Eyebrow>{t('HISTÓRICO DE CAMPEONATOS')}</Eyebrow>
  <Text style={styles.heading}>{t('Palmarés da comunidade')}</Text>
  <Text style={styles.hint}>{t('Só contam títulos de campeonatos oficialmente encerrados. Equipas de épocas diferentes não são associadas apenas pelo nome.')}</Text>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error?<Button secondary title={t('Tentar novamente')} onPress={()=>setRetry(n=>n+1)}/>:null}
  {honours?<View style={styles.card}>
   <Text style={styles.title}>{t('Épocas concluídas: {a}',{a:honours.completedSeasons})}</Text>
   {honours.titles.length===0?<Text style={styles.hint}>{t('Ainda não existem campeonatos concluídos com campeão confirmado.')}</Text>:null}
   {honours.titles.map(title=><Pressable key={title.championshipId} accessibilityRole="button" style={styles.entry}
    onPress={()=>router.push({pathname:'/communities/[id]/championships/[championshipId]',params:{id:String(communityId),championshipId:String(title.championshipId)}})}>
    <Text style={styles.name}>{title.championName}</Text>
    <Text style={styles.hint}>{title.championshipName} · {title.seasonLabel} · {sportName(title.sport)}</Text>
    <Text style={styles.hint}>{title.entryType==='TEAM'?t('Equipa campeã'):t('Campeão individual')}</Text>
   </Pressable>)}
  </View>:null}
  {honours&&honours.individualHonours.length>0?<View style={styles.card}>
   <Text style={styles.title}>{t('Atletas com mais títulos')}</Text>
   {honours.individualHonours.map((athlete,index)=><View key={athlete.profileId} style={styles.entry}>
    <Text style={styles.name}>{index+1}. {athlete.name}</Text>
    <Text style={styles.hint}>{athlete.titles===1?t('1 título'):t('{n} títulos',{n:athlete.titles})}</Text>
   </View>)}
  </View>:null}
  <Button secondary title={t('Voltar às competições')} onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 heading:{fontSize:25,fontWeight:'900',color:C.white},
 hint:{fontSize:13,lineHeight:19,color:C.muted},
 card:{padding:16,gap:12,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:18},
 title:{fontSize:18,fontWeight:'800',color:C.white},
 entry:{padding:12,gap:5,borderRadius:12,backgroundColor:C.surface2},
 name:{fontSize:15,fontWeight:'800',color:C.white}
});
