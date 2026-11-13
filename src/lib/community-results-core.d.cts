import type {CommunityResultsOverview,CommunityResultRound,CommunityStanding,CommunitySeason,CommunityResultEntry} from './community-results-api';
export declare function communityResults(input:CommunityResultsOverview|null,seasonId?:number|null):{rounds:CommunityResultRound[];standings:CommunityStanding[];seasons:CommunitySeason[];selection:number|null};
export declare function officialRoundScore(round:CommunityResultRound):{a:number;b:number;label:string}|null;
export declare function roundPlayerContributions(round:CommunityResultRound):Array<{name:string;team:string|null;goals:number;assists:number}>;
