/** Jynlo Web contracts. The demo is isolated and never calls production. */
import {API_BASE,DEMO_MODE,ApiError,request} from './api';
import {feed as demoFeedSeed} from './parity-api';
import type {FeedItem,SocialStory,SocialComment,MobileMedia,FeedUserSuggestion} from './types';
import {validateMedia,mediaUrl} from './social-feed-core.cjs';

let nextDemoPostId=950001,nextDemoStoryId=960001,nextDemoCommentId=970001;
const demoPosts:FeedItem[]=[];
const demoStories:SocialStory[]=[];
const demoComments=new Map<number,SocialComment[]>();
const demoLikes=new Map<number,Set<string>>();
const demoStoryLikes=new Map<number,Set<string>>();
const nowIso=()=>new Date().toISOString();
const tomorrow=()=>new Date(Date.now()+24*60*60*1000).toISOString();
const requireViewer=(token:string|null,username:string|null)=>{
  if(!token||!username)throw new Error('Inicia sessão para participar na comunidade.');
};
export function resolveJynloMedia(path:string|null|undefined){return mediaUrl(API_BASE,path);}
export async function socialFeed(token:string|null,username:string|null):Promise<FeedItem[]>{
  if(!DEMO_MODE)return demoFeedSeed(token,username);
  const defaults=await demoFeedSeed(token,username);
  return [...demoPosts,...defaults].map(p=>{
    const selected=demoLikes.get(p.postId||-1);
    return {...p,likedByMe:!!(username&&selected?.has(username)),
      likeCount:p.likeCount+(selected?.size||0),commentCount:p.commentCount+(demoComments.get(p.postId||-1)?.length||0)};
  });
}
export async function profilePosts(username:string,token:string|null,page=0):Promise<FeedItem[]>{
 if(!Number.isSafeInteger(page)||page<0||page>1000)throw Error('Página inválida.');
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(username))throw Error('Perfil inválido.');
 if(!token)throw Error('Inicia sessão para consultar as publicações.');
 if(DEMO_MODE)return demoPosts.filter(item=>item.authorUsername.toLowerCase()===username.toLowerCase()).slice(page*20,(page+1)*20);
 return request<FeedItem[]>('/api/feed/users/'+encodeURIComponent(username)+'/posts?page='+page,{token});
}

export async function socialPostById(postId:number,token:string|null):Promise<FeedItem>{
 if(!Number.isSafeInteger(postId)||postId<=0)throw new Error('Publicação inválida.');
 if(!token)throw new Error('Inicia sessão para consultar a publicação.');
 if(DEMO_MODE)throw new Error('A consulta de publicações exige a API real.');
 return request<FeedItem>(`/api/feed/posts/${postId}`,{token});
}
export async function storyFeed(token:string|null):Promise<SocialStory[]>{
  if(DEMO_MODE)return demoStories.map(story=>({...story,likeCount:demoStoryLikes.get(story.id)?.size||0,likedByMe:false}));
  return request<SocialStory[]>('/api/stories',{token});
}
export async function myStories(token:string|null,username:string|null):Promise<SocialStory[]>{
  requireViewer(token,username);
  if(DEMO_MODE)return demoStories.filter(x=>x.authorUsername===username).map(story=>({...story,likeCount:demoStoryLikes.get(story.id)?.size||0,likedByMe:demoStoryLikes.get(story.id)?.has(username!)||false}));
  return request<SocialStory[]>('/api/stories/mine',{token});
}
export async function deleteStory(storyId:number,token:string|null):Promise<void>{
 if(!Number.isSafeInteger(storyId)||storyId<=0||!token)throw Error('Story inválida.');
 if(DEMO_MODE){
  const index=demoStories.findIndex(item=>item.id===storyId);
  if(index<0)throw Error('Story indisponível.');
  demoStories.splice(index,1);
  return;
 }
 await request<void>(`/api/stories/${storyId}`,{token,method:'DELETE'});
}

export async function deletePost(postId:number,token:string|null):Promise<void>{
 if(!Number.isSafeInteger(postId)||postId<=0||!token)throw Error('Publicação inválida.');
 if(DEMO_MODE){
  const index=demoPosts.findIndex(item=>item.postId===postId);
  if(index<0)throw Error('Publicação indisponível.');
  demoPosts.splice(index,1);
  return;
 }
 await request<void>(`/api/feed/posts/${postId}`,{token,method:'DELETE'});
}

