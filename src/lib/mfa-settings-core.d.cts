export function normalizeTotp(code:string):string;
export function formatSecret(secret:string):string;
export function safeOtpauthUri(uri:string|null|undefined):string|null;
export function safeQrDataUrl(url:string|null|undefined):string|null;
export function mfaErrorMessage(status:number|null|undefined,fallback?:string):string;
