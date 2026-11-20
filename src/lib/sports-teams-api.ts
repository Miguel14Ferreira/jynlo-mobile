import {API_BASE,DEMO_MODE,request} from './api';
import type {ImagePickerAsset} from 'expo-image-picker';

/** Independent team; tournament teams remain competition-specific. */
export type TeamKitPattern='PLAIN'|'STRIPES'|'DIAGONAL'|'HOOPS'|'HALVES'|'CHEVRON';
export type TeamKitKind='PRIMARY'|'ALTERNATE'|'TRAINING';
export type TeamKitGarment='jersey'|'singlet'|'vest'|'polo'|'cycling'|'rashguard';
export type TeamKitVariant={
 type:'ALTERNATE'|'TRAINING';
 primary:string;secondary:string;pattern:TeamKitPattern;garment:TeamKitGarment;
 accent:string;playerName:string;playerNumber:string;
};
export type TeamKitDesign=Omit<TeamKitVariant,'type'>;
export type TeamCrestLayer={
 id:string;kind:'text'|'symbol';text:string;symbol:string;
 x:number;y:number;size:number;rotation:number;color:string;opacity:number;
};
export type TeamCrestDesign={
 version:1|2;shape:string;symbol:string;pattern:string;
 primary:string;secondary:string;textColor:string;borderColor:string;
 patternOpacity:number;borderWidth:number;symbolSize:number;symbolY:number;
 showInitials:boolean;innerBorder:boolean;initialsSize:number;initialsY:number;
 customInitials:string;caption:string;layers?:TeamCrestLayer[];
};
export interface SportsTeam {
  id: number;
  slug: string;
  name: string;
  sport: string | null;
  location: string | null;
  description: string | null;
  ownerProfileId: number;
  feedEnabled: boolean;
  chatEnabled: boolean;
  logoUrl?: string | null;
  kitPrimary?: string | null;
  kitSecondary?: string | null;
  kitPattern?: TeamKitPattern | null;
  kitGarment?: TeamKitGarment | null;
  kitAccent?: string | null;
  kitPlayerName?: string | null;
  kitPlayerNumber?: string | null;
  kitVariants?: TeamKitVariant[] | null;
  crestDesign?: string | null;
}
export interface TeamChampionshipHonour {
  championshipId:number;
  championshipName:string;
  seasonLabel:string;
  communityId:number;
  communityName:string;
  tournamentId:number|null;
  ownedEventId:number|null;
  competitionName:string;
  format:string;
  sport:string;
  awardedAt:string;
}
export async function sportsTeamChampionshipHonours(id:number,token?:string):Promise<TeamChampionshipHonour[]>{
  if(DEMO_MODE)return [];
  return request<TeamChampionshipHonour[]>('/api/teams/'+validId(id)+'/honours',{token});
}

export interface TeamCompetitionHistory {
  tournamentId:number;
  tournamentName:string;
  communityId:number;
  communityName:string;
  sport:string|null;
  status:string;
  completedAt:string|null;
  champion:boolean;
  archived:boolean;
}
export async function sportsTeamHistory(id:number,token?:string):Promise<TeamCompetitionHistory[]>{
  if(DEMO_MODE)return [];
  return request<TeamCompetitionHistory[]>('/api/teams/'+validId(id)+'/history',{token});
}

export interface CreateSportsTeam {
  name: string;
  sport?: string | null;
  location?: string | null;
  description?: string | null;
}
const validId = (id: number) => {
  if (!Number.isSafeInteger(id) || id <= 0) throw Error('Equipa inválida.');
  return id;
};
export async function discoverSportsTeams(query: string, token?: string): Promise<SportsTeam[]> {
  if (DEMO_MODE) return [];
  return request<SportsTeam[]>('/api/teams?q=' + encodeURIComponent(query.trim()), {token});
}
export async function joinedSportsTeams(token:string):Promise<SportsTeam[]> {
  if(!token||DEMO_MODE)return [];
  return request<SportsTeam[]>('/api/teams/joined',{token});
}
export async function mySportsTeams(token: string): Promise<SportsTeam[]> {
  if (!token || DEMO_MODE) return [];
  return request<SportsTeam[]>('/api/teams/mine', {token});
}
export interface SportsTeamFollowState {count:number;following:boolean}
/** Followers can view public identity/stories, but cannot access the squad chat. */
export async function sportsTeamFollowState(id:number,token:string):Promise<SportsTeamFollowState>{
  if(!token||DEMO_MODE)throw Error('Inicia sessão para consultar os seguidores.');
  return request<SportsTeamFollowState>('/api/teams/'+validId(id)+'/followers',{token});
}
export async function setSportsTeamFollow(id:number,token:string,following:boolean):Promise<SportsTeamFollowState>{
  if(!token||DEMO_MODE)throw Error('Inicia sessão para seguir a equipa.');
  return request<SportsTeamFollowState>('/api/teams/'+validId(id)+'/followers/me',{
    token,method:following?'PUT':'DELETE',...(following?{body:{}}:{})
  });
}
export async function sportsTeamDetail(id: number, token?: string): Promise<SportsTeam> {
  return request<SportsTeam>('/api/teams/' + validId(id), {token});
}
export async function createSportsTeam(input: CreateSportsTeam, token: string): Promise<SportsTeam> {
  if (!token || DEMO_MODE) throw Error('Inicia sessão para criar uma equipa.');
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 100) throw Error('O nome da equipa deve ter até 100 caracteres.');
  return request<SportsTeam>('/api/teams', {token, method: 'POST', body: {...input, name}});
}
export async function setSportsTeamFeatures(
  id: number,
  features: {feedEnabled?: boolean; chatEnabled?: boolean},
  token: string
): Promise<SportsTeam> {
  if (!token || DEMO_MODE) throw Error('Inicia sessão para configurar a equipa.');
  return request<SportsTeam>('/api/teams/' + validId(id) + '/features', {
    token, method: 'PATCH', body: features
  });
}

