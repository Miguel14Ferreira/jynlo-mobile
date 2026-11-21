import React from 'react';
import {Linking} from 'react-native';
import {Button} from './UI';
import {googleCalendarUrl} from '../lib/session-calendar.cjs';
import type {SessionDetail} from '../lib/types';

/** Only ever opens a calendar.google.com link built here — never a URL received from the server. */
export function AddToCalendarButton({session,exactAddress,onError}:{session:SessionDetail;exactAddress:string|null;onError:(message:string)=>void}){
 const url=googleCalendarUrl(session,exactAddress);
 if(!url||!url.startsWith('https://calendar.google.com/calendar/render?'))return null;
 return <Button title="Adicionar ao calendário" secondary onPress={()=>{
  Linking.openURL(url).catch(()=>onError('Não foi possível abrir o calendário.'));
 }}/>;
}
