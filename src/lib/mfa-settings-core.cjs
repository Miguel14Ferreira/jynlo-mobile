'use strict';
const {tr}=require('./i18n-core.cjs');
/** Authenticator-app (TOTP) settings — same flow as the web profile page. */
function normalizeTotp(code){
 const d=String(code||'').replace(/\D/g,'');
 if(d.length!==6)throw new Error(tr('Introduz o código de 6 dígitos mostrado na app autenticadora.'));
 return d;
}
/** Easier to type by hand: groups of 4 characters. */
function formatSecret(secret){return String(secret||'').replace(/\s+/g,'').replace(/(.{4})/g,'$1 ').trim();}
/** Only an otpauth TOTP link is ever opened (it hands the key to the authenticator app). */
function safeOtpauthUri(uri){
 const s=String(uri||'');
 return /^otpauth:\/\/totp\/[^\s]{1,300}$/i.test(s)&&/[?&]secret=[A-Z2-7]+/i.test(s)?s:null;
}
/** Only an inline PNG QR code returned by the API is shown. */
function safeQrDataUrl(url){
 const s=String(url||'');
 return /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s)&&s.length<400000?s:null;
}
function mfaErrorMessage(status,fallback){
 if(status===400||status===422)return tr('Código inválido. Confirma a hora do telemóvel e usa o código atual.');
 if(status===409)return tr('A verificação em dois passos já está ativa. Para mudar de autenticador, desativa-a primeiro com um código válido.');
 if(status===429)return tr('Demasiadas tentativas. Aguarda alguns minutos antes de tentar de novo.');
 return fallback||tr('Não foi possível concluir o pedido.');
}
module.exports={normalizeTotp,formatSecret,safeOtpauthUri,safeQrDataUrl,mfaErrorMessage};