const HEX_COLOR=/^#[0-9a-fA-F]{6}$/;
export function safeTeamKitColor(input:string|null|undefined,fallback:string):string {
 return input&&HEX_COLOR.test(input)?input:fallback;
}
export function teamPlayerAvatarUri(input:string|null|undefined):string|null {
 if(!input)return null;
 if(/^https:\/\/[^\s]+$/i.test(input))return input;
 if(/^\/media\/[A-Za-z0-9_\/.-]+$/i.test(input)&&!input.includes('..'))
  return API_BASE+input;
 return null;
}
export function teamLogoUri(input:string|null|undefined):string|null {
 if(!input)return null;
 if(/^https:\/\/[^\s]+$/i.test(input))return input;
 if(/^\/media\/teams\/[1-9]\d*\/[A-Za-z0-9_-]+\.(?:png|jpg|jpeg|webp|gif)$/i.test(input))
  return API_BASE+input;
 return null;
}
export async function setSportsTeamKit(
 id:number,primary:string,secondary:string,token:string,pattern:TeamKitPattern='PLAIN',
 options?:{garment:TeamKitGarment;accent:string;playerName:string;playerNumber:string;variants:TeamKitVariant[]}
):Promise<SportsTeam>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para personalizar a equipa.');
 if(!HEX_COLOR.test(primary)||!HEX_COLOR.test(secondary))
  throw Error('Escolhe duas cores válidas.');
 if(options){
  const accepted=['jersey','singlet','vest','polo','cycling','rashguard'];
  const valid=(v:TeamKitDesign)=>HEX_COLOR.test(v.primary)&&HEX_COLOR.test(v.secondary)
   &&HEX_COLOR.test(v.accent)&&accepted.includes(v.garment)
   &&['PLAIN','STRIPES','DIAGONAL','HOOPS','HALVES','CHEVRON'].includes(v.pattern)
   &&v.playerName.length<=14&&/^[\p{L}0-9 .'-]*$/u.test(v.playerName)
   &&(v.playerNumber===''||/^[0-9]{1,2}$/.test(v.playerNumber));
  const types=new Set(options.variants.map(v=>v.type));
  if(!valid({primary,secondary,pattern,garment:options.garment,accent:options.accent,
    playerName:options.playerName,playerNumber:options.playerNumber})||
    options.variants.length>2||types.size!==options.variants.length||
    options.variants.some(v=>!['ALTERNATE','TRAINING'].includes(v.type)||!valid(v)))
   throw Error('Revê as cores, os equipamentos e os nomes/números antes de guardar.');
 }
 return request<SportsTeam>('/api/teams/'+validId(id)+'/kit',{
  token,method:'PUT',body:{primary,secondary,pattern,...(options||{})}
 });
}
/** Uses the shared validated image storage. A timeout is uncertain: never auto-retry. */
export type GeneratedTeamCrestImage={uri:string;type:'image';mimeType:'image/png';fileSize?:number};
export async function uploadSportsTeamLogo(
 id:number,asset:ImagePickerAsset|GeneratedTeamCrestImage,token:string,crestDesign?:string
):Promise<SportsTeam>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para alterar o logótipo.');
 validId(id);
 if(!asset.uri||asset.type!=='image')throw Error('Seleciona uma imagem válida.');
 if(asset.fileSize!=null&&(asset.fileSize<1||asset.fileSize>5*1024*1024))
  throw Error('O logótipo deve ter até 5 MB.');
 const mime=asset.mimeType||'image/jpeg';
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(mime))
  throw Error('Seleciona uma imagem JPG, PNG, WebP ou GIF.');
 const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':mime==='image/gif'?'gif':'jpg';
 const form=new FormData();
 form.append('logo',{uri:asset.uri,name:'jynlo-team.'+ext,type:mime} as unknown as Blob);
 if(crestDesign){
  if(crestDesign.length>8192)throw Error('O desenho do emblema ultrapassa o limite.');
  form.append('crestDesign',crestDesign);
 }
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(API_BASE+'/api/teams/'+id+'/logo',{
   method:'PUT',credentials:'omit',redirect:'error',cache:'no-store',
   headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   body:form,signal:controller.signal
  });
  if(!response.ok){
   if(response.status===401)throw Error('Sessão expirada.');
   if(response.status===403)throw Error('Só o responsável pode alterar o logótipo.');
   if(response.status===413)throw Error('O ficheiro ultrapassa o limite permitido.');
   throw Error('O servidor não aceitou o logótipo.');
  }
  const updated=await response.json() as SportsTeam;
  if(updated.id!==id||!teamLogoUri(updated.logoUrl))
   throw Error('O servidor não confirmou o logótipo. Consulta a equipa antes de repetir.');
  return updated;
 }catch(error){
  if(controller.signal.aborted)
   throw Error('A ligação expirou. Confirma o logótipo antes de repetir.');
  if(error instanceof Error&&/^(Sessão expirada|Só o responsável|O ficheiro|O servidor|O servidor não confirmou)/.test(error.message))
   throw error;
  throw Error('Não foi possível confirmar o envio. Consulta o logótipo antes de repetir.');
 }finally{clearTimeout(timer);}
}
export async function removeSportsTeamLogo(id:number,token:string):Promise<SportsTeam>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para gerir o logótipo.');
 return request<SportsTeam>('/api/teams/'+validId(id)+'/logo',{token,method:'DELETE'});
}

