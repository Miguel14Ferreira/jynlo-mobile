import React,{useEffect,useState} from 'react';
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
  <Text style={styles.text}>💶 Ainda falta{data.unpaid.length===1?'':'m'} {data.unpaid.length} pagamento{data.unpaid.length===1?'':'s'} do jogo anterior: {names}.</Text>
  <Text style={styles.link}>Ver jogo anterior ›</Text>
 </Pressable>;
}
const styles=StyleSheet.create({
 box:{gap:4,padding:12,borderRadius:12,borderWidth:1,borderColor:'rgba(255,210,122,.45)',backgroundColor:'rgba(255,210,122,.12)'},
 text:{color:'#ffe3a8',fontSize:14},
 link:{color:'#ffe3a8',fontSize:13,fontWeight:'900'},
});
