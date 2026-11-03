import React, {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import * as SecureStore from 'expo-secure-store';
import {DEMO_MODE,confirmMfa,signIn as apiSignIn,logoutServer} from './api';
import {assertCanStartLogin} from './account-session.cjs';

type AuthOutcome = 'AUTHENTICATED'|'MFA_REQUIRED';
interface AuthContextValue {
  ready:boolean; username:string|null; token:string|null; challengeId:string|null;
  login:(name:string,password:string)=>Promise<AuthOutcome>;
  loginDemo:(name:string)=>void;
  completeMfa:(code:string)=>Promise<void>;
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
  useEffect(()=>{let active=true;(async()=>{
    try{
      if(!DEMO_MODE){const [savedToken,savedName]=await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),SecureStore.getItemAsync(USER_KEY)]);
        if(active){setToken(savedToken);setUsername(savedName);}
      }
    }catch{ /* secure storage not available; show logged-out state */ }
    finally{if(active)setReady(true);}
  })();return()=>{active=false;};},[]);
  const save=useCallback(async(name:string,accessToken:string)=>{
    await Promise.all([SecureStore.setItemAsync(TOKEN_KEY,accessToken),SecureStore.setItemAsync(USER_KEY,name)]);
    setUsername(name);setToken(accessToken);setChallengeId(null);setPendingUsername(null);
  },[]);
  const login=useCallback(async(name:string,password:string):Promise<AuthOutcome>=>{
    assertCanStartLogin(username);
    if(DEMO_MODE)throw new Error('Seleciona uma das contas de demonstração.');
    const response=await apiSignIn(name,password);
    if(response.mfaRequired){if(!response.challengeId)throw new Error('Desafio MFA inválido.');
      setChallengeId(response.challengeId);setPendingUsername(name);return 'MFA_REQUIRED';}
    if(!response.token)throw new Error('O servidor não enviou uma sessão válida.');
    await save(name,response.token);return 'AUTHENTICATED';
  },[save,username]);
  const completeMfa=useCallback(async(code:string)=>{
    if(!challengeId||!pendingUsername)throw new Error('Desafio MFA não encontrado.');
    const response=await confirmMfa(challengeId,code);
    if(!response.token)throw new Error('O código não foi aceite.');
    await save(pendingUsername,response.token);
  },[challengeId,pendingUsername,save]);
  const loginDemo=useCallback((name:string)=>{
    if(!DEMO_MODE)return;
    assertCanStartLogin(username);
    setUsername(name);setToken('LOCAL_DEMO_NOT_A_REAL_TOKEN');
  },[username]);
  const logout=useCallback(async()=>{
    if(!DEMO_MODE&&token){try{await logoutServer(token);}catch{/* Always revoke local credentials */}}
    setToken(null);setUsername(null);setChallengeId(null);setPendingUsername(null);
    if(!DEMO_MODE){await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),SecureStore.deleteItemAsync(USER_KEY)]);}
  },[token]);
  const value=useMemo(()=>({ready,username,token,challengeId,login,loginDemo,completeMfa,logout}),
    [ready,username,token,challengeId,login,loginDemo,completeMfa,logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const c=useContext(AuthContext);if(!c)throw new Error('AuthProvider obrigatório');return c;}
