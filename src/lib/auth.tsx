import React, {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {DEMO_MODE,confirmMfa,resendMfa as apiResendMfa,signIn as apiSignIn,logoutServer} from './api';
import {assertCanStartLogin} from './account-session.cjs';
import {googleLoginWithIdToken,googleRegisterWithIdToken} from './google-auth-api';
import {appleLoginWithIdToken,appleRegisterWithIdToken} from './apple-auth';
import {facebookLoginWithToken,facebookRegisterWithToken} from './facebook-auth';
import type {GoogleSignupInput} from './google-auth-api';
import {accessTokenExpiresAt,isAccessTokenUsable} from './token-expiry.cjs';
import {clearNativeRefreshToken,refreshNativeSession} from './native-session';
import {disableMobilePush,clearNativePushPresentation,invalidatePendingPushRegistration} from './mobile-push';

type AuthOutcome = 'AUTHENTICATED'|'MFA_REQUIRED';
type GoogleAuthOutcome = AuthOutcome|'ONBOARDING_REQUIRED';
interface AuthContextValue {
  ready:boolean; username:string|null; token:string|null; challengeId:string|null;
  browsingAsGuest:boolean; browseAsGuest:()=>void;
  login:(name:string,password:string)=>Promise<AuthOutcome>;
  loginGoogle:(credential:string)=>Promise<GoogleAuthOutcome>;
  /** Same outcomes as Google; the onboarding screen completes either provider. */
  loginApple:(credential:string,fullName:string|null)=>Promise<GoogleAuthOutcome>;
  loginFacebook:(credential:string)=>Promise<GoogleAuthOutcome>;
  onboardingProvider:'google'|'apple'|'facebook'|null;
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
  const [googlePending,setGooglePending]=useState<{credential:string;email:string;provider?:'google'|'apple'|'facebook';fullName?:string|null}|null>(null);
  const [browsingAsGuest,setBrowsingAsGuest]=useState(false);
  // Auth responses and secure-store writes must never revive a logged-out account.
  const authEpoch=useRef(0);
  const credentialQueue=useRef<Promise<void>>(Promise.resolve());
  // Exchanges the device's refresh token for a fresh access token without asking for the password.
  const restoreFromRefresh=useCallback(async(epoch:number):Promise<boolean>=>{
    const outcome=await refreshNativeSession();
    if(typeof outcome!=='object'||epoch!==authEpoch.current||!isAccessTokenUsable(outcome.token))return false;
    const write=async()=>{await Promise.all([SecureStore.setItemAsync(TOKEN_KEY,outcome.token),SecureStore.setItemAsync(USER_KEY,outcome.username)]);};
    credentialQueue.current=credentialQueue.current.then(write,write).catch(()=>{});
    await credentialQueue.current;
    if(epoch!==authEpoch.current)return false;
    setUsername(outcome.username);setToken(outcome.token);
    return true;
  },[setToken,setUsername]);
  useEffect(()=>{let active=true;const restoreEpoch=authEpoch.current;(async()=>{
    try{
      if(!DEMO_MODE){const [savedToken,savedName]=await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),SecureStore.getItemAsync(USER_KEY)]);
        // Logout or a newer login can win while SecureStore is restoring.
        if(active&&restoreEpoch===authEpoch.current){
          if(savedToken&&savedName&&isAccessTokenUsable(savedToken)){
            setToken(savedToken);setUsername(savedName);
          }else if(savedName&&await restoreFromRefresh(restoreEpoch)){
            // Signed back in with the stored refresh token, like Instagram.
          }else{
            setToken(null);setUsername(null);
            if(savedToken||savedName){
              const clear=async()=>{
                // A login may have succeeded while the stale restore was waiting
                // for its turn in the SecureStore queue. Never delete its credentials.
                if(!active||restoreEpoch!==authEpoch.current)return;
                await Promise.allSettled([SecureStore.deleteItemAsync(TOKEN_KEY),SecureStore.deleteItemAsync(USER_KEY)]);
              };
              credentialQueue.current=credentialQueue.current.then(clear,clear);
              await credentialQueue.current;
            }
          }
        }
      }
    }catch{ /* secure storage not available; show logged-out state */ }
    finally{if(active)setReady(true);}
  })();return()=>{active=false;};},[]);
  useEffect(()=>{
    if(DEMO_MODE||!token)return;
    const tokenEpoch=authEpoch.current;
    let refreshing=false;
    const expire=()=>{
      if(tokenEpoch!==authEpoch.current||isAccessTokenUsable(token)||refreshing)return;
      refreshing=true;
      void restoreFromRefresh(tokenEpoch).then(ok=>{refreshing=false;if(!ok)endSession();},()=>{refreshing=false;endSession();});
    };
    const endSession=()=>{
      if(tokenEpoch!==authEpoch.current||isAccessTokenUsable(token))return;
      authEpoch.current++;
      invalidatePendingPushRegistration();
      setToken(null);setUsername(null);setChallengeId(null);setPendingUsername(null);setGooglePending(null);
      setBrowsingAsGuest(false);
      void clearNativePushPresentation().catch(()=>{});
      // Serialize expiry cleanup after an in-flight credential write.
      const expireEpoch=authEpoch.current;
      const clear=async()=>{
        if(expireEpoch!==authEpoch.current)return;
        await Promise.allSettled([SecureStore.deleteItemAsync(TOKEN_KEY),SecureStore.deleteItemAsync(USER_KEY)]);
      };
      credentialQueue.current=credentialQueue.current.then(clear,clear);
      void credentialQueue.current.catch(()=>{});
    };
    const expiresAt=accessTokenExpiresAt(token);
    // setTimeout cannot represent delays longer than ~24.8 days. Re-arm
    // the timer until the JWT is actually near expiry.
    let timer:ReturnType<typeof setTimeout>|null=null;
    let active=true;
    const schedule=()=>{
      if(!active||tokenEpoch!==authEpoch.current)return;
      if(!isAccessTokenUsable(token)){expire();return;}
      const remaining=(expiresAt??0)-Date.now()-15000;
      timer=setTimeout(schedule,Math.max(1,Math.min(2147483647,remaining)));
    };
    schedule();
    const sub=AppState.addEventListener('change',state=>{if(state==='active'){if(timer)clearTimeout(timer);schedule();}});
    return()=>{active=false;if(timer)clearTimeout(timer);sub.remove();};
  // restoreFromRefresh is stable (no dependencies).
  },[token]);
  const save=useCallback(async(name:string,accessToken:string,epoch:number)=>{
    if(!isAccessTokenUsable(accessToken))throw new Error('O servidor devolveu uma sessão inválida ou expirada. Tenta novamente.');
    const work=credentialQueue.current.then(async()=>{
      if(epoch!==authEpoch.current)throw Error('Esta tentativa de login foi cancelada após mudança de sessão.');
      try{
        await Promise.all([SecureStore.setItemAsync(TOKEN_KEY,accessToken),SecureStore.setItemAsync(USER_KEY,name)]);
      }catch{
        // Queue serialization protects against another login writing during cleanup.
        await Promise.allSettled([SecureStore.deleteItemAsync(TOKEN_KEY),SecureStore.deleteItemAsync(USER_KEY)]);
        throw Error('Não foi possível guardar a sessão em segurança. Tenta iniciar sessão novamente.');
      }
      if(epoch!==authEpoch.current)
        throw Error('Esta tentativa de login foi cancelada após mudança de sessão.');
      // Commit a new auth generation before publishing React state. The
      // SecureStore cold-start restore and older expiry callbacks are stale now.
      authEpoch.current++;
      setUsername(name);setToken(accessToken);setChallengeId(null);setPendingUsername(null);setGooglePending(null);
      setBrowsingAsGuest(false);
    });
    credentialQueue.current=work.then(()=>{},()=>{});
    return work;
  },[]);
  const login=useCallback(async(name:string,password:string):Promise<AuthOutcome>=>{
    assertCanStartLogin(username);
    if(DEMO_MODE)throw new Error('Seleciona uma das contas de demonstração.');
    const epoch=authEpoch.current;
    const response=await apiSignIn(name,password);
    if(epoch!==authEpoch.current)throw Error('Login cancelado após mudança de sessão.');
    if(response.mfaRequired){if(!response.challengeId)throw new Error('Desafio MFA inválido.');
      setChallengeId(response.challengeId);setPendingUsername(name);return 'MFA_REQUIRED';}
    if(!response.token)throw new Error('O servidor não enviou uma sessão válida.');
    await save(response.profile?.username?.trim()||name,response.token,epoch);return 'AUTHENTICATED';
  },[save,username]);
  const loginGoogle=useCallback(async(credential:string):Promise<GoogleAuthOutcome>=>{
    assertCanStartLogin(username);
    if(DEMO_MODE)throw Error('Autenticação Google indisponível em demonstração.');
    // The server verifies Google's signature, audience and email before any account is accepted.
    const epoch=authEpoch.current;
    const googleResponse=await googleLoginWithIdToken(credential);
    if(epoch!==authEpoch.current)throw Error('Login Google cancelado após mudança de sessão.');
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
    await save(googleResponse.profile.username.trim(),googleResponse.token,epoch);
    return 'AUTHENTICATED';
  },[save,username]);
  const loginApple=useCallback(async(credential:string,fullName:string|null):Promise<GoogleAuthOutcome>=>{
    assertCanStartLogin(username);
    if(DEMO_MODE)throw Error('Iniciar sessão com a Apple indisponível em demonstração.');
    const epoch=authEpoch.current;
    const response=await appleLoginWithIdToken(credential,fullName);
    if(epoch!==authEpoch.current)throw Error('Login Apple cancelado após mudança de sessão.');
    if(response.onboardingRequired){
      if(!response.email)throw Error('O servidor não confirmou o email da Apple.');
      setGooglePending({credential,email:response.email,provider:'apple',fullName});
      return 'ONBOARDING_REQUIRED';
    }
    setGooglePending(null);
    if(response.mfaRequired){
      if(!response.challengeId)throw Error('Desafio MFA inválido.');
      setChallengeId(response.challengeId);setPendingUsername(null);
      return 'MFA_REQUIRED';
    }
    if(!response.token||!response.profile?.username?.trim())
      throw Error('O servidor não confirmou uma sessão Jynlo válida.');
    await save(response.profile.username.trim(),response.token,epoch);
    return 'AUTHENTICATED';
  },[save,username]);
  const loginFacebook=useCallback(async(credential:string):Promise<GoogleAuthOutcome>=>{
    assertCanStartLogin(username);
    if(DEMO_MODE)throw Error('Login com Facebook indisponível em demonstração.');
    const epoch=authEpoch.current;
    const response=await facebookLoginWithToken(credential);
    if(epoch!==authEpoch.current)throw Error('Login Facebook cancelado após mudança de sessão.');
    if(response.onboardingRequired){
      if(!response.email)throw Error('O servidor não confirmou o email do Facebook.');
      setGooglePending({credential,email:response.email,provider:'facebook',fullName:response.fullName});
      return 'ONBOARDING_REQUIRED';
    }
    setGooglePending(null);
    if(response.mfaRequired){
      if(!response.challengeId)throw Error('Desafio MFA inválido.');
      setChallengeId(response.challengeId);setPendingUsername(null);
      return 'MFA_REQUIRED';
    }
    if(!response.token||!response.profile?.username?.trim())
      throw Error('O servidor não confirmou uma sessão Jynlo válida.');
    await save(response.profile.username.trim(),response.token,epoch);
    return 'AUTHENTICATED';
  },[save,username]);
  const completeGoogleRegistration=useCallback(async(input:GoogleSignupInput)=>{
    assertCanStartLogin(username);
    if(!googlePending)throw Error('A sessão de registo Google expirou. Volta a iniciar sessão.');
    // Never persist Google ID credentials; registration uses the same short-lived verified token.
    const epoch=authEpoch.current;
    const googleResponse=googlePending.provider==='apple'
      ?await appleRegisterWithIdToken(googlePending.credential,googlePending.fullName??null,input)
      :googlePending.provider==='facebook'
      ?await facebookRegisterWithToken(googlePending.credential,input)
      :await googleRegisterWithIdToken(googlePending.credential,input);
    if(epoch!==authEpoch.current)throw Error('Registo Google cancelado após mudança de sessão.');
    if(googleResponse.onboardingRequired||googleResponse.mfaRequired||!googleResponse.token||
       !googleResponse.profile?.username?.trim())throw Error('O registo não devolveu uma sessão válida.');
    await save(googleResponse.profile.username.trim(),googleResponse.token,epoch);
  },[googlePending,save,username]);
  const completeMfa=useCallback(async(code:string)=>{
    if(!challengeId)throw new Error('Desafio MFA não encontrado.');
    const epoch=authEpoch.current;
    const response=await confirmMfa(challengeId,code);
    if(epoch!==authEpoch.current)throw Error('Verificação cancelada após mudança de sessão.');
    if(!response.token)throw new Error('O código não foi aceite.');
    const confirmedName=response.profile?.username?.trim()||pendingUsername;
    if(!confirmedName)throw Error('O servidor não confirmou o utilizador após MFA.');
    await save(confirmedName,response.token,epoch);
  },[challengeId,pendingUsername,save]);
  const resendMfa=useCallback(async()=>{
    if(!challengeId)throw new Error('Desafio MFA não encontrado. Inicia sessão novamente.');
    const epoch=authEpoch.current;
    const response=await apiResendMfa(challengeId);
    if(epoch!==authEpoch.current)throw Error('Pedido MFA cancelado após mudança de sessão.');
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
    authEpoch.current++;
    // Synchronous cancellation before the first async credential or native operation.
    invalidatePendingPushRegistration();
    setToken(null);setUsername(null);setChallengeId(null);setPendingUsername(null);setGooglePending(null);
    setBrowsingAsGuest(false);
    // Saved offline copies (Explorar, As minhas sessões) belong to this account.
    void import('./offline-cache').then(m=>m.clearOfflineSnapshots()).catch(()=>{});
    // Remove local credentials before potentially slow remote revocation.
    // Treat cleanup failures as non-fatal: the user is logged out in memory.
    let localRemovalFailed=false;
    if(!DEMO_MODE){
      // Wait for any credential write that started before logout, then delete it.
      const clear=async()=>{
        const removals=await Promise.allSettled([
          SecureStore.deleteItemAsync(TOKEN_KEY),SecureStore.deleteItemAsync(USER_KEY),clearNativeRefreshToken()]);
        localRemovalFailed=removals.some(result=>result.status==='rejected');
      };
      const cleanup=credentialQueue.current.then(clear,clear);
      credentialQueue.current=cleanup;
      await cleanup;
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
    loginGoogle,loginApple,loginFacebook,onboardingProvider:googlePending?(googlePending.provider||'google'):null,googleOnboardingEmail:googlePending?.email||null,completeGoogleRegistration,
    loginDemo,completeMfa,resendMfa,logout}),
    [ready,username,token,challengeId,browsingAsGuest,browseAsGuest,login,loginGoogle,loginApple,loginFacebook,googlePending,completeGoogleRegistration,loginDemo,completeMfa,resendMfa,logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const c=useContext(AuthContext);if(!c)throw new Error('AuthProvider obrigatório');return c;}
