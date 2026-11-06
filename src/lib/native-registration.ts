import {DEMO_MODE,request} from './api';

export type NativeRegistrationInput={
 username:string;password:string;nickname:string|null;dateOfBirth:string;
 country:string;indicativePhone:null;phone:null;gender:string|null;
 email:string;acceptedLegalTerms:true;returnSessionId:null;returnCommunityId:null;
};

export function validAdultDate(date:string,now=new Date()):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const year=Number(date.slice(0,4)),month=Number(date.slice(5,7)),day=Number(date.slice(8,10));
 const birth=new Date(Date.UTC(year,month-1,day));
 if(birth.getUTCFullYear()!==year||birth.getUTCMonth()!==month-1||birth.getUTCDate()!==day)return false;
 const today=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 const upper=new Date(today);upper.setUTCFullYear(upper.getUTCFullYear()-18);
 const lower=new Date(today);lower.setUTCFullYear(lower.getUTCFullYear()-120);
 return birth<=upper&&birth>=lower;
}

export function validateNativeRegistration(input:{
 username:string;password:string;confirmPassword:string;email:string;dateOfBirth:string;country:string;acceptedLegalTerms:boolean;
}):string|null{
 if(input.username.trim().length<3||input.username.trim().length>50)return 'O nome de utilizador deve ter entre 3 e 50 caracteres.';
 if(input.password.length<8||input.password.length>128)return 'A palavra-passe deve ter entre 8 e 128 caracteres.';
 if(input.password!==input.confirmPassword)return 'As palavras-passe não coincidem.';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())||input.email.trim().length>254)return 'Introduz um email válido.';
 if(!validAdultDate(input.dateOfBirth))return 'Tens de ter pelo menos 18 anos. Confirma a data no formato AAAA-MM-DD.';
 if(!input.country.trim()||input.country.trim().length>100)return 'Seleciona um país válido.';
 if(!input.acceptedLegalTerms)return 'É necessário aceitar os Termos e a Política de Privacidade.';
 return null;
}

export async function registerNative(input:NativeRegistrationInput):Promise<void>{
 if(DEMO_MODE)throw Error('A criação de contas está indisponível no modo de demonstração.');
 await request('/api/auth/register/mobile',{method:'POST',body:input});
}

export async function resendRegistrationConfirmation(username:string):Promise<void>{
 if(DEMO_MODE)throw Error('Indisponível no modo de demonstração.');
 const cleaned=username.trim();
 if(!cleaned)throw Error('Introduz o nome de utilizador.');
 await request('/api/auth/register/resend-confirmation?username='+encodeURIComponent(cleaned),
  {method:'POST',body:null});
}

export async function initiateNativePasswordReset(email:string):Promise<void>{
 if(DEMO_MODE)throw Error('Indisponível no modo de demonstração.');
 await request('/api/auth/reset-password/initiate',{method:'POST',body:{email:email.trim()}});
}

export async function confirmNativePasswordReset(token:string,newPassword:string):Promise<void>{
 if(DEMO_MODE)throw Error('Indisponível no modo de demonstração.');
 await request('/api/auth/reset-password/confirm',{method:'PUT',body:{token:token.trim(),newPassword}});
}

export async function confirmNativeEmail(token:string):Promise<void>{
 if(DEMO_MODE)throw Error('Indisponível no modo de demonstração.');
 await request('/api/auth/register/confirm?token='+encodeURIComponent(token.trim()));
}
