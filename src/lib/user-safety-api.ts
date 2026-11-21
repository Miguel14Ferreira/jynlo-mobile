import {DEMO_MODE,request} from './api';

/** User-generated content moderation endpoints implemented by Jynlo's backend.
 * All operations require a real authenticated session. */
function validPeer(peer:string):string {
 const name=peer.trim();
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(name))throw new Error('Utilizador inválido.');
 return encodeURIComponent(name);
}
function requireSession(token:string):void {
 if(!token||DEMO_MODE)throw new Error('Inicia sessão numa conta Jynlo para continuar.');
}
export async function userBlockStatus(peer:string,token:string):Promise<boolean>{
 requireSession(token);
 return (await request<{blocked:boolean}>(`/api/blocks/users/${validPeer(peer)}/status`,{token})).blocked===true;
}
export async function blockUser(peer:string,token:string):Promise<boolean>{
 requireSession(token);
 return (await request<{blocked:boolean}>(`/api/blocks/users/${validPeer(peer)}`,{token,method:'POST'})).blocked===true;
}
export async function unblockUser(peer:string,token:string):Promise<boolean>{
 requireSession(token);
 return (await request<{blocked:boolean}>(`/api/blocks/users/${validPeer(peer)}`,{token,method:'DELETE'})).blocked===true;
}
export async function reportUser(peer:string,reason:string,token:string):Promise<void>{
 requireSession(token);
 const note=reason.trim();
 if(!note||note.length>1000)throw new Error('Descreve o motivo da denúncia (até 1000 caracteres).');
 // Do not retry an uncertain POST: the report may already have been filed.
 await request<void>(`/api/reports/users/${validPeer(peer)}`,{token,method:'POST',body:{reason:note}});
}

function validId(value:number):number{
 if(!Number.isSafeInteger(value)||value<=0)throw new Error('Conteúdo inválido.');
 return value;
}
function validReason(reason:string):string{
 const note=reason.trim();
 if(!note||note.length>1000)throw new Error('Descreve o motivo da denúncia (até 1000 caracteres).');
 return note;
}
/** Report a feed post to Jynlo moderation. Never retried automatically. */
export async function reportPost(postId:number,reason:string,token:string):Promise<void>{
 requireSession(token);
 await request<void>(`/api/feed/posts/${validId(postId)}/report`,{token,method:'POST',body:{reason:validReason(reason)}});
}
/** Report a comment on a feed post. Never retried automatically. */
export async function reportComment(postId:number,commentId:number,reason:string,token:string):Promise<void>{
 requireSession(token);
 await request<void>(`/api/feed/posts/${validId(postId)}/comments/${validId(commentId)}/report`,{token,method:'POST',body:{reason:validReason(reason)}});
}
