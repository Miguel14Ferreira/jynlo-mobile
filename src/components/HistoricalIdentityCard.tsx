import React,{useCallback,useEffect,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {Button,Eyebrow,Message} from './UI';
import {C} from '../lib/theme';
import {t} from '../lib/i18n';
import {claimHistoricalPlayer,historicalCandidates,myHistoricalLinks,releaseHistoricalLink,
  type HistoricalPlayerCandidate,type HistoricalPlayerLink} from '../lib/historical-identity-api';

/**
 * "Quem és tu na classificação?": a member links their account to their name in the table,
 * and can undo it themselves at any time (results stay in the table, only the link goes).
 */
export function HistoricalIdentityCard({communityId,token}:{communityId:number;token:string}){
  const [links,setLinks]=useState<HistoricalPlayerLink[]>([]);
  const [candidates,setCandidates]=useState<HistoricalPlayerCandidate[]>([]);
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const load=useCallback(async()=>{
    try{
      const [mine,all]=await Promise.all([myHistoricalLinks(communityId,token),historicalCandidates(communityId,token)]);
      setLinks(mine.filter(l=>l.status!=='REJECTED'));setCandidates(all);setError('');
    }catch{setError(t('Não foi possível carregar os nomes da classificação.'));}
  },[communityId,token]);
  useEffect(()=>{void load();},[load]);
  const free=candidates.filter(c=>c.linkStatus==='UNLINKED');
  if(!links.length&&!free.length&&!error)return null;
  const release=(link:HistoricalPlayerLink)=>Alert.alert(t('Desassociar "{name}"?',{name:link.historicalName}),
    t('Os resultados continuam na classificação. Só deixam de estar ligados à tua conta.'),[
    {text:t('Cancelar'),style:'cancel'},
    {text:t('Desassociar'),style:'destructive',onPress:()=>{void (async()=>{
      setBusy(true);
      try{await releaseHistoricalLink(communityId,link.id,token);setNotice(t('Associação removida.'));await load();}
      catch{setError(t('Não foi possível remover a associação.'));}
      finally{setBusy(false);}
    })();}}]);
  const claim=(c:HistoricalPlayerCandidate)=>Alert.alert(t('És tu "{name}"?',{name:c.historicalName}),
    t('Os jogos deste nome passam a contar na tua conta. Podes desfazer quando quiseres.'),[
    {text:t('Cancelar'),style:'cancel'},
    {text:t('Sou eu'),onPress:()=>{void (async()=>{
      setBusy(true);
      try{const link=await claimHistoricalPlayer(communityId,c.playerId,token);
        setNotice(link.status==='ACCEPTED'?t('Nome associado à tua conta.'):t('Pedido enviado. Um administrador confirma em breve.'));
        setOpen(false);await load();}
      catch{setError(t('Não foi possível associar este nome.'));}
      finally{setBusy(false);}
    })();}}]);
  return <View style={styles.card}>
    <Eyebrow>{t('O TEU NOME NA CLASSIFICAÇÃO')}</Eyebrow>
    {error?<Message tone="error">{error}</Message>:null}
    {notice?<Message>{notice}</Message>:null}
    {links.map(link=><View key={link.id} style={styles.row}>
      <View style={{flex:1}}>
        <Text style={styles.name}>{link.historicalName}</Text>
        <Text style={styles.muted}>{link.status==='ACCEPTED'?t('Ligado à tua conta'):t('À espera de confirmação')}</Text>
      </View>
      {link.status==='ACCEPTED'?<Pressable accessibilityRole="button" disabled={busy} onPress={()=>release(link)} style={styles.unlink}>
        <Text style={styles.unlinkText}>{t('Desassociar')}</Text>
      </Pressable>:null}
    </View>)}
    {free.length?<>
      <Button secondary title={open?t('Fechar'):links.length?t('Associar outro nome'):t('Escolher o meu nome')} disabled={busy} onPress={()=>setOpen(v=>!v)}/>
      {open?<View style={styles.list}>{free.map(c=><Pressable key={c.playerId} accessibilityRole="button" disabled={busy}
        onPress={()=>claim(c)} style={styles.choice}><Text style={styles.choiceText}>{c.historicalName}</Text></Pressable>)}</View>:null}
    </>:null}
  </View>;
}

const styles=StyleSheet.create({
  card:{gap:10,padding:14,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
  row:{flexDirection:'row',alignItems:'center',gap:10},
  name:{color:C.white,fontWeight:'800',fontSize:16},
  muted:{color:C.muted,fontSize:13},
  unlink:{minHeight:40,paddingHorizontal:14,borderRadius:20,borderWidth:1,borderColor:C.border,justifyContent:'center'},
  unlinkText:{color:C.white,fontWeight:'700'},
  list:{flexDirection:'row',flexWrap:'wrap',gap:8},
  choice:{minHeight:40,paddingHorizontal:14,borderRadius:20,backgroundColor:C.surface2,borderWidth:1,borderColor:C.border,justifyContent:'center'},
  choiceText:{color:C.white,fontWeight:'700'},
});
