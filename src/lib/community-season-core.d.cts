export type StandingTabRow={profileId:number|null;username:string|null;fullName:string|null;position:number;
 games?:number;wins:number;draws?:number;losses?:number;points?:number;sports?:number;winRate?:number;
 matches?:number;setDifference?:number;championshipPoints?:number|null};
export type StandingTab={key:string;label:string;kind:'overall'|'team'|'racket';rows:StandingTabRow[]};
export declare function standingTabs(overview:unknown):StandingTab[];
export declare function seasonDraft(input:{name?:string;sport?:string|null},sports:string[]):{name:string;sport:string|null};
export declare function defaultSeasonName(sport?:string|null,now?:Date):string;
