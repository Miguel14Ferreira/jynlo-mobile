export declare function sportFamily(sport:string|null|undefined):'team'|'racket'|'race'|'other';
export declare function teamPoints(input:{win:string;draw:string;loss:string}):{winPoints:number;drawPoints:number;lossPoints:number};
export declare function racketRule(input:{win:string;loss:string;tieBreak:string}):{winPoints:number;lossPoints:number;tieBreak:'SETS_FIRST'|'SCORE_FIRST'};
export declare function racePoints(text:string):string;
