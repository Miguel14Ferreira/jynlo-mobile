import React,{useCallback,useRef,useState} from 'react';
import {t} from '../../../../src/lib/i18n';
import {Alert,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {C} from '../../../../src/lib/theme';
import {communityDetails} from '../../../../src/lib/community-api';
import {communityChampionships} from '../../../../src/lib/championship-api';
import {
 listOwnedEvents,listOwnedFixtures,championshipTeamPlayers,
 ownedFixtureGoals,addOwnedFixtureGoal,ownedFixtureCards,addOwnedFixtureCard,
 ownedFixtureLineup,setOwnedFixtureLineup,ownedFixtureSubstitutions,addOwnedFixtureSubstitution,
 removeOwnedFixtureGoal,removeOwnedFixtureCard,removeOwnedFixtureLineup,removeOwnedFixtureSubstitution,
 type OwnedFixture,type ChampionshipTeamPlayer,type OwnedGoal,type OwnedCard,type OwnedLineup,type OwnedSubstitution
} from '../../../../src/lib/championship-owned-events-api';

type Mode='GOAL'|'CARD'|'LINEUP'|'SUB';
type FixturePlayer=ChampionshipTeamPlayer&{teamId:number};
const valid=(n:number)=>Number.isSafeInteger(n)&&n>0;

export default function ChampionshipFixtureScreen(){
 const {id,championshipId,eventId,fixtureId}=useLocalSearchParams<{id:string;championshipId:string;eventId:string;fixtureId:string}>();
 const cid=Number(id),chid=Number(championshipId),eid=Number(eventId),fid=Number(fixtureId);
 const auth=useAuth(),router=useRouter();
 const [fixture,setFixture]=useState<OwnedFixture|null>(null),[canWrite,setCanWrite]=useState(false);
 const [roster,setRoster]=useState<FixturePlayer[]>([]);
 const [goals,setGoals]=useState<OwnedGoal[]>([]),[cards,setCards]=useState<OwnedCard[]>([]);
 const [lineup,setLineup]=useState<OwnedLineup[]>([]),[subs,setSubs]=useState<OwnedSubstitution[]>([]);
 const [selectedTeam,setSelectedTeam]=useState<number|null>(null),[player,setPlayer]=useState<number|null>(null),[other,setOther]=useState<number|null>(null);
 const [assist,setAssist]=useState<number|null>(null);
 const [minute,setMinute]=useState('0'),[cardType,setCardType]=useState<'YELLOW'|'RED'>('YELLOW');
 const [selection,setSelection]=useState<'STARTER'|'BENCH'>('STARTER');
 const [mode,setMode]=useState<Mode>('GOAL');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),pending=useRef(false),reloadRequest=useRef(0);
 const reload=useCallback(async(version=generation.current)=>{
  const request=++reloadRequest.current;
  if(!auth.token||!auth.username||![cid,chid,eid,fid].every(valid)){
   if(version===generation.current&&request===reloadRequest.current){setError(t('Jogo ou jogo inválido.'));setLoading(false);}return;
  }
  // Fail closed: a failed refresh must never leave the previous match editable.
  if(version===generation.current&&request===reloadRequest.current){setLoading(true);setError('');setCanWrite(false);setFixture(null);setRoster([]);}
  try{
   const [championships,group,events,fixtures]=await Promise.all([
    communityChampionships(cid,auth.token),communityDetails(cid,auth.token,auth.username),
    listOwnedEvents(cid,chid,auth.token),listOwnedFixtures(cid,chid,eid,auth.token)
   ]);
   if(version!==generation.current||request!==reloadRequest.current)return;
   const championship=championships.find(c=>c.id===chid);
   const event=events.find(e=>e.id===eid);
   const match=fixtures.find(f=>f.id===fid);
   if(!championship||championship.communityId!==cid||group.id!==cid||!event||!match)throw Error(t('Jogo não encontrado neste campeonato.'));
   const role='myRole' in group?group.myRole:null;
   if(!role)throw Error(t('É necessário pertencer à comunidade.'));
   const editable=(role==='OWNER'||role==='ADMIN')&&!championship.closedAt&&
     (championship.sport==='Futebol'||championship.sport==='Futsal')&&
     event.format==='LEAGUE'&&event.status==='SCHEDULED'&&match.homeScore!=null&&match.awayScore!=null;
   const token=auth.token;
   const [playersHome,playersAway,g,c,l,sub]=await Promise.all([
    championshipTeamPlayers(cid,chid,match.homeTeamId,token),
    championshipTeamPlayers(cid,chid,match.awayTeamId,token),
    ownedFixtureGoals(cid,chid,eid,fid,token),
    ownedFixtureCards(cid,chid,eid,fid,token),
    ownedFixtureLineup(cid,chid,eid,fid,token),
    ownedFixtureSubstitutions(cid,chid,eid,fid,token)
   ]);
   if(version!==generation.current||request!==reloadRequest.current)return;
   // The two rosters are kept distinct: one player cannot be assigned to the opposing team.
   setFixture(match);setCanWrite(editable);
   setRoster([...playersHome.map(p=>({...p,teamId:match.homeTeamId})),
              ...playersAway.map(p=>({...p,teamId:match.awayTeamId}))]);
   setGoals(g);setCards(c);setLineup(l);setSubs(sub);
   setSelectedTeam(current=>current===match.homeTeamId||current===match.awayTeamId?current:match.homeTeamId);
  }catch(e){if(version===generation.current&&request===reloadRequest.current)setError(e instanceof Error?e.message:t('Não foi possível consultar os acontecimentos do jogo.'));}
  finally{if(version===generation.current&&request===reloadRequest.current)setLoading(false);}
 },[cid,chid,eid,fid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  setFixture(null);setCanWrite(false);setRoster([]);setError('');setLoading(true);
  void reload(version);
  return()=>{generation.current++;reloadRequest.current++;};
 },[reload]));
 const selectedRoster=roster.filter(p=>p.teamId===selectedTeam);
 const selectedPlayer=selectedRoster.find(p=>p.profileId===player);
 const selectedOther=selectedRoster.find(p=>p.profileId===other);
 const parsedMinute=Number(minute);
 const validMinute=/^\d{1,3}$/.test(minute)&&Number.isSafeInteger(parsedMinute)&&parsedMinute<=200;
 function chooseTeam(teamId:number){
  setSelectedTeam(teamId);setPlayer(null);setOther(null);setAssist(null);
 }
 async function perform(action:()=>Promise<unknown>){
  if(!canWrite||loading||pending.current||!fixture)return;
  pending.current=true;setBusy(true);setError('');
  const version=generation.current;
  try{
   await action();
   if(version===generation.current){setPlayer(null);setOther(null);setAssist(null);await reload(version);}
  }catch(e){
   if(version===generation.current){
    // The request may have committed before the network failure. Revoke edit
    // permission until a fresh, authoritative fixture history is loaded.
    setCanWrite(false);setFixture(null);setRoster([]);setGoals([]);setCards([]);setLineup([]);setSubs([]);
    setError((e instanceof Error?e.message:t('Não foi possível registar o acontecimento.'))+
     ' '+t('O acontecimento pode ter sido guardado. Recarrega o jogo para confirmar antes de repetir.'));
   }
  }finally{pending.current=false;if(version===generation.current)setBusy(false);}
 }
 function removeEvent(description:string,action:()=>Promise<void>){
  if(!canWrite||loading||pending.current)return;
  const version=generation.current;
  Alert.alert(t('Remover acontecimento?'),description+' '+t('Esta alteração será guardada no servidor.'),[
   {text:t('Cancelar'),style:'cancel'},
   {text:t('Remover'),style:'destructive',onPress:()=>{
    if(version!==generation.current)return;
    void perform(action);
   }}
  ]);
 }
 function confirm(){
  if(!canWrite||loading||!selectedTeam||!player||!selectedPlayer||pending.current)return;
  if(mode!=='LINEUP'&&!validMinute){setError(t('Indica um minuto entre 0 e 200.'));return;}
  if(mode==='SUB'&&(!other||other===player||!selectedOther)){setError(t('Escolhe dois jogadores diferentes da mesma equipa.'));return;}
  if(mode==='GOAL'&&assist!=null&&(assist===player||!selectedRoster.some(p=>p.profileId===assist))){
   setError(t('A assistência deve ser de outro jogador da mesma equipa.'));return;
  }
  const label=mode==='GOAL'?t('Golo'):mode==='CARD'?t('Cartão'):mode==='LINEUP'?t('Convocatória'):t('Substituição');
  const version=generation.current;
  Alert.alert(t('Confirmar {v}',{v:label.toLowerCase()})+'?',selectedPlayer.displayName+' · '+(mode==='LINEUP'?selection:minute+' min'),[
   {text:t('Cancelar'),style:'cancel'},
   {text:t('Registar'),onPress:()=>{
    if(version!==generation.current)return;
    void perform(()=>{
    switch(mode){
     case 'GOAL':return addOwnedFixtureGoal(cid,chid,eid,fid,selectedTeam,player,parsedMinute,auth.token!,assist);
     case 'CARD':return addOwnedFixtureCard(cid,chid,eid,fid,selectedTeam,player,cardType,parsedMinute,auth.token!);
     case 'LINEUP':return setOwnedFixtureLineup(cid,chid,eid,fid,selectedTeam,player,selection,auth.token!);
     case 'SUB':return addOwnedFixtureSubstitution(cid,chid,eid,fid,selectedTeam,player,other!,parsedMinute,auth.token!);
    }
   });}}
  ]);
 }
 return <Page><DemoBanner/><Eyebrow>{t('CAMPEONATO · ACONTECIMENTOS')}</Eyebrow>
  <Text style={styles.heading}>{t('Detalhe do jogo')}</Text>
  {loading?<Loader/>:null}
  {!!error?<Message tone="error">{error}</Message>:null}
  {error?<Button secondary title={t('Recarregar')} onPress={()=>{void reload();}}/>:null}
  {fixture?<View style={styles.card}>
   <Text style={styles.name}>{fixture.homeTeamName} — {fixture.awayTeamName}</Text>
   <Text style={styles.note}>{t('Jornada {a} · Jogo {b}',{a:fixture.round,b:fixture.match})}</Text>
   <Text style={styles.result}>{fixture.homeScore==null?'–':fixture.homeScore} : {fixture.awayScore==null?'–':fixture.awayScore}</Text>
  </View>:null}
  {!loading&&fixture&&!canWrite?<Message>{t('Os acontecimentos estão disponíveis para consulta. A edição exige um organizador, uma liga ativa de Futebol/Futsal e um resultado registado.')}</Message>:null}
  {fixture?<View style={styles.card}>
   <Text style={styles.title}>{t('Golos ({a})',{a:goals.length})}</Text>
   {goals.map(g=><View key={g.id} style={styles.row}><Text style={styles.note}>⚽ {g.scorerName} · {g.teamName}{g.minute==null?'':' · '+g.minute+"'"}{g.assisterName?' · '+t('Assistência: {v}',{v:g.assisterName}):''}</Text>
    {canWrite?<Button secondary title={t('Remover')} disabled={busy} onPress={()=>removeEvent(t('Golo de {v}',{v:g.scorerName}),()=>removeOwnedFixtureGoal(cid,chid,eid,fid,g.id,auth.token!))}/>:null}
   </View>)}
   <Text style={styles.title}>{t('Cartões ({a})',{a:cards.length})}</Text>
   {cards.map(c=><View key={c.id} style={styles.row}><Text style={styles.note}>{c.cardType==='RED'?'🟥':'🟨'} {c.playerName} · {c.teamName}{c.minute==null?'':' · '+c.minute+"'"}</Text>
    {canWrite?<Button secondary title={t('Remover')} disabled={busy} onPress={()=>removeEvent(t('Cartão de {v}',{v:c.playerName}),()=>removeOwnedFixtureCard(cid,chid,eid,fid,c.id,auth.token!))}/>:null}
   </View>)}
   <Text style={styles.title}>{t('Convocatória ({a})',{a:lineup.length})}</Text>
   {lineup.map(l=><View key={l.id} style={styles.row}><Text style={styles.note}>{l.playerName} · {l.selection==='STARTER'?t('Titular'):t('Suplente')}</Text>
    {canWrite?<Button secondary title={t('Remover')} disabled={busy} onPress={()=>removeEvent(t('Convocatória de {v}',{v:l.playerName}),()=>removeOwnedFixtureLineup(cid,chid,eid,fid,l.profileId,auth.token!))}/>:null}
   </View>)}
   <Text style={styles.title}>{t('Substituições ({a})',{a:subs.length})}</Text>
   {subs.map(s=><View key={s.id} style={styles.row}><Text style={styles.note}>{s.minute}' · {s.playerOutName} → {s.playerInName} · {s.teamName}</Text>
    {canWrite?<Button secondary title={t('Remover')} disabled={busy} onPress={()=>removeEvent(t('Substituição de {v}',{v:s.playerOutName}),()=>removeOwnedFixtureSubstitution(cid,chid,eid,fid,s.id,auth.token!))}/>:null}
   </View>)}
  </View>:null}
  {canWrite?<View style={styles.card}>
   <Text style={styles.title}>{t('Registar acontecimento')}</Text>
   <View style={styles.row}>
    {(['GOAL','CARD','LINEUP','SUB'] as const).map(m=><Pressable key={m} accessibilityRole="radio" accessibilityState={{selected:mode===m}}
     disabled={busy} onPress={()=>{setMode(m);setPlayer(null);setOther(null);setAssist(null);}} style={[styles.chip,mode===m&&styles.selected]}>
     <Text style={styles.note}>{m==='GOAL'?t('Golo'):m==='CARD'?t('Cartão'):m==='LINEUP'?t('Convocatória'):t('Substituição')}</Text>
    </Pressable>)}
   </View>
   <Text style={styles.note}>{t('Equipa')}</Text>
   <View style={styles.row}>
    {[{id:fixture!.homeTeamId,name:fixture!.homeTeamName},{id:fixture!.awayTeamId,name:fixture!.awayTeamName}].map(team=><Pressable key={team.id} disabled={busy} onPress={()=>chooseTeam(team.id)}
     style={[styles.chip,selectedTeam===team.id&&styles.selected]} accessibilityRole="radio" accessibilityState={{selected:selectedTeam===team.id}}>
     <Text style={styles.note}>{team.name}</Text>
    </Pressable>)}
   </View>
   <Text style={styles.note}>{mode==='SUB'?t('Jogador a sair'):t('Jogador')}</Text>
   {selectedRoster.length===0?<Text style={styles.note}>{t('Não existem jogadores confirmados no plantel desta equipa.')}</Text>:null}
   {selectedRoster.map(p=><Pressable key={p.profileId} disabled={busy} onPress={()=>{setPlayer(p.profileId);setAssist(null);}} accessibilityRole="radio"
    accessibilityState={{selected:player===p.profileId}} style={[styles.chip,player===p.profileId&&styles.selected]}>
    <Text style={styles.note}>{p.displayName||p.username}</Text></Pressable>)}
   {mode==='GOAL'&&player?<><Text style={styles.note}>{t('Assistência (opcional)')}</Text>
    <View style={styles.row}>
     <Pressable accessibilityRole="radio" accessibilityState={{selected:assist===null}} disabled={busy} onPress={()=>setAssist(null)} style={[styles.chip,assist===null&&styles.selected]}><Text style={styles.note}>{t('Sem assistência')}</Text></Pressable>
     {selectedRoster.filter(p=>p.profileId!==player).map(p=><Pressable key={p.profileId} accessibilityRole="radio" accessibilityState={{selected:assist===p.profileId}} disabled={busy} onPress={()=>setAssist(p.profileId)} style={[styles.chip,assist===p.profileId&&styles.selected]}><Text style={styles.note}>{p.displayName||p.username}</Text></Pressable>)}
    </View>
   </>:null}
   {mode==='SUB'?<><Text style={styles.note}>{t('Jogador a entrar')}</Text>
    {selectedRoster.filter(p=>p.profileId!==player).map(p=><Pressable key={p.profileId} disabled={busy} onPress={()=>setOther(p.profileId)} style={[styles.chip,other===p.profileId&&styles.selected]} accessibilityRole="radio" accessibilityState={{selected:other===p.profileId}}>
     <Text style={styles.note}>{p.displayName||p.username}</Text></Pressable>)}
   </>:null}
   {mode==='CARD'?<View style={styles.row}>
    {(['YELLOW','RED'] as const).map(c=><Pressable key={c} disabled={busy} onPress={()=>setCardType(c)} style={[styles.chip,cardType===c&&styles.selected]} accessibilityRole="radio" accessibilityState={{selected:cardType===c}}>
     <Text style={styles.note}>{c==='YELLOW'?t('Amarelo'):t('Vermelho')}</Text></Pressable>)}
   </View>:null}
   {mode==='LINEUP'?<View style={styles.row}>
    {(['STARTER','BENCH'] as const).map(c=><Pressable key={c} disabled={busy} onPress={()=>setSelection(c)} style={[styles.chip,selection===c&&styles.selected]} accessibilityRole="radio" accessibilityState={{selected:selection===c}}>
     <Text style={styles.note}>{c==='STARTER'?t('Titular'):t('Suplente')}</Text></Pressable>)}
   </View>:<TextInput value={minute} onChangeText={setMinute} editable={!busy} keyboardType="number-pad" maxLength={3} accessibilityLabel={t('Minuto do acontecimento')}
     style={styles.input} placeholder={t('Minuto (0 a 200)')} placeholderTextColor={C.muted}/>}
   <Button title={busy?t('A registar…'):t('Confirmar acontecimento')}
    disabled={busy||!player||!selectedPlayer||(mode==='SUB'&&(!other||!selectedOther||other===player))||(mode!=='LINEUP'&&!validMinute)} onPress={confirm}/>
  </View>:null}
  <Button secondary title={t('Voltar às provas')} onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 heading:{fontSize:25,fontWeight:'900',color:C.white},name:{fontSize:15,fontWeight:'800',color:C.white},
 title:{fontSize:17,fontWeight:'800',color:C.white},note:{fontSize:12,color:C.muted,lineHeight:19},
 card:{gap:10,padding:14,borderRadius:13,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 row:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},
 chip:{padding:10,borderRadius:10,borderWidth:1,borderColor:C.border},selected:{borderColor:C.mint,backgroundColor:C.surface2},
 input:{borderWidth:1,borderColor:C.border,borderRadius:10,padding:10,minHeight:45,color:C.white},result:{fontSize:24,color:C.mint,fontWeight:'900'}
});
