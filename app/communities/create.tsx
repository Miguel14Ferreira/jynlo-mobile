import React,{useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {createCommunity,creationQuota} from '../../src/lib/community-api';
import {normalizeCommunityInput} from '../../src/lib/community-core.cjs';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import {SPORTS} from '../../src/lib/sports';
import type {CommunityCreationQuota,CommunityVisibility} from '../../src/lib/types';
export default function CommunityCreateScreen(){
  const router=useRouter();const auth=useAuth();
  const params=useLocalSearchParams<{next?:string}>();
  const thenTournament=params.next==='tournament';
  const [name,setName]=useState('');const [description,setDescription]=useState('');
  const [selectedSports,setSelectedSports]=useState<string[]>([]);const [sportQuery,setSportQuery]=useState('');
  const [visibility,setVisibility]=useState<CommunityVisibility>('PRIVATE');
  const [saving,setSaving]=useState(false);const [error,setError]=useState('');
  const [quota,setQuota]=useState<CommunityCreationQuota|null>(null);const [quotaLoading,setQuotaLoading]=useState(true);
  useEffect(()=>{let alive=true;(async()=>{
    if(!auth.token||!auth.username){if(alive)setQuotaLoading(false);return;}
    try{const data=await creationQuota(auth.token,auth.username);if(alive)setQuota(data);}
    catch(e){if(alive)setError(e instanceof Error?e.message:'Não foi possível verificar o limite de criação.');}
    finally{if(alive)setQuotaLoading(false);}
  })();return()=>{alive=false;};},[auth.token,auth.username]);
  const normalized=sportQuery.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const suggestions=normalized?SPORTS.filter(s=>!selectedSports.includes(s)&&s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(normalized)).slice(0,10):[];
  const selectSport=(s:string)=>{setSelectedSports(current=>current.includes(s)?current:[...current,s]);setSportQuery('');};
  const removeSport=(s:string)=>setSelectedSports(current=>current.filter(value=>value!==s));
  async function submit(){
    if(saving||!auth.token||!auth.username||quota?.canCreate===false||quotaLoading)return;
    setError('');setSaving(true);
    try{
      const payload=normalizeCommunityInput({name,description,sport:selectedSports[0]||null,sports:selectedSports,visibility});
      const created=await createCommunity(payload,auth.token,auth.username);
      if(thenTournament)router.replace({pathname:'/tournaments/create',params:{communityId:String(created.id),...(selectedSports[0]?{sport:selectedSports[0]}:{})}});
      else router.replace({pathname:'/communities/[id]',params:{id:String(created.id),created:'1'}});
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a comunidade. Verifica as tuas comunidades antes de repetir.');}
    finally{setSaving(false);}
  }
  return <Page><DemoBanner/><Eyebrow>CRIAR COMUNIDADE</Eyebrow>
    <Text maxFontSizeMultiplier={1.3} style={styles.title}>Tudo começa com <Text style={{color:C.mint}}>uma boa malta.</Text></Text>
    <Text style={styles.subtitle}>{thenTournament?'Primeiro, a comunidade onde o torneio vai viver. A seguir passas logo à criação do torneio.':'Dá um nome ao grupo, escolhe o desporto e convida pessoas para jogar.'}</Text>
    {!auth.token?<Message>Precisas de iniciar sessão para criares uma comunidade.</Message>:null}
    {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push({pathname:'/login',params:{redirect:'/communities/create'}})}/>:null}
    {quotaLoading&&auth.token?<Loader/>:null}
    {quota?<Message>{quota.owned} de {quota.limit} comunidades próprias. {quota.canCreate?'Podes criar mais uma.':'A criação está temporariamente indisponível devido aos limites.'}</Message>:null}
    {error?<Message tone="error">{error}</Message>:null}
    <View style={styles.form}>
      <Text style={styles.label}>Nome da comunidade *</Text>
      <TextInput maxLength={100} style={styles.input} placeholder="Ex.: Futeboladas à Balda"
        placeholderTextColor={C.muted} value={name} onChangeText={setName} accessibilityLabel="Nome da comunidade"/>
      <Text style={styles.label}>Modalidades * · {selectedSports.length} selecionadas</Text>
      <Text style={styles.help}>Seleciona os desportos da comunidade. A primeira modalidade é a principal, sem esconder as restantes.</Text>
      {selectedSports.length?<View style={styles.sportsSelected}>
        {selectedSports.map((s,index)=><Pressable key={s} accessibilityRole="button"
          accessibilityLabel={'Retirar '+s} onPress={()=>removeSport(s)} style={styles.sportChip}>
          <Text style={styles.sportChipText}>{index===0?'★ ':''}{s}  ×</Text>
        </Pressable>)}
      </View>:<Text style={styles.help}>Escolhe pelo menos uma das 121 modalidades.</Text>}
      <TextInput style={styles.input} value={sportQuery} onChangeText={setSportQuery}
        placeholder="Pesquisar modalidades…" placeholderTextColor={C.muted} autoCorrect={false}
        accessibilityLabel="Pesquisar modalidades da comunidade"/>
      {suggestions.map(s=><Pressable key={s} onPress={()=>selectSport(s)}
        accessibilityRole="button" accessibilityLabel={'Adicionar '+s} style={styles.suggestion}>
        <Text style={{color:C.white,fontWeight:'700'}}>{s}</Text><Text style={{color:C.mint}}>+</Text>
      </Pressable>)}
      {sportQuery.trim()&&!suggestions.length?<Text style={styles.help}>Nenhuma outra modalidade corresponde à pesquisa.</Text>:null}
      <Text style={styles.label}>Visibilidade</Text>
      <View style={styles.visibility}>
        {(['PRIVATE','PUBLIC'] as const).map(value=><Pressable key={value} accessibilityRole="radio"
          accessibilityLabel={value==='PRIVATE'?'Comunidade privada':'Comunidade pública'}
          accessibilityState={{checked:visibility===value}} onPress={()=>setVisibility(value)}
          style={[styles.choice,visibility===value&&styles.active]}>
          <Text style={[styles.choiceText,visibility===value&&{color:C.background}]}>{value==='PRIVATE'?'🔒 Privada':'🌍 Pública'}</Text>
        </Pressable>)}
      </View>
      <Text style={styles.help}>{visibility==='PRIVATE'?'A entrada exige convite ou aprovação do organizador.':'Qualquer pessoa com conta poderá aderir.'}</Text>
      <Text style={styles.label}>Descrição (opcional)</Text>
      <TextInput style={[styles.input,styles.multi]} multiline maxLength={2000}
        value={description} onChangeText={setDescription} textAlignVertical="top"
        placeholder="Conta às pessoas o que podem esperar…" placeholderTextColor={C.muted} accessibilityLabel="Descrição da comunidade"/>
      <Button title={saving?'A criar…':'Criar comunidade'} disabled={saving||quotaLoading||!quota?.canCreate||!auth.token||name.trim().length<3||selectedSports.length===0}
        onPress={()=>{void submit();}}/>
      <Text style={styles.foot}>Após a criação podes enviar convites e organizar novas sessões.</Text>
    </View>
  </Page>;
}
const styles=StyleSheet.create({
  title:{fontSize:29,lineHeight:36,fontWeight:'900',color:C.white},subtitle:{color:C.muted,fontSize:14,lineHeight:21},
  form:{gap:12,padding:18,backgroundColor:C.surface,borderRadius:22,borderColor:C.border,borderWidth:1},
  label:{fontSize:14,color:C.white,fontWeight:'800',marginTop:5},input:{minHeight:52,color:C.white,backgroundColor:C.background,borderRadius:13,borderWidth:1,borderColor:C.border,paddingHorizontal:15,fontSize:15},
  multi:{minHeight:105,paddingTop:14},sportsSelected:{flexDirection:'row',flexWrap:'wrap',gap:8},
  sportChip:{borderColor:C.mint,borderWidth:1,backgroundColor:C.surface2,borderRadius:12,minHeight:44,justifyContent:'center',paddingVertical:8,paddingHorizontal:12},
  sportChipText:{color:C.mint,fontWeight:'800',fontSize:12},
  suggestion:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:44,padding:12,backgroundColor:C.surface2,borderRadius:11},
  visibility:{flexDirection:'row',gap:9},choice:{flex:1,paddingVertical:13,paddingHorizontal:10,borderRadius:13,alignItems:'center',backgroundColor:C.surface2},
  active:{backgroundColor:C.mint},choiceText:{color:C.white,fontWeight:'800',fontSize:13},
  help:{color:C.muted,fontSize:14,lineHeight:21},foot:{fontSize:13,lineHeight:20,color:C.muted,textAlign:'center'}
});
