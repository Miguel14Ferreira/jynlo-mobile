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

export type PublicProfileAffiliations={
 teams:Array<{id:number;name:string;sport:string|null}>;
 communities:Array<{id:number;name:string;sport:string|null}>;
};
export async function publicProfileAffiliations(username:string,token:string|null):Promise<PublicProfileAffiliations>{
 const user=usernamePath(username);
 if(!token||DEMO_MODE)throw new Error('É necessário iniciar sessão para consultar as filiações públicas.');
 return request<PublicProfileAffiliations>(`/api/profile/${user}/public-affiliations`,{token});
}

/** Public, server-calculated sports activity; not editable trophy claims. */
export type PublicSportsActivity={
 activitiesCompleted:number;peoplePlayedWith:number;sportsPractised:number;
 eventsCreated:number;participantsMobilized:number;communitiesJoined:number;
 achievements:string[];
};
export async function publicSportsActivity(username:string,token:string|null):Promise<PublicSportsActivity>{
 const user=usernamePath(username);
 if(!token||DEMO_MODE)throw new Error('É necessário iniciar sessão.');
 return request<PublicSportsActivity>(`/api/profiles/${user}/activity`,{token});
}

export type PublicIndividualTitle={
 tournamentId:number;tournamentName:string;
 communityId:number;communityName:string;
 sport:string|null;completedAt:string;
};
export async function publicIndividualTitles(username:string,token:string|null):Promise<PublicIndividualTitle[]>{
 const user=usernamePath(username);
 if(!token||DEMO_MODE)throw new Error('É necessário iniciar sessão.');
 return request<PublicIndividualTitle[]>(`/api/profile/${user}/individual-titles`,{token});
}

export type FollowStatus={followedByMe:boolean;followsMe:boolean;followers:number;following:number;requestPending?:boolean;privateProfile?:boolean};
export type PublicSportsProfile=SocialPerson&{
 bio?:string|null;location?:string|null;country?:string|null;
 favoriteSports?:string|null;skillLevel?:string|null;joinDateDisplay?:string|null;
};
export async function publicSportsProfile(username:string,token:string|null):Promise<PublicSportsProfile>{
 const user=usernamePath(username);
 if(DEMO_MODE)throw new Error('O perfil público requer a API real.');
 return request<PublicSportsProfile>(`/api/profile/${user}`,{token});
}
export async function followStatus(username:string,token:string|null):Promise<FollowStatus>{
 const user=usernamePath(username);
 if(!token||DEMO_MODE)throw new Error('Inicia sessão para consultar as relações sociais.');
 return request<FollowStatus>(`/api/follows/${user}/status`,{token});
}
export async function changeFollow(username:string,follow:boolean,token:string|null):Promise<FollowStatus>{
 const user=usernamePath(username);
 if(!token||DEMO_MODE)throw new Error('Inicia sessão para seguir pessoas.');
 return request<FollowStatus>(`/api/follows/${user}`,{token,method:follow?'POST':'DELETE'});
}

export type StoryFriend={username:string;fullName:string|null;nickname:string|null;profilePicUrl:string|null;chatBlocked:boolean;blockedByMe:boolean};
/** The backend's authenticated list is limited to established friendships. */
export async function storyMentionFriends(token:string|null):Promise<StoryFriend[]>{
 if(!token||DEMO_MODE)return [];
 const result=await request<StoryFriend[]>('/api/friends/me',{token});
 if(!Array.isArray(result))throw Error('Não foi possível carregar a lista de amigos.');
 return result.filter(person=>person&&typeof person.username==='string'&&
  /^[a-zA-Z0-9_.-]{2,45}$/.test(person.username)&&!person.chatBlocked&&!person.blockedByMe);
}

/** Stories can mention discoverable profiles, not only existing friendships.
 * The backend verifies profile identity and block rules on publication. */
export async function searchStoryMentionProfiles(query:string,token:string|null):Promise<StoryFriend[]>{
 const term=query.trim().replace(/^@/,'').slice(0,60);
 if(!token||term.length<3||DEMO_MODE)return [];
 const response=await request<Array<{username:string;fullName?:string|null;nickname?:string|null;
   profilePicUrl?:string|null}>>('/api/profile/name/'+encodeURIComponent(term),{token});
 if(!Array.isArray(response))return [];
 const seen=new Set<string>();
 return response.filter(profile=>{
   if(!profile||typeof profile.username!=='string'||!/^[a-zA-Z0-9_.-]{2,45}$/.test(profile.username))return false;
   const name=profile.username.toLowerCase();
   if(seen.has(name))return false;
   seen.add(name);
   return true;
 }).slice(0,12).map(profile=>({
   username:profile.username,fullName:profile.fullName||null,nickname:profile.nickname||null,
   profilePicUrl:profile.profilePicUrl||null,chatBlocked:false,blockedByMe:false
 }));
}
