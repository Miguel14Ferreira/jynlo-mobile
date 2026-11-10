import React, {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {AppState} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {DEMO_MODE,confirmMfa,resendMfa as apiResendMfa,signIn as apiSignIn,logoutServer} from './api';
import {assertCanStartLogin} from './account-session.cjs';
import {googleLoginWithIdToken,googleRegisterWithIdToken} from './google-auth-api';
import type {GoogleSignupInput} from './google-auth-api';
import {accessTokenExpiresAt,isAccessTokenUsable} from './token-expiry.cjs';
import {disableMobilePush,clearNativePushPresentation} from './mobile-push';

type AuthOutcome = 'AUTHENTICATED'|'MFA_REQUIRED';
type GoogleAuthOutcome = AuthOutcome|'ONBOARDING_REQUIRED';
interface AuthContextValue {
  ready:boolean; username:string|null; token:string|null; challengeId:string|null;
  browsingAsGuest:boolean; browseAsGuest:()=>void;
  login:(name:string,password:string)=>Promise<AuthOutcome>;
  loginGoogle:(credential:string)=>Promise<GoogleAuthOutcome>;
  googleOnboardingEmail:string|null;
  completeGoogleRegistration:(input:GoogleSignupInput)=>Promise<void>;
  loginDemo:(name:string)=>void;
  completeMfa:(code:string)=>Promise<void>;
  resendMfa:()=>Promise<void>;
  logout:()=>Promise<void>;
}
const AuthContext=createContext<AuthContextValue|null>(null);
const TOKEN_KEY='jynlo.mobile.accessToken';
const USER_KEY='jynlo.mobile.username';
export function AuthProvider({children}:{children:React.ReactNode}){
  const [ready,setReady]=useState(false);
  const [username,setUsername]=useState<string|null>(null);
  const [token,setToken]=useState<string|null>(null);
  const [challengeId,setChallengeId]=useState<string|null>(null);
  const [pendingUsername,setPendingUsername]=useState<string|null>(null);
  const [googlePending,setGooglePending]=useState<{credential:string;email:string}|null>(null);
  const [browsingAsGuest,setBrowsingAsGuest]=useState(false);
  useEffect(()=>{let active=true;(async()=>{
    try{
      if(!DEMO_MODE){const [savedToken,savedName]=await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),SecureStore.getItemAsync(USER_KEY)]);
        if(active){
          if(savedToken&&savedName&&isAccessTokenUsable(savedToken)){
            setToken(savedToken);setUsername(savedName);
          }else{
            setToken(null);setUsername(null);
            if(savedToken||savedName)await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY),SecureStore.deleteItemAsync(USER_KEY)]);
          }
        }
      }
    }catch{ /* secure storage not available; show logged-out state */ }
    finally{if(active)setReady(true);}
  })();return()=>{active=false;};},[]);
  useEffect(()=>{
    if(DEMO_MODE||!token)return;
    const expire=()=>{
      if(isAccessTokenUsable(token))return;
      setToken(null);setUsername(null);setChallengeId(null);setPendingUsername(null);setGooglePending(null);
      setBrowsingAsGuest(false);
      void clearNativePushPresentation().catch(()=>{});
      void Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY),SecureStore.deleteItemAsync(USER_KEY)]).catch(()=>{});
    };
    const expiresAt=accessTokenExpiresAt(token);
    // setTimeout cannot represent delays longer than ~24.8 days. Re-arm
    // the timer until the JWT is actually near expiry.
    let timer:ReturnType<typeof setTimeout>|null=null;
    let active=true;
    const schedule=()=>{
      if(!active)return;
      if(!isAccessTokenUsable(token)){expire();return;}
      const remaining=(expiresAt??0)-Date.now()-15000;
      timer=setTimeout(schedule,Math.max(1,Math.min(2147483647,remaining)));
    };
    schedule();
    const sub=AppState.addEventListener('change',state=>{if(state==='active'){if(timer)clearTimeout(timer);schedule();}});
    return()=>{active=false;if(timer)clearTimeout(timer);sub.remove();};
  },[token]);
  const save=useCallback(async(name:string,accessToken:string)=>{
    if(!isAccessTokenUsable(accessToken))throw new Error('O servidor devolveu uma sessão inválida ou expirada. Tenta novamente.');
    try{
      await Promise.all([SecureStore.setItemAsync(TOKEN_KEY,accessToken),SecureStore.setItemAsync(USER_KEY,name)]);
    }catch{
      // A partial storage write must never restore mismatched username/token on next launch.
      await Promise.allSettled([SecureStore.deleteItemAsync(TOKEN_KEY),SecureStore.deleteItemAsync(USER_KEY)]);
      throw new Error('Não foi possível guardar a sessão em segurança. Tenta iniciar sessão novamente.');
    }
    setUsername(name);setToken(accessToken);setChallengeId(null);setPendingUsername(null);setGooglePending(null);
    setBrowsingAsGuest(false);
  },[]);
  const login=useCallback(async(name:string,password:string):Promise<AuthOutcome>=>{
    assertCanStartLogin(username);
    if(DEMO_MODE)throw new Error('Seleciona uma das contas de demonstração.');
    const response=await apiSignIn(name,password);
    if(response.mfaRequired){if(!response.challengeId)throw new Error('Desafio MFA inválido.');
      setChallengeId(response.challengeId);setPendingUsername(name);return 'MFA_REQUIRED';}
    if(!response.token)throw new Error('O servidor não enviou uma sessão válida.');
    await save(response.profile?.username?.trim()||name,response.token);return 'AUTHENTICATED';
  },[save,username]);
  const loginGoogle=useCallback(async(credential:string):Promise<GoogleAuthOutcome>=>{
    assertCanStartLogin(username);
    if(DEMO_MODE)throw Error('Autenticação Google indisponível em demonstração.');
    // The server verifies Google's signature, audience and email before any account is accepted.
    const googleResponse=await googleLoginWithIdToken(credential);
    if(googleResponse.onboardingRequired){
      if(!googleResponse.email)throw Error('O servidor não confirmou o email Google.');
      setGooglePending({credential,email:googleResponse.email});
      return 'ONBOARDING_REQUIRED';
    }
    setGooglePending(null);
    if(googleResponse.mfaRequired){
      if(!googleResponse.challengeId)throw Error('Desafio MFA Google inválido.');
      setChallengeId(googleResponse.challengeId);
      // Google MFA does not include a profile until the challenge is confirmed.
      setPendingUsername(null);
      return 'MFA_REQUIRED';
    }
    if(!googleResponse.token||!googleResponse.profile?.username?.trim())
      throw Error('O servidor não confirmou uma sessão Jynlo válida.');
    await save(googleResponse.profile.username.trim(),googleResponse.token);
    return 'AUTHENTICATED';
  },[save,username]);
  const completeGoogleRegistration=useCallback(async(input:GoogleSignupInput)=>{
    assertCanStartLogin(username);
    if(!googlePending)throw Error('A sessão de registo Google expirou. Volta a iniciar sessão.');
    // Never persist Google ID credentials; registration uses the same short-lived verified token.
    const googleResponse=await googleRegisterWithIdToken(googlePending.credential,input);
    if(googleResponse.onboardingRequired||googleResponse.mfaRequired||!googleResponse.token||
       !googleResponse.profile?.username?.trim())throw Error('O registo não devolveu uma sessão válida.');
    await save(googleResponse.profile.username.trim(),googleResponse.token);
  },[googlePending,save,username]);
  const completeMfa=useCallback(async(code:string)=>{
    if(!challengeId)throw new Error('Desafio MFA não encontrado.');
    const response=await confirmMfa(challengeId,code);
    if(!response.token)throw new Error('O código não foi aceite.');
    const confirmedName=response.profile?.username?.trim()||pendingUsername;
    if(!confirmedName)throw Error('O servidor não confirmou o utilizador após MFA.');
    await save(confirmedName,response.token);
  },[challengeId,pendingUsername,save]);
  const resendMfa=useCallback(async()=>{
    if(!challengeId)throw new Error('Desafio MFA não encontrado. Inicia sessão novamente.');
    const response=await apiResendMfa(challengeId);
    if(!response.mfaRequired||!response.challengeId)throw new Error('Não foi possível renovar o código MFA. Inicia sessão novamente.');
    setChallengeId(response.challengeId);
  },[challengeId,pendingUsername]);
  const browseAsGuest=useCallback(()=>{if(!username&&!token)setBrowsingAsGuest(true);},[username,token]);
  const loginDemo=useCallback((name:string)=>{
    if(!DEMO_MODE)return;
    assertCanStartLogin(username);
    setUsername(name);setToken('LOCAL_DEMO_NOT_A_REAL_TOKEN');setBrowsingAsGuest(false);
  },[username]);
  const logout=useCallback(async()=>{
    // Invalidate the in-memory session immediately: network requests must never
    // keep an account visible or interactive after the user chooses to sign out.
    const tokenToRevoke=token;
    const nameToRevoke=username;
    setToken(null);setUsername(null);setChallengeId(null);setPendingUsername(null);setGooglePending(null);
    setBrowsingAsGuest(false);
    // Remove local credentials before potentially slow remote revocation.
    // Treat cleanup failures as non-fatal: the user is logged out in memory.
    let localRemovalFailed=false;
    if(!DEMO_MODE){
      const removals=await Promise.allSettled([
        SecureStore.deleteItemAsync(TOKEN_KEY),SecureStore.deleteItemAsync(USER_KEY)]);
      localRemovalFailed=removals.some(result=>result.status==='rejected');
    }
    try{await clearNativePushPresentation();}catch{/* Local cleanup must never block logout. */}
    let serverRevokeFailed=false;
    if(!DEMO_MODE&&tokenToRevoke){
      // Remove push registration first, then revoke the old bearer token.
      if(nameToRevoke)try{await disableMobilePush(nameToRevoke,tokenToRevoke);}catch{/* Keep local registration marker for later recovery. */}
      try{await logoutServer(tokenToRevoke);}catch{serverRevokeFailed=true;}
    }
    // Do not pretend the account was fully signed out when both persistence
    // deletion and server revocation could have failed. The UI is signed out
    // immediately, but the user needs to know that credentials may survive.
    if(localRemovalFailed){
      throw new Error(serverRevokeFailed?
        'A sessão foi fechada neste ecrã, mas não foi possível apagar a credencial do telemóvel nem confirmar a revogação no servidor. Fecha a aplicação e tenta terminar sessão novamente após iniciares sessão.':
        'A sessão foi fechada neste ecrã, mas não foi possível confirmar a remoção das credenciais guardadas. Verifica novamente a sessão antes de partilhares o dispositivo.');
    }
  },[token,username]);
  const value=useMemo(()=>({ready,username,token,challengeId,browsingAsGuest,browseAsGuest,login,
    loginGoogle,googleOnboardingEmail:googlePending?.email||null,completeGoogleRegistration,
    loginDemo,completeMfa,resendMfa,logout}),
    [ready,username,token,challengeId,browsingAsGuest,browseAsGuest,login,loginGoogle,googlePending,completeGoogleRegistration,loginDemo,completeMfa,resendMfa,logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const c=useContext(AuthContext);if(!c)throw new Error('AuthProvider obrigatório');return c;}
