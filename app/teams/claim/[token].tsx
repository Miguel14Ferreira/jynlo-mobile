import React,{useCallback,useState} from 'react';
import {StyleSheet,Text} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {t} from '../../../src/lib/i18n';
import {useAuth} from '../../../src/lib/auth';
import {C} from '../../../src/lib/theme';
import {Button,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {acceptRosterClaim,rosterClaim,type TeamRosterClaim} from '../../../src/lib/team-roster-api';

/** "És o nº 7 desta equipa?" The player confirms and joins with their own account. */
export default function TeamRosterClaimScreen(){
 const {token:raw}=useLocalSearchParams<{token:string}>();
 const claimToken=typeof raw==='string'?raw:'';
 const auth=useAuth(),router=useRouter();
 const [claim,setClaim]=useState<TeamRosterClaim|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useFocusEffect(useCallback(()=>{
  let active=true;
  setClaim(null);setError('');
  if(!auth.token){setLoading(false);return()=>{active=false;};}
  setLoading(true);
  void rosterClaim(claimToken,auth.token).then(next=>{
   if(!active)return;
   setClaim(next);
   if(next.alreadyLinked)setError(t('Este lugar no plantel já foi associado a uma conta.'));
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:t('Link inválido ou já usado.'));})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[auth.token,claimToken]));
 async function accept(){
  if(busy||!claim)return;
  setBusy(true);setError('');
  try{
   const done=await acceptRosterClaim(claimToken,auth.token);
   router.replace({pathname:'/teams/[id]',params:{id:String(done.teamId)}});
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível entrar na equipa.'));}
  finally{setBusy(false);}
 }
 return <Page>
  <Eyebrow>{t('CONVITE PARA O PLANTEL')}</Eyebrow>
  {!auth.token?<>
   <Text style={styles.text}>{t('Inicia sessão ou cria conta para entrares na equipa.')}</Text>
   <Button title={t('Iniciar sessão')} onPress={()=>router.push({pathname:'/login',params:{redirect:'/teams/claim/'+claimToken}})}/>
  </>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {claim&&!claim.alreadyLinked?<>
   <Text maxFontSizeMultiplier={1.3} style={styles.title}>{claim.teamName}</Text>
   <Text style={styles.line}>{t('És {name}?',{name:claim.name+(claim.shirtNumber!=null?' · nº '+claim.shirtNumber:'')+(claim.position?' · '+claim.position:'')})}</Text>
   <Text style={styles.text}>{t('Ao aceitar, entras na equipa com a tua conta e ficas com este lugar no plantel.')}</Text>
   <Button title={busy?t('A entrar…'):t('Sim, sou eu · Entrar na equipa')} disabled={busy} onPress={()=>void accept()}/>
   <Button secondary title={t('Não sou eu')} disabled={busy} onPress={()=>router.replace('/teams')}/>
  </>:null}
  {error&&!claim?<Button secondary title={t('Ver as minhas equipas')} onPress={()=>router.replace('/teams')}/>:null}
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:27,color:C.white,fontWeight:'900'},line:{fontSize:18,color:C.white,fontWeight:'800'},
 text:{color:C.muted,fontSize:14,lineHeight:21}
});
