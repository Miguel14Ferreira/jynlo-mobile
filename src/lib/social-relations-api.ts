import {DEMO_MODE,request} from './api';
export type SocialPerson={username:string;fullName:string|null;nickname:string|null;profilePicUrl:string|null};
export type PeopleListKind='followers'|'following';
const usernamePath=(username:string)=>{
 const cleaned=username.trim();
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(cleaned))throw new Error('Utilizador inválido.');
 return encodeURIComponent(cleaned);
};
export async function followingPeople(username:string,kind:PeopleListKind,token:string|null):Promise<SocialPerson[]>{
 if(kind!=='followers'&&kind!=='following')throw new Error('Lista social inválida.');
 const user=usernamePath(username);
 if(DEMO_MODE)return [];
 return request<SocialPerson[]>(`/api/follows/${user}/${kind}`,{token});
}
export async function postLikers(postId:number,token:string|null):Promise<SocialPerson[]>{
 if(!Number.isSafeInteger(postId)||postId<=0)throw new Error('Publicação inválida.');
 if(DEMO_MODE)return [];
 return request<SocialPerson[]>(`/api/feed/posts/${postId}/likers`,{token});
}
