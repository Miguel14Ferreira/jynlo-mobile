import React from 'react';
import {t,useLanguage} from '../src/lib/i18n';
import {StyleSheet,Text,View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {Eyebrow,Page} from '../src/components/UI';
import {legalDocument} from '../src/lib/legal-content';
import type {LegalKind} from '../src/lib/legal-content';
import {C} from '../src/lib/theme';

export default function LegalScreen(){
 const params=useLocalSearchParams<{document?:string}>();
 const kind:LegalKind=params.document==='terms'||params.document==='delete-account'||params.document==='delete'
  ?(params.document==='terms'?'terms':'delete'):'privacy';
 const {language}=useLanguage();
 const document=legalDocument(kind,language==='en'?'en':'pt');
 return <Page>
  
  <Eyebrow>{t('INFORMAÇÃO LEGAL')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{document.title}</Text>
  <Text style={styles.intro}>{document.intro}</Text>
  <Text style={styles.note}>{document.updated}</Text>
  <Text style={styles.note}>{document.notice}</Text>
  {document.sections.map((section,index)=><View key={index} style={styles.section}>
   <Text style={styles.heading}>{section.title}</Text>
   <Text style={styles.body}>{section.text}</Text>
  </View>)}
  <Text style={styles.note}>{document.contact}</Text>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:29,fontWeight:'900',color:C.white},
 intro:{fontSize:15,lineHeight:23,color:C.white},
 note:{fontSize:12,lineHeight:19,color:C.muted},
 section:{padding:18,backgroundColor:C.surface,borderRadius:14,borderWidth:1,borderColor:C.border,gap:10},
 heading:{fontSize:17,fontWeight:'800',color:C.white},
 body:{fontSize:13,lineHeight:21,color:C.muted}
});
