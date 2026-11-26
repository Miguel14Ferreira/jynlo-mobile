import {useEffect} from 'react';
import {useRouter} from 'expo-router';

/** The Facebook browser login returns to jynlo://auth/facebook; the login screen handles it, so just step back. */
export default function FacebookReturn(){
 const router=useRouter();
 useEffect(()=>{if(router.canGoBack())router.back();else router.replace('/login');},[router]);
 return null;
}
