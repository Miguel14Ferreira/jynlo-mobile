import React,{useEffect,useRef} from 'react';
import {LanguageProvider,t,useLanguage} from '../src/lib/i18n';
import {autoEnablePushOnce,refreshPushLanguage} from '../src/lib/mobile-push';
import {pushDeliveryReady} from '../src/lib/push-device-api';
import type * as NotificationTypes from 'expo-notifications';
import {getNativeNotifications} from '../src/lib/optional-notifications.cjs';
import {pushNotificationId} from '../src/lib/push-notification-id.cjs';
import {Stack,useRouter,usePathname,ErrorBoundary as RouterErrorBoundary,type ErrorBoundaryProps} from 'expo-router';
import {installGlobalErrorReporting,reportClientError,setErrorRoute} from '../src/lib/client-error';
import {OfflineBanner} from '../src/components/OfflineBanner';
import {startNetworkMonitoring} from '../src/lib/network-status';
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
      const id=data?.kind==='notification'?pushNotificationId(data.id):null;
      if(!id)return;
      const identifier=response.notification?.request?.identifier;
      if(typeof identifier!=='string'||!identifier)return;
      // Notification identifiers are not globally unique across logins.
      const handledKey=auth.username+'|'+auth.token+'|'+identifier;
      if(lastHandled.current===handledKey)return;
      try{
        // Do not acknowledge a notification before navigation succeeds. If the
        // router is not yet mounted, the same native tap can be retried.
        router.push({pathname:'/notifications',params:{notificationId:id}});
      }catch{
        return;
      }
      lastHandled.current=handledKey;
      try{
        // Some native implementations return a Promise: catch asynchronous
        // cleanup failures too, without holding up authenticated navigation.
        void Promise.resolve(nativeNotifications.clearLastNotificationResponse()).catch(()=>{});
      }catch{
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
installGlobalErrorReporting();
startNetworkMonitoring();
/** Keeps the server's copy of the app language in step for lock-screen notifications. */
function PushLanguageSync(){
  const auth=useAuth(),{language}=useLanguage();
  const synced=useRef<string|null>(null);
  useEffect(()=>{
    if(!auth.ready||!auth.token||!auth.username)return;
    const key=auth.username.toLowerCase()+'|'+language;
    // Portuguese is the server default; an English app tells it once per start.
    if(synced.current===null&&language!=='en'){synced.current=key;return;}
    if(synced.current===key)return;
    synced.current=key;
    void refreshPushLanguage(auth.username,auth.token);
  },[auth.ready,auth.token,auth.username,language]);
  return null;
}
/** Phone notifications on by default: ask once, after first steps, on a main screen. */
function PushAutoOptIn(){
  const auth=useAuth(),pathname=usePathname();
  const attempted=useRef<string|null>(null);
  useEffect(()=>{
    if(!auth.ready||!auth.token||!auth.username)return;
    // Not on top of sign-in, sign-up or the first-steps questions.
    if(/^\/(login|register|first-steps|welcome|confirm-email|mfa|reset-password|google-onboarding)/.test(pathname||''))return;
    const account=auth.username.toLowerCase();
    if(attempted.current===account)return;
    attempted.current=account;
    const username=auth.username,token=auth.token;
    let fired=false;
    const timer=setTimeout(()=>{
      fired=true;
      void pushDeliveryReady(token).then(ready=>{if(ready)void autoEnablePushOnce(username,token);}).catch(()=>{});
    },2500);
    // Leaving the screen early re-arms the check; once it ran, it stays done for this account.
    return()=>{clearTimeout(timer);if(!fired&&attempted.current===account)attempted.current=null;};
  },[auth.ready,auth.token,auth.username,pathname]);
  return null;
}
function ErrorRouteTracker(){const pathname=usePathname();useEffect(()=>{setErrorRoute(pathname);},[pathname]);return null;}
function Navigation(){const auth=useAuth();return <><PushNavigation/><PushLanguageSync/><PushAutoOptIn/><ErrorRouteTracker/><OfflineBanner/>
  <StatusBar style="light"/>
  <Stack key={auth.username||"visitor"} screenOptions={{headerStyle:{backgroundColor:C.background},headerTintColor:C.white,
    headerShadowVisible:false,contentStyle:{backgroundColor:C.background}}}>
    <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
    <Stack.Screen name="welcome" options={{headerShown:false}}/>
    <Stack.Screen name="sessions/[id]" options={{title:t('Detalhes da sessão')}}/>
    <Stack.Screen name="sessions/[id]/edit" options={{title:t('Editar sessão')}}/>
    <Stack.Screen name="sessions/[id]/chat" options={{title:t('Chat da sessão')}}/>
    <Stack.Screen name="communities/index" options={{title:t("Comunidades")}}/>
    <Stack.Screen name="tournaments/index" options={{title:t("Torneios")}}/>
    <Stack.Screen name="communities/create" options={{title:t("Criar comunidade")}}/>
    <Stack.Screen name="communities/[id]" options={{title:t("Comunidade")}}/>
    <Stack.Screen name="communities/invites" options={{title:t("Convites")}}/>
    <Stack.Screen name="communities/[id]/chat" options={{title:t("Chat da comunidade")}}/>
    <Stack.Screen name="communities/[id]/live/index" options={{title:t("Diretos da comunidade")}}/>
    <Stack.Screen name="communities/[id]/live/[eventId]" options={{title:t("Em direto")}}/>
    <Stack.Screen name="messages/[peer]" options={{headerShown:false,title:t("Chat privado")}}/>
    <Stack.Screen name="messages/call" options={{title:t("Chamada privada")}}/>
    <Stack.Screen name="groups/index" options={{title:t("Conversas de grupo")}}/>
    <Stack.Screen name="groups/[id]" options={{title:t("Grupo")}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]" options={{title:t("Torneio")}}/>
    <Stack.Screen name="tournaments/create" options={{title:t("Criar torneio")}}/>
    <Stack.Screen name="teams/index" options={{title:t("Equipas")}}/>
    <Stack.Screen name="teams/competitions" options={{title:t("Encontrar competições")}}/>
    <Stack.Screen name="teams/[id]" options={{title:t("Perfil da equipa")}}/>
    <Stack.Screen name="communities/[id]/competition-settings" options={{title:t("Definições da competição")}}/>
    <Stack.Screen name="teams/claim/[token]" options={{title:t("Convite para o plantel")}}/>
    <Stack.Screen name="notifications" options={{title:t("Notificações")}}/>
    <Stack.Screen name="live/index" options={{title:t("Lives Jynlo")}}/>
    <Stack.Screen name="live/[id]" options={{title:t("Em direto")}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/teams" options={{title:t("Equipas do torneio")}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/fixtures" options={{title:t("Jogos e fases")}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/teams/[teamId]" options={{title:t("Equipa")}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/results" options={{title:t("Resultados por prova")}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/matches" options={{title:t("Jogos individuais")}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/participants" options={{title:t("Participantes e inscrições")}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/manage" options={{title:t("Gerir torneio")}}/>
    <Stack.Screen name="posts/[postId]/index" options={{title:t("Publicação")}}/>
    <Stack.Screen name="posts/[postId]/likers" options={{title:t("Quem gostou")}}/>
    <Stack.Screen name="feed" options={{title:t("Feed")}}/>
    <Stack.Screen name="feed-hidden" options={{title:t("Publicações ocultas")}}/>
    <Stack.Screen name="people" options={{title:t("Pessoas para conhecer")}}/>
    <Stack.Screen name="search" options={{title:t("Pesquisar")}}/>
    <Stack.Screen name="first-steps" options={{title:t("Primeiros passos")}}/>
    <Stack.Screen name="venues" options={{title:t("Recintos")}}/>
    <Stack.Screen name="venues/create" options={{title:t("Sugerir recinto")}}/>
    <Stack.Screen name="venues/[id]" options={{title:t("Recinto")}}/>
    <Stack.Screen name="venues/[id]/suggest-edit" options={{title:t("Sugerir correção")}}/>
    <Stack.Screen name="sessions/create" options={{title:t('Criar sessão')}}/>
    <Stack.Screen name="social/[username]/index" options={{title:t('Perfil')}}/>
    <Stack.Screen name="social/[username]/[kind]" options={{title:t('Seguidores e seguindo')}}/>
    <Stack.Screen name="communities/[id]/competitions" options={{title:t('Competições da comunidade')}}/>
    <Stack.Screen name="communities/[id]/championships/create" options={{title:t('Criar campeonato')}}/>
    <Stack.Screen name="communities/[id]/championships/[championshipId]" options={{title:t('Campeonato')}}/>
    <Stack.Screen name="communities/[id]/championships/teams" options={{title:t('Equipas do campeonato')}}/>
    <Stack.Screen name="communities/[id]/championships/honours" options={{title:t('Palmarés do campeonato')}}/>
    <Stack.Screen name="communities/[id]/championships/events" options={{title:t("Provas do campeonato")}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/events" options={{title:t('Eventos do torneio')}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/relays" options={{title:t('Estafetas do torneio')}}/>
    <Stack.Screen name="tournaments/[communityId]/[id]/provas" options={{title:t("Provas")}}/>
    <Stack.Screen name="notification-settings" options={{title:t("Gerir notificações")}}/>
    <Stack.Screen name="nearby-alerts" options={{title:t("Jogos perto de ti")}}/>
    <Stack.Screen name="communities/[id]/championships/fixture" options={{title:t("Calendário do campeonato")}}/>
    <Stack.Screen name="communities/[id]/results" options={{title:t("Resultados da comunidade")}}/>
    <Stack.Screen name="sessions/[id]/result" options={{title:t("Resultado da sessão")}}/>
    <Stack.Screen name="stories/replies" options={{title:t("Respostas às Stories")}}/>
    <Stack.Screen name="my-sessions" options={{title:t("As minhas sessões")}}/>
    <Stack.Screen name="login" options={{title:t('Entrar na Jynlo')}}/>
    <Stack.Screen name="change-password" options={{title:t('Alterar palavra-passe')}}/>
    <Stack.Screen name="security-mfa" options={{title:t('Verificação em dois passos')}}/>
    <Stack.Screen name="device-sessions" options={{title:t('Sessões no site')}}/>
    <Stack.Screen name="edit-profile" options={{title:t('Editar perfil')}}/>
    <Stack.Screen name="register" options={{title:t('Criar conta')}}/>
    <Stack.Screen name="confirm-email" options={{title:t('Confirmar email')}}/>
    <Stack.Screen name="reset-password" options={{title:t('Recuperar palavra-passe')}}/>
    <Stack.Screen name="legal" options={{title:t('Informação legal')}}/>
    <Stack.Screen name="feedback" options={{title:t('Enviar opinião')}}/>
    <Stack.Screen name="google-onboarding" options={{title:t('Registo com Google')}}/>
    <Stack.Screen name="mfa" options={{title:t('Verificação MFA')}}/>
  </Stack>
</>;}
export default function RootLayout(){return <AuthProvider><LanguageProvider><Navigation/></LanguageProvider></AuthProvider>;}

// Expo Router renders a recoverable error screen instead of a blank page for
// route exceptions; the error is reported first so we see it in the server log.
export function ErrorBoundary(props:ErrorBoundaryProps){
  useEffect(()=>{reportClientError(props.error,{fatal:true});},[props.error]);
  return <RouterErrorBoundary {...props}/>;
}
