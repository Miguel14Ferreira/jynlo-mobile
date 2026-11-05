import type {JynloTournament} from './types';
export type CommunitySportInput={sport?:string|null;sports?:string[]|null};
export interface CommunityTournamentWithKind extends JynloTournament {kind:string}
export interface CommunitySportCompetitionSection {
 sport:string;selected:boolean;tournaments:CommunityTournamentWithKind[];
}
export function communityAllowsTournamentSport(community:CommunitySportInput,sport:string):boolean;
export function canCreateTournamentForSport(community:CommunitySportInput,sport:string):boolean;
export function groupCommunityTournaments(community:CommunitySportInput,tournaments:JynloTournament[]):CommunitySportCompetitionSection[];