export async function storyById(storyId:number,token:string|null):Promise<SocialStory>{
 if(!Number.isSafeInteger(storyId)||storyId<=0||!token)throw Error('Story indisponível.');
 if(DEMO_MODE){
  const story=demoStories.find(item=>item.id===storyId);
  if(!story)throw Error('Story indisponível.');
  return story;
 }
 return request<SocialStory>(`/api/stories/${storyId}`,{token});
}

export async function toggleStoryLike(storyId:number,liked:boolean,token:string|null,username:string|null):Promise<SocialStory>{
 requireViewer(token,username);
 if(!Number.isSafeInteger(storyId)||storyId<=0)throw Error('Story inválida.');
 if(DEMO_MODE){
  const story=demoStories.find(s=>s.id===storyId);if(!story)throw Error('Story indisponível.');
  const likes=demoStoryLikes.get(storyId)||new Set<string>();
  if(liked)likes.delete(username!);else likes.add(username!);
  demoStoryLikes.set(storyId,likes);
  return {...story,likedByMe:likes.has(username!),likeCount:likes.size};
 }
 return request<SocialStory>(`/api/stories/${storyId}/likes`,{token,method:liked?'DELETE':'POST'});
}
export type PrivateStoryReply={id:number;storyId:number;senderUsername:string;content:string;createdAt:string};

/** Returns only private replies addressed to the authenticated account. */
export async function myStoryReplies(token:string|null,page=0):Promise<PrivateStoryReply[]>{
 if(!token)throw Error('Inicia sessão para consultar as respostas.');
 if(!Number.isSafeInteger(page)||page<0||page>1000)throw Error('Página inválida.');
 if(DEMO_MODE)return [];
 return request<PrivateStoryReply[]>('/api/stories/me/replies?page='+page,{token});
}

