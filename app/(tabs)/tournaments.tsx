import React,{useCallback,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {myTournaments} from '../../src/lib/competition-api';
import {classificationKind,label} from '../../src/lib/competition-core.cjs';
import {STATUSES,availableSports,filterTournaments,sportIcon} from '../../src/lib/tournament-discovery-core.cjs';
import {C} from '../../src/lib/theme';
import type {JynloTournament} from '../../src/lib/types';
type Entry={communityId:number;communityName:string;tournament:JynloTournament};
export default function TournamentsScreen(){
 const auth=useAuth(),router=useRouter();const [items,setItems]=useState<Entry[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [query,setQuery]=useState(''),[status,setStatus]=useState('ALL'),[sport,setSport]=useState('ALL');
 const load=useCallback(async()=>{
   if(!auth.token||!auth.username){setItems([]);setLoading(false);return;}
   setLoading(true);setError('');
   try{setItems(await myTournaments(auth.token,auth.username));}
   catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar os torneios.');}
   finally{setLoading(false);}
 },[auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const sports=useMemo(()=>availableSports(items),[items]);
 const filtered=useMemo(()=>filterTournaments(items,{query,status,sport}),[items,query,status,sport]);
 return <Page><Brand subtitle="A COMPETIÇÃO ACONTECE AQUI"/><DemoBanner/>
  <Eyebrow>ALÉM DA PRIMEIRA SESSÃO</Eyebrow><Text style={styles.title}>Torneios</Text>
  <Text style={styles.sub}>Encontra as competições das tuas comunidades e a classificação certa para cada modalidade.</Text>
  {!auth.token?<Button title="Entrar para ver torneios" onPress={()=>router.push('/login')}/>:null}
  {auth.token?<Button title="Criar torneio" onPress={()=>router.push('/tournaments/create')}/>:null}
  {auth.token?<View style={styles.filters}>
    <TextInput style={styles.search} value={query} onChangeText={setQuery} autoCorrect={false}
      placeholder="Procurar torneio, comunidade ou desporto…" placeholderTextColor={C.muted}
      accessibilityLabel="Procurar torneios"/>
    <Text style={styles.filterLabel}>ESTADO DA COMPETIÇÃO</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {STATUSES.map(x=><Pressable key={x.value} accessibilityRole="button"
        accessibilityState={{selected:status===x.value}}
        onPress={()=>setStatus(x.value)} style={[styles.chip,status===x.value&&styles.selected]}>
        <Text style={[styles.chipText,status===x.value&&styles.selectedText]}>{x.label}</Text>
      </Pressable>)}
    </ScrollView>
    {sports.length>1?<><Text style={styles.filterLabel}>MODALIDADE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {['ALL',...sports].map(value=><Pressable key={value} accessibilityRole="button"
          accessibilityState={{selected:sport===value}}
          onPress={()=>setSport(value)} style={[styles.chip,sport===value&&styles.selected]}>
          <Text style={[styles.chipText,sport===value&&styles.selectedText]}>{value==='ALL'?'Todas':value}</Text>
        </Pressable>)}
      </ScrollView></>:null}
  </View>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {!loading&&!error&&auth.token&&items.length===0?<Message>Ainda não existem torneios nas tuas comunidades. Junta-te a uma comunidade para os descobrires.</Message>:null}
  {!loading&&!error&&items.length>0?<Text style={styles.count}>{filtered.length} {filtered.length===1?'torneio encontrado':'torneios encontrados'} de {items.length}</Text>:null}
  {!loading&&!error&&items.length>0&&filtered.length===0?<Message>Não existem torneios com estes filtros. Experimenta outra modalidade ou estado.</Message>:null}
  {!loading&&!error?filtered.map(x=><Pressable key={`${x.communityId}-${x.tournament.id}`}
    onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(x.communityId),id:String(x.tournament.id)}})}
    style={styles.card}>
    <View style={styles.row}><Text style={styles.sport}>{sportIcon(x.tournament.sport)}</Text><View style={{flex:1}}><Text style={styles.name}>{x.tournament.name}</Text><Text style={styles.sub}>{x.communityName}</Text></View><Text style={styles.arrow}>›</Text></View>
    <Text style={styles.classification}>{label(classificationKind(x.tournament))}</Text>
    <Text style={styles.sub}>{x.tournament.status==='DRAFT'?'Em preparação':x.tournament.status==='IN_PROGRESS'?'A decorrer':'Concluído'} · {x.tournament.sport}</Text>
  </Pressable>):null}
  <Message>Quando a modalidade tem regras ainda não validadas no mobile, mostramos essa limitação em vez de inventar classificações de futebol.</Message>
 </Page>;
}
const styles=StyleSheet.create({title:{fontSize:32,fontWeight:'900',color:C.white},sub:{fontSize:13,lineHeight:20,color:C.muted},card:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:19,padding:17,gap:12},
 row:{flexDirection:'row',alignItems:'center',gap:12},sport:{fontSize:27},name:{fontSize:17,fontWeight:'900',color:C.white},arrow:{fontSize:30,color:C.mint},classification:{color:C.mint,fontWeight:'800',fontSize:12},
 filters:{gap:10,marginTop:6},
 search:{minHeight:52,paddingHorizontal:15,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,color:C.white,borderRadius:16,fontSize:14},
 filterLabel:{color:C.muted,fontWeight:'800',fontSize:10,letterSpacing:1.1},
 chips:{gap:9,paddingVertical:3},
 chip:{paddingHorizontal:14,paddingVertical:10,borderRadius:24,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 selected:{backgroundColor:C.mint,borderColor:C.mint},
 chipText:{fontSize:12,fontWeight:'800',color:C.white},selectedText:{color:C.background},
 count:{fontSize:12,fontWeight:'800',color:C.muted}
});
