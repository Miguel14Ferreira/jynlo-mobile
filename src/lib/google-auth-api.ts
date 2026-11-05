import {DEMO_MODE,request} from './api';

export interface GoogleAuthResponse {
 onboardingRequired:boolean;
 email:string|null;
 fullName:string|null;
 pictureUrl:string|null;
 mfaRequired:boolean;
 challengeId:string|null;
 challengeExpiresAt:string|null;
 token:string|null;
 profile:{username?:string|null}|null;
}
export interface GoogleSignupInput {
 username:string;
 nickname:string|null;
 dateOfBirth:string;
 country:string;
 indicativePhone:string|null;
 phone:string|null;
 gender:string|null;
 acceptedLegalTerms:true;
}
/**
 * The Jynlo backend checks Google's signature, audience and email verification.
 * Never accept a Google email/name directly as proof of identity on the device.
 */
export async function googleLoginWithIdToken(credential:string):Promise<GoogleAuthResponse>{
 if(DEMO_MODE)throw Error('Autenticação Google indisponível no modo de demonstração.');
 if(!credential?.trim())throw Error('A Google não devolveu uma credencial de identidade.');
 return request<GoogleAuthResponse>('/api/auth/google/login',{method:'POST',body:{credential}});
}
export async function googleRegisterWithIdToken(
 credential:string,input:GoogleSignupInput
):Promise<GoogleAuthResponse>{
 if(DEMO_MODE)throw Error('O registo Google não funciona em demonstração.');
 if(!credential?.trim())throw Error('A credencial Google expirou. Reinicia o início de sessão.');
 if(!input.acceptedLegalTerms)throw Error('Tens de aceitar os Termos e a Política de Privacidade.');
 return request<GoogleAuthResponse>('/api/auth/google/register',{
  method:'POST',body:{credential,...input}
 });
}
