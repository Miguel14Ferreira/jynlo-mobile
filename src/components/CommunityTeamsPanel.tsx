import React,{useCallback,useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Button,Message} from './UI';
import {C} from '../lib/theme';
import {discoverSportsTeams,mySportsTeams,type SportsTeam} from '../lib/sports-teams-api';
import {answerTeamCommunityMembership,communityTeamMemberships,inviteTeamToCommunity,
 requestTeamCommunityMembership,removeTeamCommunityMembership,type TeamCommunityMembership} from '../lib/team-community-memberships-api';

interface Props {communityId:number;isOrganizer:boolean;token:string;}
export default function CommunityTeamsPanel({communityId,isOrganizer,token}:Props){
 const router=useRouter();
 const [rows,setRows]=useState<TeamCommunityMembership[]>([]),[owned,setOwned]=useState<SportsTeam[]>([]);
 const [searchText,setSearchText]=useState(''),[found,setFound]=useState<SportsTeam[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const [memberships,teams]=await Promise.all([
    communityTeamMemberships(communityId,token),mySportsTeams(token)
   ]);
   setRows(memberships);setOwned(teams);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar equipas.');}
  finally{setLoading(false);}
 },[communityId,token]);
 useEffect(()=>{void load();},[load]);
 const search=async()=>{
  if(busy||!searchText.trim())return;
  setBusy(true);setError('');
  try{setFound(await discoverSportsTeams(searchText,token));}
  catch(e){setError(e instanceof Error?e.message:'Pesquisa indisponível.');}
  finally{setBusy(false);}
 };
 const action=async(perform:()=>Promise<unknown>,message:string)=>{
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{await perform();setNotice(message);await load();}
  catch(e){setError((e instanceof Error?e.message:'Não foi possível concluir.')+' Verifica o estado antes de repetir.');}
  finally{setBusy(false);}
 };
 const existing=(teamId:number)=>rows.some(r=>r.teamId===teamId&&r.status!=='DECLINED');
 const active=rows.filter(r=>r.status==='ACTIVE');
 const pending=rows.filter(r=>r.status==='PENDING_TEAM'||r.status==='PENDING_COMMUNITY');
 return <View style={styles.panel}>
  <Text style={styles.heading}>Equipas da comunidade ({active.length})</Text>
  <Text style={styles.note}>As equipas mantêm identidade e plantel próprios.</Text>
  {loading?<Text style={styles.note}>A carregar equipas…</Text>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {notice?<Message>{notice}</Message>:null}
  {!loading&&active.length===0?<Text style={styles.note}>Ainda não há equipas associadas.</Text>:null}
  {active.map(item=><View key={item.id} style={styles.item}>
   <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/teams/[id]',params:{id:String(item.teamId)}})}>
    <Text style={styles.team}>{item.teamName} ›</Text>
   </Pressable>
   {isOrganizer?<Button secondary title="Remover" disabled={busy}
    onPress={()=>void action(()=>removeTeamCommunityMembership(item.id,token),'Equipa removida.')}/>:null}
  </View>)}
  {isOrganizer?<><Text style={styles.heading}>Convidar equipa</Text>
   <TextInput style={styles.input} placeholder="Pesquisar equipa pelo nome" placeholderTextColor={C.muted}
     value={searchText} onChangeText={setSearchText} maxLength={100}/>
   <Button title="Pesquisar equipa" disabled={busy||!searchText.trim()} onPress={()=>void search()}/>
   {found.map(team=><View key={team.id} style={styles.item}>
     <Text style={styles.team}>{team.name}</Text>
     <Button title={existing(team.id)?'Pedido existente':'Convidar'} disabled={busy||existing(team.id)}
       onPress={()=>void action(()=>inviteTeamToCommunity(communityId,team.id,token),'Convite enviado ao responsável.')}/>
   </View>)}
   <Text style={styles.heading}>Pedidos pendentes</Text>
   {pending.map(item=><View key={item.id} style={styles.item}>
    <Text style={styles.team}>{item.teamName}</Text>
    <Text style={styles.note}>{item.status==='PENDING_COMMUNITY'?'Pediu entrada':'Convite enviado'}</Text>
    {item.status==='PENDING_COMMUNITY'?<>
     <Button title="Aceitar" disabled={busy} onPress={()=>void action(()=>answerTeamCommunityMembership(item.id,true,token),'Pedido aceite.')}/>
     <Button title="Recusar" secondary disabled={busy} onPress={()=>void action(()=>answerTeamCommunityMembership(item.id,false,token),'Pedido recusado.')}/>
    </>:null}
   </View>)}
  </>:<>
   {owned.length>0?<><Text style={styles.heading}>Pedir adesão com uma equipa</Text>
    {owned.map(team=><View key={team.id} style={styles.item}>
     <Text style={styles.team}>{team.name}</Text>
     <Button title={existing(team.id)?'Pedido existente':'Pedir adesão'} disabled={busy||existing(team.id)}
      onPress={()=>void action(()=>requestTeamCommunityMembership(team.id,communityId,token),'Pedido enviado à comunidade.')}/>
    </View>)}
   </>:null}
  </>}
  <Text style={styles.note}>Associar uma equipa não adiciona jogadores individualmente à comunidade.</Text>
 </View>;
}
const styles=StyleSheet.create({
 panel:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:16,padding:16,gap:12},
 heading:{color:C.white,fontWeight:'800',fontSize:17},team:{color:C.white,fontWeight:'700',fontSize:14},
 note:{color:C.muted,fontSize:12,lineHeight:19},
 item:{padding:12,gap:8,borderWidth:1,borderColor:C.border,borderRadius:12},
 input:{padding:12,borderWidth:1,borderColor:C.border,borderRadius:10,color:C.white,backgroundColor:C.surface}
});
