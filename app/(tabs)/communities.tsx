import React,{useCallback,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {CommunityCard} from '../../src/components/CommunityUI';
import {DEMO_MODE} from '../../src/lib/api';
import {myCommunities,searchCommunities} from '../../src/lib/community-api';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import type {CommunityGroup,CommunitySummary} from '../../src/lib/types';

type Mode='mine'|'explore';
export default function CommunitiesScreen(){
  const auth=useAuth();const router=useRouter();
  const [mode,setMode]=useState<Mode>('mine');const [term,setTerm]=useState('');
  const [mine,setMine]=useState<CommunityGroup[]>([]);const [results,setResults]=useState<CommunitySummary[]>([]);
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const load=useCallback(async()=>{
    setError('');setLoading(true);
    try{
      if(mode==='mine')setMine(auth.token&&auth.username?await myCommunities(auth.token,auth.username):[]);
      else setResults((await searchCommunities(term.trim())).communities);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar as comunidades.');}
    finally{setLoading(false);}
  },[mode,term,auth.token,auth.username]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const list=mode==='mine'?mine:results;
  const open=(id:number)=>router.push({pathname:'/communities/[id]',params:{id:String(id)}});
  return <Page>
    <Brand subtitle="ENCONTRA AS TUAS PESSOAS"/><DemoBanner/>
    <View style={styles.hero}>
      <Eyebrow>JUNTOS É OUTRO JOGO</Eyebrow>
      <Text style={styles.headline}>A tua malta.{"\n"}<Text style={{color:C.mint}}>A tua comunidade.</Text></Text>
      <Text style={styles.sub}>De uma sessão podem nascer amizades, equipas e grandes desafios.</Text>
    </View>
    <View style={styles.actions}>
      <View style={{flex:1}}><Button title="+ Criar comunidade" onPress={()=>auth.token?router.push('/communities/create'):router.push({pathname:'/login',params:{redirect:'/communities/create'}})}/></View>
      <Pressable accessibilityRole="button" onPress={()=>auth.token?router.push('/communities/invites'):router.push('/login')}
        style={styles.inbox}><Text style={styles.inboxIcon}>✉</Text><Text style={styles.inboxLabel}>Convites</Text></Pressable>
    </View>
    <View style={styles.segment}>
      {(['mine','explore'] as const).map(tab=><Pressable key={tab} onPress={()=>setMode(tab)}
        accessibilityRole="tab" accessibilityState={{selected:mode===tab}}
        style={[styles.segmentTab,mode===tab&&styles.segmentActive]}>
        <Text style={[styles.segmentText,mode===tab&&{color:C.background}]}>{tab==='mine'?'As minhas':'Explorar'}</Text>
      </Pressable>)}
    </View>
    {mode==='explore'?<TextInput style={styles.input} value={term} onChangeText={setTerm}
      placeholder="Pesquisar comunidades…" placeholderTextColor={C.muted} autoCapitalize="none" accessibilityLabel="Pesquisar comunidades"/>:null}
    {mode==='mine'&&!auth.token?<Message>Inicia sessão para veres as comunidades de que fazes parte. Podes explorar comunidades públicas mesmo sem conta.</Message>:null}
    {loading?<Loader/>:null}
    {error?<Message tone="error">{error}</Message>:null}
    {!loading&&!error&&list.length===0?<View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{mode==='mine'?'🤝':'⌕'}</Text>
      <Text style={styles.emptyTitle}>{mode==='mine'?'Ainda não tens comunidades':'Não encontrámos comunidades'}</Text>
      <Text style={styles.sub}>{mode==='mine'?'Cria a tua primeira comunidade ou explora as existentes.':'Experimenta outro nome ou pesquisa novamente.'}</Text>
      {mode==='mine'?<Button title="Explorar comunidades" secondary onPress={()=>setMode('explore')}/>:null}
    </View>:null}
    {list.map(item=><CommunityCard key={item.id} community={item}
      memberCount={'memberCount' in item?(item as CommunityGroup).memberCount:undefined}
      role={'myRole' in item?(item as CommunityGroup).myRole:null} onPress={()=>open(item.id)}/>)}
    {DEMO_MODE?<Text style={styles.note}>Demonstração: cria uma comunidade, termina sessão e entra como André para aceitares o convite.</Text>:null}
  </Page>;
}
const styles=StyleSheet.create({
  hero:{gap:12},headline:{fontSize:30,lineHeight:37,color:C.white,fontWeight:'900'},sub:{color:C.muted,fontSize:14,lineHeight:21},
  actions:{flexDirection:'row',alignItems:'stretch',gap:10},inbox:{minWidth:80,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:17,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:11},
  inboxIcon:{fontSize:22,color:C.mint},inboxLabel:{fontSize:11,color:C.white,fontWeight:'800'},
  segment:{flexDirection:'row',padding:5,borderRadius:15,backgroundColor:C.surface,gap:4},segmentTab:{flex:1,alignItems:'center',paddingVertical:12,borderRadius:11},
  segmentActive:{backgroundColor:C.mint},segmentText:{color:C.white,fontSize:13,fontWeight:'800'},
  input:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,color:C.white,height:52,borderRadius:14,paddingHorizontal:15},
  empty:{alignItems:'center',padding:23,backgroundColor:C.surface,borderRadius:22,gap:13},emptyEmoji:{fontSize:42},emptyTitle:{fontSize:18,color:C.white,fontWeight:'800'},
  note:{color:C.muted,fontSize:11,lineHeight:16,textAlign:'center'}
});
