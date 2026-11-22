import React,{useCallback,useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {joinSession,sessionDetail} from '../lib/api';
import {formatDate} from '../lib/format.cjs';
import {C} from '../lib/theme';
import type {SessionDetail} from '../lib/types';
import {sportName} from '../lib/sport-names.cjs';

/**
 * Convocatória card in a chat. Everything shown comes from the session API
 * (never from the message), and "Vou" uses the normal join endpoint, so
 * capacity, waitlist and privacy rules stay on the server.
 */
export function CallUpCard({sessionId,token,username}:{sessionId:number;token:string|null;username:string|null}){
 const router=useRouter();
 const [session,setSession]=useState<SessionDetail|null>(null);
 const [loading,setLoading]=useState(true),[joining,setJoining]=useState(false),[error,setError]=useState('');
 const version=useRef(0);
 const load=useCallback(async()=>{
  const current=++version.current;
  if(!token){setSession(null);setLoading(false);return;}
  setLoading(true);
  try{const detail=await sessionDetail(sessionId,token,username||undefined);if(current===version.current)setSession(detail);}
  catch{if(current===version.current)setSession(null);}
  finally{if(current===version.current)setLoading(false);}
 },[sessionId,token,username]);
 useEffect(()=>{void load();return()=>{version.current++;};},[load]);
 const closed=!session||!['OPEN','FULL'].includes(session.status)||!(Date.parse(session.gameDate)>Date.now());
 const organiser=!!session?.creatorUsername&&!!username&&session.creatorUsername.toLowerCase()===username.toLowerCase();
 const join=async()=>{
  if(!session||!token||joining||closed||session.joined||session.waitlisted||session.privateGame)return;
  setJoining(true);setError('');
  try{await joinSession(session.id,token,username||undefined);await load();}
  catch{setError(t('Não foi possível confirmar. Tenta outra vez ou abre a sessão.'));}
  finally{setJoining(false);}
 };
 const progress=session&&session.maxParticipants?Math.min(100,Math.round(session.participantCount/session.maxParticipants*100)):0;
 return <View style={styles.card} accessibilityLabel={t('Convocatória')}>
  <Text style={styles.kind}>{t('📣 CONVOCATÓRIA')}</Text>
  {session?<>
   <Text style={styles.title}>{sportName(session.sport)} · {session.city}</Text>
   <Text style={styles.meta}>{formatDate(session.gameDate)}</Text>
   <View style={styles.bar}><View style={[styles.fill,{width:`${progress}%`}]}/></View>
   <Text style={styles.meta}>{t('{a}/{b} vão',{a:session.participantCount,b:session.maxParticipants})}</Text>
   {closed?<Text style={styles.state}>{t('Esta sessão já não aceita inscrições')}</Text>
    :organiser?<Text style={styles.state}>{t('És o organizador desta sessão')}</Text>
    :session.joined?<Text style={[styles.state,{color:C.mint}]}>{t('✓ Vais a este jogo')}</Text>
    :session.waitlisted?<Text style={styles.state}>{t('Estás na lista de espera')}</Text>
    :session.privateGame?<Text style={styles.state}>{t('Jogo só por convite: abre o link do organizador para entrar')}</Text>
    :<Pressable accessibilityRole="button" disabled={joining} onPress={()=>void join()} style={[styles.join,joining&&{opacity:.6}]}>
      {joining?<ActivityIndicator color={C.background}/>:<Text style={styles.joinText}>{session.status==='FULL'?t('Vou (lista de espera)'):t('Vou')}</Text>}
     </Pressable>}
   {error?<Text style={styles.error}>{error}</Text>:null}
   <Pressable accessibilityRole="link" onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(session.id)}})}>
    <Text style={styles.link}>{t('Ver sessão ›')}</Text>
   </Pressable>
  </>:loading?<ActivityIndicator color={C.mint}/>:<Text style={styles.meta}>{t('Sessão indisponível')}</Text>}
 </View>;
}
const styles=StyleSheet.create({
 card:{gap:6,padding:13,borderRadius:14,borderWidth:1,borderColor:C.mint+'66',backgroundColor:C.surface2,minWidth:220},
 kind:{color:C.mint,fontSize:11,fontWeight:'900',letterSpacing:1},
 title:{color:C.white,fontSize:16,fontWeight:'900'},
 meta:{color:C.muted,fontSize:13},
 bar:{height:6,borderRadius:3,backgroundColor:'#ffffff22',overflow:'hidden'},
 fill:{height:6,borderRadius:3,backgroundColor:C.mint},
 state:{color:C.white,fontSize:14,fontWeight:'800',marginTop:4},
 join:{minHeight:44,marginTop:4,borderRadius:22,backgroundColor:C.mint,alignItems:'center',justifyContent:'center'},
 joinText:{color:C.background,fontSize:15,fontWeight:'900'},
 error:{color:C.danger,fontSize:13},
 link:{color:C.mint,fontSize:13,fontWeight:'800',paddingVertical:6},
});
