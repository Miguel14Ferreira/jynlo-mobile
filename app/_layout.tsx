import React,{useEffect,useRef} from 'react';
import type * as NotificationTypes from 'expo-notifications';
import {getNativeNotifications} from '../src/lib/optional-notifications.cjs';
import {Stack,useRouter} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {AuthProvider,useAuth} from '../src/lib/auth';
import {C} from '../src/lib/theme';
function PushNavigation(){
  const auth=useAuth(),router=useRouter(),lastHandled=useRef<string|null>(null);
  useEffect(()=>{
    // A notification may launch the app before SecureStore restores the login.
    // Keep the native response until authentication is definitively resolved.
    if(!auth.ready)return;
    // Do not initialize native push for guests; retain cold-start responses
    // until the authenticated navigation effect is installed.
    if(!auth.token||!auth.username)return;
    // Loading the optional native module must not prevent root navigation.
    const Notifications=getNativeNotifications() as typeof NotificationTypes|null;
    if(!Notifications)return;
    // Capture the narrowed native module for callbacks invoked later.
    // TypeScript cannot retain nullable local narrowing inside callbacks.
    const nativeNotifications=Notifications;
    let active=true;
    function open(response:NotificationTypes.NotificationResponse|null){
      if(!active||!response)return;
      // Preserve a cold-start notification while SecureStore/login is still resolving.
      // Only consume it after authentication; the destination is resolved in our own inbox.
      if(!auth.token||!auth.username)return;
      if(response.actionIdentifier!==nativeNotifications.DEFAULT_ACTION_IDENTIFIER)return;
      // An incomplete native notification response must never throw inside
      // the root navigation listener or route the user to untrusted content.
      const data=response.notification?.request?.content?.data;
      // Never execute routes supplied by a notification. Resolve against own inbox.
      if(data?.kind!=='notification'||typeof data.id!=='number'||
        !Number.isSafeInteger(data.id)||data.id<=0)return;
      const identifier=response.notification?.request?.identifier;
      if(typeof identifier!=='string'||!identifier)return;
      // Notification identifiers are not globally unique across logins.
      const handledKey=auth.username+'|'+auth.token+'|'+identifier;
      if(lastHandled.current===handledKey)return;
      try{
        // Do not acknowledge a notification before navigation succeeds. If the
        // router is not yet mounted, the same native tap can be retried.
        router.push({pathname:'/notifications',params:{notificationId:String(data.id)}});
      }catch{
        return;
      }
      lastHandled.current=handledKey;
      try{nativeNotifications.clearLastNotificationResponse();}catch{
        // An unavailable native module must never break inbox navigation.
      }
    }
    let listener:ReturnType<typeof Notifications.addNotificationResponseReceivedListener>|null=null;
    try{
      listener=Notifications.addNotificationResponseReceivedListener(open);
      open(Notifications.getLastNotificationResponse());
    }catch{
      // A notification module error must not crash the app's root navigator.
      // Notification taps are optional; the authenticated inbox remains reachable.
    }
    return ()=>{
      active=false;
      try{listener?.remove();}catch{
        // An unavailable native module must never break navigator cleanup.
      }
    };
  },[auth.ready,auth.token,auth.username,router]);
  return null;
}
function Navigation(){const auth=useAuth();return <><PushNavigation/>
  <StatusBar style="light"/>
  <Stack key={auth.username||"visitor"} screenOptions={{headerStyle:{backgroundColor:C.background},headerTintColor:C.white,
    headerShadowVisible:false,contentStyle:{backgroundColor:C.background}}}>
    <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
    <Stack.Screen name="welcome" options={{headerShown:false}}/>
    <Stack.Screen name="sessions/[id]" options={{title:'Detalhes da sessão'}}/>
    <Stack.Screen name="sessions/[id]/edit" options={{title:'Editar sessão'}}/>
    <Stack.Screen name="sessions/[id]/chat" options={{title:'Chat da sessão'}}/>
    <Stack.Screen name="communities/create" options={{title:"Criar comunidade"}}/>
    <Stack.Screen name="communities/[id]" options={{title:"Comunidade"}}/>
    <Stack.Screen name="communities/invites" options={{title:"Convites"}}/>
    <Stack.Screen name="communities/[id]/chat" options={{title:"Chat da comunidade"}}/>
    <Stack.Screen name="messages/[peer]" options={{title:"Chat privado"}}/>
    <Stack.Screen name="messages/call" options={{title:"Chamada privada"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]" options={{title:"Torneio"}}/>
    <Stack.Screen name="tournaments/create" options={{title:"Criar torneio"}}/>
    <Stack.Screen name="teams/index" options={{title:"Equipas"}}/>
    <Stack.Screen name="teams/competitions" options={{title:"Encontrar competições"}}/>
    <Stack.Screen name="teams/[id]" options={{title:"Perfil da equipa"}}/>
    <Stack.Screen name="notifications" options={{title:"Notificações"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/teams" options={{title:"Equipas do torneio"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/fixtures" options={{title:"Jogos e fases"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/teams/[teamId]" options={{title:"Equipa"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/results" options={{title:"Resultados por prova"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/matches" options={{title:"Jogos individuais"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/participants" options={{title:"Participantes e inscrições"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/manage" options={{title:"Gerir torneio"}}/>
    <Stack.Screen name="posts/[postId]/index" options={{title:"Publicação"}}/>
    <Stack.Screen name="posts/[postId]/likers" options={{title:"Quem gostou"}}/>
    <Stack.Screen name="feed" options={{title:"Feed"}}/>
    <Stack.Screen name="people" options={{title:"Pessoas para conhecer"}}/>
    <Stack.Screen name="venues" options={{title:"Recintos"}}/>
    <Stack.Screen name="venues/create" options={{title:"Sugerir recinto"}}/>
    <Stack.Screen name="venues/[id]" options={{title:"Recinto"}}/>
    <Stack.Screen name="venues/[id]/suggest-edit" options={{title:"Sugerir correção"}}/>
    <Stack.Screen name="sessions/create" options={{title:'Criar sessão'}}/>
    <Stack.Screen name="social/[username]/index" options={{title:'Perfil'}}/>
    <Stack.Screen name="social/[username]/[kind]" options={{title:'Seguidores e seguindo'}}/>
    <Stack.Screen name="communities/[id]/competitions" options={{title:'Competições da comunidade'}}/>
    <Stack.Screen name="communities/[id]/championships/create" options={{title:'Criar campeonato'}}/>
    <Stack.Screen name="communities/[id]/championships/[championshipId]" options={{title:'Campeonato'}}/>
    <Stack.Screen name="communities/[id]/championships/teams" options={{title:'Equipas do campeonato'}}/>
    <Stack.Screen name="communities/[id]/championships/honours" options={{title:'Palmarés do campeonato'}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/events" options={{title:'Eventos do torneio'}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/relays" options={{title:'Estafetas do torneio'}}/>
    <Stack.Screen name="my-sessions" options={{title:"As minhas sessões"}}/>
    <Stack.Screen name="login" options={{title:'Entrar na Jynlo'}}/>
    <Stack.Screen name="change-password" options={{title:'Alterar palavra-passe'}}/>
    <Stack.Screen name="edit-profile" options={{title:'Editar perfil'}}/>
    <Stack.Screen name="register" options={{title:'Criar conta'}}/>
    <Stack.Screen name="confirm-email" options={{title:'Confirmar email'}}/>
    <Stack.Screen name="reset-password" options={{title:'Recuperar palavra-passe'}}/>
    <Stack.Screen name="legal" options={{title:'Informação legal'}}/>
    <Stack.Screen name="google-onboarding" options={{title:'Registo com Google'}}/>
    <Stack.Screen name="mfa" options={{title:'Verificação MFA'}}/>
  </Stack>
</>;}
export default function RootLayout(){return <AuthProvider><Navigation/></AuthProvider>;}

// Expo Router renders a recoverable error screen instead of a blank page for route exceptions.
export {ErrorBoundary} from 'expo-router';
