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
