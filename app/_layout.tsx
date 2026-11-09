import React,{useEffect,useRef} from 'react';
import * as Notifications from 'expo-notifications';
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
    let active=true;
    function open(response:Notifications.NotificationResponse|null){
      if(!active||!response)return;
      // Preserve a cold-start notification while SecureStore/login is still resolving.
      // Only consume it after authentication; the destination is resolved in our own inbox.
      if(!auth.token||!auth.username)return;
      if(response.actionIdentifier!==Notifications.DEFAULT_ACTION_IDENTIFIER)return;
      const data=response.notification.request.content.data;
      // Never execute routes supplied by a notification. Resolve against own inbox.
      if(data?.kind!=='notification'||typeof data.id!=='number'||
        !Number.isSafeInteger(data.id)||data.id<=0)return;
      const identifier=response.notification.request.identifier;
      if(lastHandled.current===identifier)return;
      // Consume only a validated, newly handled notification. Otherwise, an
      // unrelated action or malformed payload could erase a legitimate tap.
      lastHandled.current=identifier;
      Notifications.clearLastNotificationResponse();
      router.push({pathname:'/notifications',params:{notificationId:String(data.id)}});
    }
    const listener=Notifications.addNotificationResponseReceivedListener(open);
    open(Notifications.getLastNotificationResponse());
    return ()=>{active=false;listener.remove();};
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
    <Stack.Screen name="notifications" options={{title:"Notificações"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/teams" options={{title:"Equipas do torneio"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/fixtures" options={{title:"Jogos e fases"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/teams/[teamId]" options={{title:"Equipa"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/results" options={{title:"Resultados por prova"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/matches" options={{title:"Jogos individuais"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/participants" options={{title:"Participantes e inscrições"}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/manage" options={{title:"Gerir torneio"}}/>
    <Stack.Screen name="feed" options={{title:"Feed"}}/>
    <Stack.Screen name="people" options={{title:"Pessoas para conhecer"}}/>
    <Stack.Screen name="venues" options={{title:"Recintos"}}/>
    <Stack.Screen name="venues/create" options={{title:"Sugerir recinto"}}/>
    <Stack.Screen name="venues/[id]" options={{title:"Recinto"}}/>
    <Stack.Screen name="venues/[id]/suggest-edit" options={{title:"Sugerir correção"}}/>
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
