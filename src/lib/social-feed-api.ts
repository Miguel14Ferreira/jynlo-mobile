import {fetch as expoFetch} from 'expo/fetch';
/** Jynlo Web contracts. The demo is isolated and never calls production. */
import {API_BASE,DEMO_MODE,ApiError,request} from './api';
import {feed as demoFeedSeed} from './parity-api';
import type {FeedItem,SocialStory,SocialComment,MobileMedia,FeedUserSuggestion,StoryTextGeometry,StoryDetails,StoryTextAppearance} from './types';
import {validateMedia,mediaUrl} from './social-feed-core.cjs';
import {confirmedSocialMediaReceipt} from './social-upload-receipt.cjs';
import {verifiedPostLikeReceipt} from './social-like-receipt.cjs';
import {verifiedCommentReceipt} from './social-comment-receipt.cjs';
import {confirmedTextPostReceipt,confirmedStoryAuthorReceipt,confirmedStoryDetailsReceipt,confirmedStoryDestinationReceipt} from './social-text-post-receipt.cjs';
import {prepareStoryDetails} from './story-details.cjs';
import {requireSocialCollection,safeDiscoveredPeople} from './social-response-guard.cjs';

let nextDemoPostId=950001,nextDemoStoryId=960001,nextDemoCommentId=970001;
const demoPosts:FeedItem[]=[];
const demoStories:SocialStory[]=[];
const demoComments=new Map<number,SocialComment[]>();
const demoLikes=new Map<number,Set<string>>();
const demoStoryLikes=new Map<number,Set<string>>();
const demoStoryReplies:Array<PrivateStoryReply&{recipientUsername:string}>=[];
let nextDemoStoryReplyId=980001;
const nowIso=()=>new Date().toISOString();
const tomorrow=()=>new Date(Date.now()+24*60*60*1000).toISOString();
const requireViewer=(token:string|null,username:string|null)=>{
  if(!token||!username)throw new Error('Inicia sessão para participar na comunidade.');
};
export function resolveJynloMedia(path:string|null|undefined){return mediaUrl(API_BASE,path);}
export async function socialFeed(token:string|null,username:string|null):Promise<FeedItem[]>{
  // Real feed comes directly from the authenticated backend; seed data is demo-only.
  if(!DEMO_MODE){
    if(!token||!username)throw Error('Inicia sessão para veres o teu feed.');
    return requireSocialCollection(await request<unknown>('/api/feed',{token}),'feed');
  }
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
 return requireSocialCollection(await request<unknown>('/api/feed/users/'+encodeURIComponent(username)+'/posts?page='+page,{token}),'feed');
}

/** Opt-in posts linked to a public game. API enforces block/profile/session visibility. */
export async function sessionSocialMemories(sessionId:number,token:string|null):Promise<FeedItem[]>{
 if(!Number.isSafeInteger(sessionId)||sessionId<=0)throw Error('Sessão inválida.');
 if(!token)return [];
 if(DEMO_MODE)return demoPosts.filter(post=>post.sessionId===sessionId);
 const entries=requireSocialCollection(await request<unknown>(
  '/api/feed/sessions/'+sessionId+'/memories',{token}),'feed');
 return entries.filter(item=>item.type==='POST'&&item.sessionId===sessionId);
}
export async function socialPostById(postId:number,token:string|null):Promise<FeedItem>{
 if(!Number.isSafeInteger(postId)||postId<=0)throw new Error('Publicação inválida.');
 if(!token)throw new Error('Inicia sessão para consultar a publicação.');
 if(DEMO_MODE)throw new Error('A consulta de publicações exige a API real.');
 return request<FeedItem>(`/api/feed/posts/${postId}`,{token});
}
export async function storyFeed(token:string|null,username:string|null=null):Promise<SocialStory[]>{
  if(DEMO_MODE)return demoStories.filter(story=>Date.parse(story.expiresAt)>Date.now()).map(story=>({...story,likeCount:demoStoryLikes.get(story.id)?.size||0,likedByMe:Boolean(username&&demoStoryLikes.get(story.id)?.has(username))}));
  return requireSocialCollection(await request<unknown>('/api/stories',{token}),'story');
}
export async function myStories(token:string|null,username:string|null):Promise<SocialStory[]>{
  requireViewer(token,username);
  if(DEMO_MODE)return demoStories.filter(x=>x.authorUsername===username&&Date.parse(x.expiresAt)>Date.now()).map(story=>({...story,likeCount:demoStoryLikes.get(story.id)?.size||0,likedByMe:demoStoryLikes.get(story.id)?.has(username!)||false}));
  return requireSocialCollection(await request<unknown>('/api/stories/mine',{token}),'story');
}
export async function deleteStory(storyId:number,token:string|null):Promise<void>{
 if(!Number.isSafeInteger(storyId)||storyId<=0||!token)throw Error('Story inválida.');
 if(DEMO_MODE){
  const index=demoStories.findIndex(item=>item.id===storyId);
  if(index<0)throw Error('Story indisponível.');
  demoStories.splice(index,1);
  demoStoryLikes.delete(storyId);
  return;
 }
 await request<void>(`/api/stories/${storyId}`,{token,method:'DELETE'});
}

