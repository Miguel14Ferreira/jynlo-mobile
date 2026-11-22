import React from 'react';
import {t} from '../../../src/lib/i18n';
import {useLocalSearchParams} from 'expo-router';
import {Message,Page} from '../../../src/components/UI';
import SocialPeopleList from '../../../src/components/SocialPeopleList';
export default function PostLikersScreen(){
 const {postId}=useLocalSearchParams<{postId:string}>();
 const id=typeof postId==='string'&&/^[1-9][0-9]*$/.test(postId)?Number(postId):NaN;
 if(!Number.isSafeInteger(id)||id<=0)return <Page><Message tone="error">{t('Publicação inválida.')}</Message></Page>;
 return <SocialPeopleList postId={id}/>;
}
