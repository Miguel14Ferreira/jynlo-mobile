import {DEMO_MODE, request} from './api';

/** Independent team; tournament teams remain competition-specific. */
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
export async function mySportsTeams(token: string): Promise<SportsTeam[]> {
  if (!token || DEMO_MODE) return [];
  return request<SportsTeam[]>('/api/teams/mine', {token});
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

export interface SportsTeamMember {
  profileId: number;
  username: string;
  role: 'OWNER' | 'PLAYER';
}
export interface SportsTeamInvitation {
  teamId: number;
  teamName: string;
  status: 'INVITED';
}
export async function sportsTeamMembers(teamId: number, token?: string): Promise<SportsTeamMember[]> {
  return request<SportsTeamMember[]>('/api/teams/' + validId(teamId) + '/members', {token});
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
export async function removeSportsTeamMember(teamId: number, profileId: number, token: string): Promise<void> {
  if (!token || DEMO_MODE) throw Error('Inicia sessão para gerir jogadores.');
  return request<void>('/api/teams/' + validId(teamId) + '/members/' + validId(profileId),
    {token,method:'DELETE'});
}