/** Only the attendee may hide their own attendance activity (server-verified). */
export async function hideAttendanceActivity(sessionId:number,token:string|null):Promise<void>{
 if(!Number.isSafeInteger(sessionId)||sessionId<=0||!token)throw Error('Atividade inválida.');
 if(DEMO_MODE)return;
 await request<void>(`/api/feed/attendance/${sessionId}/hide`,{token,method:'PUT'});
}

/** Edit only owned post text/location; attachments remain untouched on the server. */
export async function editPost(postId:number,content:string,location:string,token:string|null,username:string|null):Promise<FeedItem>{
 requireViewer(token,username);
 if(!Number.isSafeInteger(postId)||postId<=0)throw Error('Publicação inválida.');
 const description=content.trim(),place=location.trim();
 if(description.length>1000)throw Error('A descrição pode ter até 1000 caracteres.');
 if(place.length>160)throw Error('A localização pode ter até 160 caracteres.');
 if(DEMO_MODE){
   const post=demoPosts.find(item=>item.postId===postId&&item.authorUsername.toLowerCase()===username!.toLowerCase());
   if(!post)throw Error('Não podes editar esta publicação.');
   if(!description&&!post.imageUrl&&!post.videoUrl&&!post.extraMedia?.length)
     throw Error('Uma publicação sem fotografias ou vídeos precisa de texto.');
   post.content=description;post.location=place||null;
   return {...post};
 }
 const updated=await request<FeedItem>(`/api/feed/posts/${postId}`,{
   token,method:'PUT',body:{content:description,location:place||null}
 });
 if(updated?.postId!==postId||!confirmedTextPostReceipt(updated,username!,description,place))
   throw Error('O servidor não confirmou a edição da publicação. Consulta o perfil antes de repetir.');
 return updated;
}
/** Replace every media asset of an authored post, only after explicit UI confirmation.
 * The backend requires PUT multipart with repeated "files" and replaceMedia=true.
 * Existing likes/comments remain attached to the same post ID.
 */
