import {Platform} from 'react-native';
import Constants from 'expo-constants';
import {API_BASE,DEMO_MODE} from './api';
import {buildReport,createSendGate} from './client-error-core.cjs';

// Sends app errors to the Jynlo server, which writes them to its log.
// Never sends the login token: reports are anonymous. Never throws.

let currentRoute='';
const shouldSend=createSendGate();
let installed=false;

export function setErrorRoute(route:string|null|undefined){currentRoute=route||'';}

export function reportClientError(error:unknown,{fatal=false}:{fatal?:boolean}={}){
  try{
    if(DEMO_MODE||!API_BASE)return;
    const report=buildReport(error,{platform:Platform.OS,appVersion:Constants.expoConfig?.version??null,route:currentRoute,fatal});
    if(!shouldSend(report))return;
    void fetch(`${API_BASE}/api/client-errors`,{method:'POST',credentials:'omit',redirect:'error',cache:'no-store',
      headers:{'Content-Type':'application/json'},body:JSON.stringify(report)}).catch(()=>{});
  }catch{
    // Reporting must never cause a second error.
  }
}

type GlobalHandler=(error:unknown,isFatal?:boolean)=>void;
type ErrorUtilsShape={getGlobalHandler():GlobalHandler;setGlobalHandler(handler:GlobalHandler):void};

/** Reports uncaught JavaScript errors, then lets React Native handle them as before. */
export function installGlobalErrorReporting(){
  if(installed)return;
  installed=true;
  try{
    const utils=(globalThis as {ErrorUtils?:ErrorUtilsShape}).ErrorUtils;
    if(!utils)return;
    const previous=utils.getGlobalHandler();
    utils.setGlobalHandler((error,isFatal)=>{
      reportClientError(error,{fatal:isFatal===true});
      previous(error,isFatal);
    });
  }catch{
    // Keep React Native's own handler if anything above fails.
  }
}