export interface SportsTeamMember {
  profileId: number;
  username: string;
  role: 'OWNER' | 'PLAYER';
  profilePicUrl?: string | null;
  fullName?: string | null;
  bio?: string | null;
}
export interface SportsTeamInvitation {
  teamId: number;
  teamName: string;
  status: 'INVITED';
}
export interface TeamPendingPlayerInvitation { profileId:number; username:string; status:'INVITED'; }
export async function sportsTeamMembers(teamId: number, token?: string): Promise<SportsTeamMember[]> {
  return request<SportsTeamMember[]>('/api/teams/' + validId(teamId) + '/members', {token});
}
export async function pendingSportsTeamPlayers(teamId:number,token:string):Promise<TeamPendingPlayerInvitation[]> {
  if(!token||DEMO_MODE)return [];
  return request<TeamPendingPlayerInvitation[]>('/api/teams/'+validId(teamId)+'/invitations',{token});
}
export async function mySportsTeamInvitations(token: string): Promise<SportsTeamInvitation[]> {
  if (!token || DEMO_MODE) return [];
  return request<SportsTeamInvitation[]>('/api/teams/invitations/mine', {token});
}
export async function inviteSportsTeamMember(teamId: number, profileId: number, token: string): Promise<void> {
  if (!token || DEMO_MODE) throw Error('Inicia sessão para convidar jogadores.');
  return request<void>('/api/teams/' + validId(teamId) + '/invitations', {
    token,method:'POST',body:{profileId:validId(profileId)}
  });
}
export async function respondSportsTeamInvitation(teamId: number, accept: boolean, token: string): Promise<void> {
  if (!token || DEMO_MODE) throw Error('Inicia sessão para responder ao convite.');
  return request<void>('/api/teams/' + validId(teamId) + '/invitations/' +
    (accept ? 'accept' : 'decline'),{token,method:'POST',body:{}});
}
/** Empty, unreferenced teams only; server rejects any retained team history. */
export async function deleteSportsTeam(teamId:number,token:string):Promise<void>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para gerir a equipa.');
 return request<void>('/api/teams/'+validId(teamId),{token,method:'DELETE'});
}

export async function removeSportsTeamMember(teamId: number, profileId: number, token: string): Promise<void> {
  if (!token || DEMO_MODE) throw Error('Inicia sessão para gerir jogadores.');
  return request<void>('/api/teams/' + validId(teamId) + '/members/' + validId(profileId),
    {token,method:'DELETE'});
}

export interface SportsTeamPlayerCandidate {
  profileId: number;
  username: string;
  fullName: string | null;
}
export async function findSportsTeamPlayers(query: string, token: string): Promise<SportsTeamPlayerCandidate[]> {
  const q = query.trim();
  if (!token || DEMO_MODE || q.length < 2 || q.length > 80) return [];
  return request<SportsTeamPlayerCandidate[]>('/api/teams/players/search?q=' + encodeURIComponent(q), {token});
}