export async function replacePostMedia(postId:number,files:MobileMedia[],content:string,location:string,
 token:string|null,username:string|null):Promise<FeedItem>{
 requireViewer(token,username);
 if(!Number.isSafeInteger(postId)||postId<=0)throw Error('Publicação inválida.');
 const description=content.trim(),place=location.trim();
 if(description.length>1000||place.length>160)throw Error('Verifica a descrição e localização.');
 const {albumError}=require('./post-album.cjs') as typeof import('./post-album.cjs');
 const validation=albumError(files,true);
 if(validation)throw Error(validation);
 if(DEMO_MODE)throw Error('A substituição de multimédia exige a API real da Jynlo.');
 const confirmed=await sendMedia(`/api/feed/posts/${postId}/media`,
  {content:description,location:place,replaceMedia:'true'},files,token!,'PUT',true) as FeedItem;
 if(confirmed.postId!==postId||!confirmedTextPostReceipt(confirmed,username!,description,place))
  throw Error('O servidor não confirmou a edição. Verifica a publicação antes de repetir.');
 return confirmed;
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

export async function storyById(storyId:number,token:string|null,username:string|null=null):Promise<SocialStory>{
 if(!Number.isSafeInteger(storyId)||storyId<=0||!token)throw Error('Story indisponível.');
 if(DEMO_MODE){
  const story=demoStories.find(item=>item.id===storyId);
  if(!story||Date.parse(story.expiresAt)<=Date.now())throw Error('Story indisponível.');
  return {...story,likeCount:demoStoryLikes.get(storyId)?.size||0,
   likedByMe:Boolean(username&&demoStoryLikes.get(storyId)?.has(username))};
 }
 return request<SocialStory>(`/api/stories/${storyId}`,{token});
}

export type StoryViewerInfo={username:string;displayName:string;avatarUrl:string|null;viewedAt:string};
export type StoryAudience={viewCount:number;viewers:StoryViewerInfo[]};

/** Recording is deliberately explicit: do not count a feed impression as a view. */
export async function recordStoryView(storyId:number,token:string|null):Promise<void>{
 if(!token||!Number.isSafeInteger(storyId)||storyId<=0)throw Error('Story inválida.');
 if(DEMO_MODE)return;
 await request<void>(`/api/stories/${storyId}/views`,{token,method:'POST',body:{}});
}
/** Audience lists are available to the author only. Do not fake zeros on a 404. */
export async function storyAudience(storyId:number,token:string|null):Promise<StoryAudience>{
 if(!token||!Number.isSafeInteger(storyId)||storyId<=0)throw Error('Story inválida.');
 if(DEMO_MODE)throw Error('Visualizações não disponíveis na demonstração.');
 const result=await request<StoryAudience>(`/api/stories/${storyId}/audience`,{token});
 if(!Number.isSafeInteger(result?.viewCount)||result.viewCount<0||!Array.isArray(result.viewers))
  throw Error('Resposta de visualizações inválida.');
 return result;
}

export async function toggleStoryLike(storyId:number,liked:boolean,token:string|null,username:string|null):Promise<SocialStory>{
 requireViewer(token,username);
 if(!Number.isSafeInteger(storyId)||storyId<=0)throw Error('Story inválida.');
 if(DEMO_MODE){
  const story=demoStories.find(s=>s.id===storyId);if(!story||Date.parse(story.expiresAt)<=Date.now())throw Error('Story indisponível.');
  const likes=demoStoryLikes.get(storyId)||new Set<string>();
  if(liked)likes.delete(username!);else likes.add(username!);
  demoStoryLikes.set(storyId,likes);
  return {...story,likedByMe:likes.has(username!),likeCount:likes.size};
 }
 return request<SocialStory>(`/api/stories/${storyId}/likes`,{token,method:liked?'DELETE':'POST'});
}
export type PrivateStoryReply={id:number;storyId:number;senderUsername:string;content:string;createdAt:string};

/** Returns only private replies addressed to the authenticated account. */
export async function myStoryReplies(token:string|null,page=0,username:string|null=null):Promise<PrivateStoryReply[]>{
 if(!token)throw Error('Inicia sessão para consultar as respostas.');
 if(!Number.isSafeInteger(page)||page<0||page>1000)throw Error('Página inválida.');
 if(DEMO_MODE){
  if(!username)throw Error('Inicia sessão para consultar as respostas.');
  return demoStoryReplies.filter(reply=>reply.recipientUsername.toLowerCase()===username.toLowerCase())
    .slice(page*20,(page+1)*20).map(({recipientUsername:_,...reply})=>reply);
 }
 return requireSocialCollection(await request<unknown>('/api/stories/me/replies?page='+page,{token}),'reply');
}

export async function replyToStory(storyId:number,content:string,token:string|null,username:string|null):Promise<void>{
 requireViewer(token,username);
 if(!Number.isSafeInteger(storyId)||storyId<=0)throw Error('Story inválida.');
 const message=content.trim();
 if(!message||message.length>500)throw Error('Escreve uma resposta até 500 caracteres.');
 if(DEMO_MODE){
  const story=demoStories.find(item=>item.id===storyId);
  if(!story||Date.parse(story.expiresAt)<=Date.now())throw Error('Story indisponível.');
  if(story.authorUsername.toLowerCase()===username!.toLowerCase())throw Error('Não podes responder à tua própria Story.');
  demoStoryReplies.unshift({id:nextDemoStoryReplyId++,storyId,senderUsername:username!,
    recipientUsername:story.authorUsername,content:message,createdAt:nowIso()});
  return;
 }
 await request<void>(`/api/stories/${storyId}/replies`,{token,method:'POST',body:{content:message}});
}
export async function likePost(postId:number,liked:boolean,token:string|null,username:string|null):Promise<{likedByMe:boolean;likeCount:number}>{
  requireViewer(token,username);
  if(!Number.isSafeInteger(postId)||postId<=0)throw new Error('Publicação inválida.');
  if(DEMO_MODE){
    const selected=demoLikes.get(postId)||new Set<string>();
    if(liked)selected.delete(username!);else selected.add(username!);
    demoLikes.set(postId,selected);
    return {likedByMe:selected.has(username!),likeCount:selected.size};
  }
  const response=await request<unknown>(`/api/feed/posts/${postId}/likes`,{token,method:liked?'DELETE':'POST',...(!liked?{body:null}:{})});
  const verified=verifiedPostLikeReceipt(response);
  if(!verified||verified.likedByMe===liked)
    throw Error('O servidor não confirmou o estado do gosto. Atualiza a publicação antes de repetir.');
  return verified;
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
  return requireSocialCollection(await request<unknown>(`/api/feed/posts/${postId}/comments`,{token}),'comment');
}
export async function addPostComment(postId:number,content:string,token:string|null,username:string|null):Promise<SocialComment>{
  requireViewer(token,username);
  const message=content.trim();if(!message||message.length>500)throw new Error('Escreve um comentário até 500 caracteres.');
  if(DEMO_MODE){const item:SocialComment={id:nextDemoCommentId++,postId,authorUsername:username!,authorDisplayName:username!,authorProfilePicUrl:null,content:message,createdAt:nowIso()};
    demoComments.set(postId,[...(demoComments.get(postId)||[]),item]);return item;}
  const result=await request<SocialComment>(`/api/feed/posts/${postId}/comments`,{token,method:'POST',body:{content:message}});
  if(!verifiedCommentReceipt(result,{postId,username,content:message}))
   throw Error('O servidor não confirmou o comentário. Verifica antes de repetir.');
  return result;
}
/** Backend verifies comment ownership and responds with the edited object. */
export async function editPostComment(postId:number,commentId:number,content:string,token:string|null,username:string|null):Promise<SocialComment>{
 requireViewer(token,username);
 if(!Number.isSafeInteger(postId)||postId<=0||!Number.isSafeInteger(commentId)||commentId<=0)throw Error('Comentário inválido.');
 const message=content.trim();
 if(!message||message.length>500)throw Error('Escreve um comentário até 500 caracteres.');
 if(DEMO_MODE){
  const existing=demoComments.get(postId)||[];
  const original=existing.find(x=>x.id===commentId&&x.authorUsername.toLowerCase()===username!.toLowerCase());
  if(!original)throw Error('Só podes editar os teus comentários.');
  const updated={...original,content:message,editedAt:nowIso()};
  demoComments.set(postId,existing.map(x=>x.id===commentId?updated:x));
  return updated;
 }
 const result=await request<SocialComment>(`/api/feed/posts/${postId}/comments/${commentId}`,{
  token,method:'PUT',body:{content:message}
 });
 if(!verifiedCommentReceipt(result,{postId,commentId,username,content:message}))
  throw Error('O servidor não confirmou a edição do comentário. Verifica antes de repetir.');
 return result;
}
/** Backend verifies access to the target comment and owns like counts. */
export async function togglePostCommentLike(postId:number,comment:SocialComment,token:string|null,username:string|null):Promise<SocialComment>{
 requireViewer(token,username);
 if(!Number.isSafeInteger(postId)||postId<=0||!Number.isSafeInteger(comment.id)||comment.id<=0)throw Error('Comentário inválido.');
 if(DEMO_MODE){
  const liked=!Boolean(comment.likedByMe);
  const updated={...comment,likedByMe:liked,likeCount:Math.max(0,(comment.likeCount||0)+(liked?1:-1))};
  demoComments.set(postId,(demoComments.get(postId)||[]).map(x=>x.id===comment.id?updated:x));
  return updated;
 }
 const result=await request<SocialComment>(`/api/feed/posts/${postId}/comments/${comment.id}/likes`,{
  token,method:comment.likedByMe?'DELETE':'POST'
 });
 if(!verifiedCommentReceipt(result,{postId,commentId:comment.id,likedByMe:!Boolean(comment.likedByMe)}))
  throw Error('O servidor não confirmou o gosto no comentário. Atualiza antes de repetir.');
 return result;
}
export async function createTextPost(content:string,token:string|null,username:string|null,location='',sessionId?:number):Promise<FeedItem>{
  requireViewer(token,username);
  if(sessionId!==undefined&&(!Number.isSafeInteger(sessionId)||sessionId<=0))throw Error('Sessão inválida.');
  const body=content.trim();if(!body||body.length>1000)throw new Error('Escreve uma publicação até 1000 caracteres.');
  if(DEMO_MODE){const item:FeedItem={type:'POST',postId:nextDemoPostId++,authorUsername:username!,authorDisplayName:username!,authorProfilePicUrl:null,content:body,imageUrl:null,videoUrl:null,createdAt:nowIso(),sessionId:sessionId??null,sport:null,city:null,gameDate:null,likeCount:0,likedByMe:false,commentCount:0,location:location.trim()||null};demoPosts.unshift(item);return item;}
  const result=await request<FeedItem>('/api/feed/posts',{method:'POST',token,body:{content:body,location:location.trim()||null,...(sessionId?{sessionId}:{})}});
  if(!confirmedTextPostReceipt(result,username!,body,location))
    throw Error('O servidor respondeu, mas não confirmou a publicação de texto. Verifica o perfil antes de repetir.');
  return result;
}
async function sendMedia(path:string,fields:Record<string,string>,files:MobileMedia[],token:string,method:'POST'|'PUT'='POST',forceFilesParts=false):Promise<any>{
 if(DEMO_MODE)throw new Error('O envio não está disponível na demonstração.');
 const {albumError}=require('./post-album.cjs') as typeof import('./post-album.cjs');
 const validation=albumError(files,true);
 if(validation)throw new Error(validation);
 const temporary:import('expo-file-system').File[]=[];
 try{
   const {File,Paths}=await import('expo-file-system');
   const form=new FormData();
   for(const [key,val] of Object.entries(fields))form.append(key,val);
   let totalBytes=0;
   for(const file of files){
     let uri=file.uri;
     const extension=file.mimeType==='image/png'?'png':file.mimeType==='image/webp'?'webp':
       file.mimeType==='video/webm'?'webm':file.type==='video'?'mp4':'jpg';
     const source=new File(file.uri);
     if(!uri.startsWith('file://')){
       const copy=new File(Paths.cache,'jynlo-album-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+extension);
       temporary.push(copy);
       source.copy(copy);
       uri=copy.uri;
     }
     // Picker metadata can be stale (especially Android content://). Before a
     // private media upload, verify the actual local file exists and its real size.
     const localFile=new File(uri);
     const actualSize=localFile.exists?localFile.size:-1;
     if(!Number.isSafeInteger(actualSize)||actualSize<=0)
       throw Error('Não foi possível ler o ficheiro selecionado. Escolhe-o novamente na galeria.');
     const fault=validateMedia(file.mimeType,actualSize,path.includes('/stories'));
     if(fault)throw Error(fault);
     totalBytes+=actualSize;
     if(totalBytes>60*1024*1024)throw Error('O álbum não pode exceder 60 MB no total.');
     // Back-end accepts the legacy image/video part for one asset, or repeated
     // "files" parts for albums. Do not mix these two request formats.
     form.append(forceFilesParts||files.length>1?'files':file.type==='video'?'video':'image',new File(uri) as unknown as Blob,'jynlo-media.'+extension);
   }
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),90000);
   try{
     const response=await expoFetch(`${API_BASE}${path}`,{method,signal:controller.signal,
       // Never follow redirects with an authenticated multipart upload.
       // Expo's native fetch supports redirect:'error' but not web-only cache options.
       credentials:'omit',redirect:'error',
       headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},body:form});
     if(!response.ok){
       const detail=response.status===401?'A sessão expirou. Volta a entrar na Jynlo.':
         response.status===403?'Não tens autorização para publicar este conteúdo.':
         response.status===413?'Os ficheiros excedem o tamanho permitido pelo servidor.':
         response.status===415?'O servidor não aceita um dos formatos escolhidos.':
         response.status===429?'Foram feitos demasiados envios. Tenta novamente mais tarde.':
         response.status>=500?'O servidor Jynlo não conseguiu confirmar o envio. Verifica se foi publicado antes de repetir.':
         'O servidor rejeitou um dos ficheiros. Confirma o formato e o tamanho.';
       throw new ApiError(response.status,detail+' (HTTP '+response.status+')');
     }
     const raw=await response.text();
     if(!raw.trim())throw new Error('O servidor respondeu ao envio sem confirmar o conteúdo. Atualiza antes de repetir.');
     let confirmed:{
       id?:unknown;postId?:unknown;imageUrl?:unknown;videoUrl?:unknown;
       mediaUrl?:unknown;extraMedia?:unknown
     };
     try{confirmed=JSON.parse(raw) as typeof confirmed;}
     catch{throw new Error('O servidor respondeu, mas não confirmou a publicação. Atualiza antes de repetir.');}
     if(!confirmedSocialMediaReceipt(confirmed,files.map(file=>file.mimeType),path.includes('/stories')))
       throw new Error('O servidor respondeu, mas não confirmou todos os ficheiros. Consulta o perfil antes de repetir.');
     return confirmed;
   }catch(e){
     if(e instanceof ApiError)throw e;
     if(e instanceof Error&&e.message.startsWith('O servidor respondeu'))throw e;
     if(controller.signal.aborted)throw new Error('O envio excedeu 90 segundos. Verifica se foi publicado antes de repetir.');
     throw new Error('Falha de ligação durante o envio. Verifica se foi publicado antes de repetires.');
   }finally{clearTimeout(timeout);}
 }finally{
   for(const file of temporary){try{if(file.exists)file.delete();}catch{}}
 }
}
export async function publishPost(content:string,files:MobileMedia[]|null,token:string|null,username:string|null,location='',sessionId?:number):Promise<FeedItem>{
  requireViewer(token,username);
  const caption=content.trim();
  const place=location.trim();
  if(sessionId!==undefined&&(!Number.isSafeInteger(sessionId)||sessionId<=0))throw Error('Sessão inválida.');
  if(caption.length>1000)throw new Error('A publicação não pode exceder 1000 caracteres.');
  if(place.length>160)throw new Error('A localização pode ter até 160 caracteres.');
  if(!files?.length)return createTextPost(caption,token,username,place,sessionId);
  // Photo/video-only posts are supported by the server; never invent a caption.
  if(DEMO_MODE){
    let item:FeedItem;
    if(caption)item=await createTextPost(caption,token,username,place,sessionId);
    else{
      item={type:'POST',postId:nextDemoPostId++,authorUsername:username!,authorDisplayName:username!,
        authorProfilePicUrl:null,content:'',imageUrl:null,videoUrl:null,createdAt:nowIso(),sessionId:sessionId??null,
        sport:null,city:null,gameDate:null,likeCount:0,likedByMe:false,commentCount:0,location:place||null};
      demoPosts.unshift(item);
    }
    const [first,...extra]=files;
    if(!first)throw new Error('Não foi selecionado nenhum ficheiro.');
    if(first.type==='image')item.imageUrl=first.uri;else item.videoUrl=first.uri;
    item.extraMedia=extra.map(file=>({url:file.uri,mimeType:file.mimeType}));
    return item;
  }
  const confirmed=await sendMedia('/api/feed/posts',{content:caption,...(place?{location:place}:{}),
    ...(sessionId?{sessionId:String(sessionId)}:{})},files,token!);
  if(!confirmedTextPostReceipt(confirmed,username!,caption,place))
    throw Error('O servidor não confirmou o autor ou conteúdo da publicação. Verifica o perfil antes de repetir.');
  return confirmed;
}
export async function publishStory(caption:string,file:MobileMedia,token:string|null,username:string|null,communityId?:number|null,geometry?:StoryTextGeometry,details?:StoryDetails,appearance?:StoryTextAppearance,showTime=false,altText=''):Promise<SocialStory>{
  requireViewer(token,username);const error=validateMedia(file.mimeType,file.fileSize||1,true);if(error)throw new Error(error);
  if(caption.length>180)throw new Error('A legenda do Story pode ter até 180 caracteres.');
  if(altText.trim().length>350)throw new Error('A descrição acessível da Story pode ter até 350 caracteres.');
  // A selected community must be a real numeric resource, never an invalid
  // negative/NaN ID that silently changes the publishing destination.
  if(communityId!=null&&(!Number.isSafeInteger(communityId)||communityId<=0))
    throw new Error('Comunidade de destino inválida. Escolhe-a novamente.');
  if(geometry&&(![geometry.x,geometry.y,geometry.rotation,geometry.zoom].every(Number.isFinite)||
     geometry.x<0||geometry.x>100||geometry.y<0||geometry.y>100||
     geometry.rotation < -3600||geometry.rotation > 3600||geometry.zoom<.5||geometry.zoom>3))
    throw Error('A posição do texto da Story é inválida.');
  const safeDetails=prepareStoryDetails(details?.locationLabel||'',details?.taggedUsernames||'');
  if(appearance&&(!(['white','black','yellow','mint','pink','blue'] as string[]).includes(appearance.color)||
    !(['dark','light','none'] as string[]).includes(appearance.background)||
    !(['modern','classic','mono'] as string[]).includes(appearance.font)))throw Error('Estilo de texto da Story inválido.');
  if(DEMO_MODE){const item:SocialStory={id:nextDemoStoryId++,authorUsername:username!,displayName:username!,avatarUrl:null,communityId:communityId||null,communityName:null,communityPhotoUrl:null,
    caption:caption.trim(),mediaUrl:file.uri,video:file.type==='video',createdAt:nowIso(),expiresAt:tomorrow(),canDelete:true,
    textX:geometry?.x??null,textY:geometry?.y??null,textRotation:geometry?.rotation??null,textZoom:geometry?.zoom??null,
    locationLabel:safeDetails.locationLabel||null,taggedUsernames:safeDetails.taggedUsernames||null,
    textColor:appearance?.color||'white',textBackground:appearance?.background||'dark',textFont:appearance?.font||'modern',showTime,altText:altText.trim()||null};demoStories.unshift(item);return item;}
  const confirmed=await sendMedia('/api/stories',{caption:caption.trim(),...(communityId?{communityId:String(communityId)}:{}),
    ...(geometry?{textX:String(geometry.x),textY:String(geometry.y),textRotation:String(geometry.rotation),textZoom:String(geometry.zoom)}:{}),
    ...(appearance?{textColor:appearance.color,textBackground:appearance.background,textFont:appearance.font}:{}),
    showTime:String(showTime),
    ...(altText.trim()?{altText:altText.trim()}:{}),
    ...(safeDetails.locationLabel?{locationLabel:safeDetails.locationLabel}:{}),
    ...(safeDetails.taggedUsernames?{taggedUsernames:safeDetails.taggedUsernames}:{})},[file],token!);
  if(!confirmedStoryAuthorReceipt(confirmed,username!,caption)||
     !confirmedStoryDetailsReceipt(confirmed,safeDetails)||
     !confirmedStoryDestinationReceipt(confirmed,communityId??null))
    throw Error('O servidor não confirmou o destino ou conteúdo da Story. Verifica o teu perfil ou comunidade antes de repetir.');
  return confirmed;
}
export async function discoverPeople(token:string|null):Promise<FeedUserSuggestion[]>{
  if(DEMO_MODE)return [{username:'rita_demo',displayName:'Rita',photoUrl:null,sport:'Voleibol',city:'Odivelas'},
    {username:'jogador_demo',displayName:'Daniel',photoUrl:null,sport:'Futebol',city:'Lisboa'}];
  if(!token)return [];
  const raw=await request<unknown>('/api/profile/discover',{token});
  return safeDiscoveredPeople(raw);
}
