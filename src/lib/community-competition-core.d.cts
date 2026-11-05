import type {JynloTournament} from './types';
import type {CompetitionKind} from './competition-core.cjs';
export type CommunitySportInput={sport?:string|null;sports?:string[]|null};
export interface CommunityTournamentWithKind extends JynloTournament {kind:CompetitionKind}
export interface CommunitySportCompetitionSection {
 sport:string;selected:boolean;tournaments:CommunityTournamentWithKind[];
}
export function communityAllowsTournamentSport(community:CommunitySportInput|null|undefined,sport:string):boolean;
export function canCreateTournamentForSport(community:CommunitySportInput|null|undefined,sport:string):boolean;
export function groupCommunityTournaments(community:CommunitySportInput|null|undefined,tournaments:JynloTournament[]):CommunitySportCompetitionSection[];
