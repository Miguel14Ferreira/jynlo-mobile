import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import type {ComponentProps} from 'react';

export type JynloIconName=
 'home'|'explore'|'messages'|'profile'|'plus'|'post'|'community'|'session'|
 'venue'|'tournament'|'championship'|'notifications'|'camera'|'gallery'|
 'like'|'comment'|'share'|'location'|'more'|'close'|'send'|'chevron-down'|
 'chevron-up'|'chevron-right'|'calendar'|'settings'|'search'|'check';

const icons:Record<JynloIconName,{regular:ComponentProps<typeof Ionicons>['name'];active:ComponentProps<typeof Ionicons>['name']}>={
 home:{regular:'home-outline',active:'home'},
 explore:{regular:'compass-outline',active:'compass'},
 messages:{regular:'chatbubbles-outline',active:'chatbubbles'},
 profile:{regular:'person-circle-outline',active:'person-circle'},
 plus:{regular:'add',active:'add'},
 post:{regular:'images-outline',active:'images'},
 community:{regular:'people-outline',active:'people'},
 session:{regular:'football-outline',active:'football'},
 venue:{regular:'location-outline',active:'location'},
 tournament:{regular:'trophy-outline',active:'trophy'},
 championship:{regular:'ribbon-outline',active:'ribbon'},
 notifications:{regular:'notifications-outline',active:'notifications'},
 camera:{regular:'camera-outline',active:'camera'},
 gallery:{regular:'images-outline',active:'images'},
 like:{regular:'heart-outline',active:'heart'},
 comment:{regular:'chatbubble-outline',active:'chatbubble'},
 share:{regular:'paper-plane-outline',active:'paper-plane'},
 location:{regular:'location-outline',active:'location'},
 more:{regular:'ellipsis-horizontal',active:'ellipsis-horizontal'},
 close:{regular:'close',active:'close'},
 send:{regular:'arrow-up',active:'arrow-up'},
 'chevron-down':{regular:'chevron-down',active:'chevron-down'},
 'chevron-up':{regular:'chevron-up',active:'chevron-up'},
 'chevron-right':{regular:'chevron-forward',active:'chevron-forward'},
 calendar:{regular:'calendar-outline',active:'calendar'},
 settings:{regular:'settings-outline',active:'settings'},
 search:{regular:'search-outline',active:'search'},
 check:{regular:'checkmark-circle-outline',active:'checkmark-circle'},
};

export function JynloIcon({name,size=24,color='#D4F6F2',active=false}:{
 name:JynloIconName;
 size?:number;
 color?:string;
 active?:boolean;
}){
 const pair=icons[name];
 return <Ionicons name={active?pair.active:pair.regular} color={color} size={size}/>;
}