export async function replyToStory(storyId:number,content:string,token:string|null,username:string|null):Promise<void>{
 requireViewer(token,username);
 if(!Number.isSafeInteger(storyId)||storyId<=0)throw Error('Story inválida.');
 const message=content.trim();
 if(!message||message.length>500)throw Error('Escreve uma resposta até 500 caracteres.');
 if(DEMO_MODE)return;
 await request<void>(`/api/stories/${storyId}/replies`,{token,method:'POST',body:{content:message}});
}
export async function likePost(postId:number,liked:boolean,token:string|null,username:string|null):Promise<void>{
  requireViewer(token,username);
  if(!Number.isSafeInteger(postId)||postId<=0)throw new Error('Publicação inválida.');
  if(DEMO_MODE){const selected=demoLikes.get(postId)||new Set<string>();if(liked)selected.delete(username!);else selected.add(username!);demoLikes.set(postId,selected);return;}
  await request<unknown>(`/api/feed/posts/${postId}/likes`,{token,method:liked?'DELETE':'POST',...(!liked?{body:null}:{})});
}
export async function setPostLikerPrivacy(postId:number,hidden:boolean,token:string|null):Promise<boolean>{
 if(!Number.isSafeInteger(postId)||postId<=0)throw new Error('Publicação inválida.');
 if(!token||DEMO_MODE)throw new Error('Inicia sessão para gerir a privacidade dos gostos.');
 return request<boolean>(`/api/feed/posts/${postId}/likers/privacy`,{
  token,method:'PUT',body:{hidden}
 });
}
export async function postComments(postId:number,token:string|null):Promise<SocialComment[]>{
  if(DEMO_MODE)return [...(demoComments.get(postId)||[])];
  return request<SocialComment[]>(`/api/feed/posts/${postId}/comments`,{token});
}
export async function addPostComment(postId:number,content:string,token:string|null,username:string|null):Promise<SocialComment>{
  requireViewer(token,username);
  const message=content.trim();if(!message||message.length>2000)throw new Error('Escreve um comentário válido.');
  if(DEMO_MODE){const item:SocialComment={id:nextDemoCommentId++,postId,authorUsername:username!,authorDisplayName:username!,authorProfilePicUrl:null,content:message,createdAt:nowIso()};
    demoComments.set(postId,[...(demoComments.get(postId)||[]),item]);return item;}
  return request<SocialComment>(`/api/feed/posts/${postId}/comments`,{token,method:'POST',body:{content:message}});
}
export async function createTextPost(content:string,token:string|null,username:string|null):Promise<FeedItem>{
  requireViewer(token,username);const body=content.trim();if(!body||body.length>1000)throw new Error('Escreve uma publicação até 1000 caracteres.');
  if(DEMO_MODE){const item:FeedItem={type:'POST',postId:nextDemoPostId++,authorUsername:username!,authorDisplayName:username!,authorProfilePicUrl:null,content:body,imageUrl:null,videoUrl:null,createdAt:nowIso(),sessionId:null,sport:null,city:null,gameDate:null,likeCount:0,likedByMe:false,commentCount:0};demoPosts.unshift(item);return item;}
  return request<FeedItem>('/api/feed/posts',{method:'POST',token,body:{content:body}});
}
async function sendMedia(path:string,fields:Record<string,string>,file:MobileMedia,token:string):Promise<any>{
  const fault=validateMedia(file.mimeType,file.fileSize,path.includes('/stories'));
  if(fault)throw new Error(fault);
  if(DEMO_MODE)throw new Error('A função de envio só está disponível na demonstração local específica.');
  const form=new FormData();
  for(const [key,val] of Object.entries(fields))form.append(key,val);
  form.append(file.type==='video'?'video':path.includes('/stories')?'image':'image',{
    uri:file.uri,type:file.mimeType,name:file.fileName
  } as any);
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),90000);
  try{
    const response=await fetch(`${API_BASE}${path}`,{method:'POST',signal:controller.signal,
      // Match the JSON API client: authentication is bearer-only, never browser cookies.
      credentials:'omit',
      headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},body:form});
    if(!response.ok)throw new ApiError(response.status,response.status===413?'O ficheiro é demasiado grande.':'Não foi possível enviar o ficheiro.');
    return await response.json();
  }catch(e){if(e instanceof ApiError)throw e;throw new Error('Não foi possível enviar o ficheiro. Confirma a ligação antes de tentares novamente.');}
  finally{clearTimeout(timeout);}
}
export async function publishPost(content:string,file:MobileMedia|null,token:string|null,username:string|null):Promise<FeedItem>{
  requireViewer(token,username);
  if(!file)return createTextPost(content,token,username);
  if(DEMO_MODE){const item=await createTextPost(content.trim()||'Partilhei um momento desportivo.',token,username);if(file.type==='image')item.imageUrl=file.uri;else item.videoUrl=file.uri;return item;}
  return sendMedia('/api/feed/posts',{content:content.trim()||'Partilhei um momento desportivo.'},file,token!);
}
export async function publishStory(caption:string,file:MobileMedia,token:string|null,username:string|null,communityId?:number|null):Promise<SocialStory>{
  requireViewer(token,username);const error=validateMedia(file.mimeType,file.fileSize,true);if(error)throw new Error(error);
  if(caption.length>180)throw new Error('A legenda do Story pode ter até 180 caracteres.');
  if(DEMO_MODE){const item:SocialStory={id:nextDemoStoryId++,authorUsername:username!,displayName:username!,avatarUrl:null,communityId:communityId||null,communityName:null,communityPhotoUrl:null,
    caption:caption.trim(),mediaUrl:file.uri,video:file.type==='video',createdAt:nowIso(),expiresAt:tomorrow(),canDelete:true};demoStories.unshift(item);return item;}
  return sendMedia('/api/stories',{caption:caption.trim(),...(communityId?{communityId:String(communityId)}:{})},file,token!);
}
export async function discoverPeople(token:string|null):Promise<FeedUserSuggestion[]>{
  if(DEMO_MODE)return [{username:'rita_demo',displayName:'Rita',photoUrl:null,sport:'Voleibol',city:'Odivelas'},
    {username:'jogador_demo',displayName:'Daniel',photoUrl:null,sport:'Futebol',city:'Lisboa'}];
  if(!token)return [];
  const raw=await request<Array<Record<string,any>>>('/api/profile/discover',{token});
  return raw.slice(0,12).map(p=>({username:String(p.username||''),displayName:String(p.nickname||p.fullName||p.username||''),photoUrl:p.profilePicUrl||p.photoUrl||null,
    sport:p.sport||null,city:p.location||p.city||null})).filter(p=>p.username);
}
