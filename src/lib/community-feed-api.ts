import {DEMO_MODE,request} from './api';

/** Community timeline posts (the "Feed" tab of a community on the web). Members only; the server decides. */
export interface CommunityPost {
 id:number;communityId:number;kind:string;username:string;body:string;createdAt:string;
 imageUrl:string|null;videoUrl:string|null;editedAt:string|null;deletedAt:string|null;
 extraMedia?:Array<{url:string;mimeType:string}>|null;
}

const path=(id:number)=>{if(!Number.isSafeInteger(id)||id<=0)throw Error('Comunidade inválida.');return '/api/communities/'+id+'/posts';};
const need=(token:string|null|undefined)=>{if(!token)throw Error('Inicia sessão para ver o feed da comunidade.');return token;};

export async function communityPosts(id:number,token:string):Promise<CommunityPost[]>{
 if(DEMO_MODE)return [];
 const posts=await request<CommunityPost[]>(path(id),{token:need(token)});
 return Array.isArray(posts)?posts.filter(p=>p&&Number.isSafeInteger(p.id)&&!p.deletedAt):[];
}
export async function publishCommunityTextPost(id:number,body:string,token:string):Promise<CommunityPost>{
 const text=body.trim();
 if(!text||text.length>1000)throw Error('Escreve uma publicação até 1000 caracteres.');
 return request<CommunityPost>(path(id),{token:need(token),method:'POST',body:{body:text}});
}
export async function editCommunityPost(id:number,postId:number,content:string,token:string):Promise<CommunityPost>{
 const text=content.trim();
 if(text.length>1000)throw Error('A publicação não pode exceder 1000 caracteres.');
 return request<CommunityPost>(path(id)+'/'+postId,{token:need(token),method:'PUT',body:{content:text}});
}
export async function deleteCommunityPost(id:number,postId:number,token:string):Promise<void>{
 await request<void>(path(id)+'/'+postId,{token:need(token),method:'DELETE'});
}
