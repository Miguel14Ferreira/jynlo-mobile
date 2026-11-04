export function formatSeconds(value:unknown):string;
export function formatMetres(value:unknown):string;
export function formatPoints(value:unknown):string;
export function formatChessPoints(halfPointUnits:unknown):string;
export function displayPerson(...values:unknown[]):string;
export function validatedRank(rank:unknown):string;
export function sourceRounds<T extends {id:number}>(data:T[]|null|undefined):T[];
export function stageLabel(stage:string|null|undefined):string;
