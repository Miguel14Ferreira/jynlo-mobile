import React,{useEffect,useState} from 'react';
import {t} from '../lib/i18n';
import {Pressable,StyleSheet,Text} from 'react-native';
import {useRouter} from 'expo-router';
import {previousUnpaid,type PreviousUnpaid} from '../lib/session-payments-api';

/** Organiser, before opening the list: who still owes the previous game. Informative only. */
export default function PreviousUnpaidWarning({sessionId,token}:{sessionId:number;token:string|null}){
 const router=useRouter();
 const [data,setData]=useState<PreviousUnpaid|null>(null);
 useEffect(()=>{
  let alive=true;setData(null);
  previousUnpaid(sessionId,token).then(result=>{if(alive)setData(result);}).catch(()=>{});
  return()=>{alive=false;};
 },[sessionId,token]);
 if(!data?.sessionId||data.unpaid.length===0)return null;
 const names=data.unpaid.length<=4?data.unpaid.join(', '):data.unpaid.slice(0,4).join(', ')+' +'+(data.unpaid.length-4);
 return <Pressable accessibilityRole="link" style={styles.box}
  onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(data.sessionId)}})}>
  <Text style={styles.text}>{data.unpaid.length===1?t('💶 Ainda falta 1 pagamento do jogo anterior: {d}.',{d:names}):t('💶 Ainda faltam {b} pagamentos do jogo anterior: {d}.',{b:data.unpaid.length,d:names})}</Text>
  <Text style={styles.link}>{t('Ver jogo anterior ›')}</Text>
 </Pressable>;
}
const styles=StyleSheet.create({
 box:{gap:4,padding:12,borderRadius:12,borderWidth:1,borderColor:'rgba(255,210,122,.45)',backgroundColor:'rgba(255,210,122,.12)'},
 text:{color:'#ffe3a8',fontSize:14},
 link:{color:'#ffe3a8',fontSize:13,fontWeight:'900'},
});
