import React from 'react';
import {t} from '../../../src/lib/i18n';
import {useLocalSearchParams} from 'expo-router';
import {Message,Page} from '../../../src/components/UI';
import SocialPeopleList from '../../../src/components/SocialPeopleList';
export default function SocialRelationScreen(){
 const params=useLocalSearchParams<{username:string;kind:string}>();
 const username=typeof params.username==='string'?params.username:'';
 const kind=typeof params.kind==='string'?params.kind:'';
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(username)||(kind!=='followers'&&kind!=='following'))return <Page><Message tone="error">{t('Lista social inválida.')}</Message></Page>;
 return <SocialPeopleList username={username} kind={kind}/>;
}
